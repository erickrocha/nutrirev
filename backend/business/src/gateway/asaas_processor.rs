//! Asaas adapter: cards, Pix, and stored-card tokens against one clinic's account.
//!
//! Follows the posture set by `rede_card_processor`: HTTPS only, a bounded
//! timeout, credentials held as `Zeroizing` and never read from a request or the
//! payment tables, and provider response bodies deliberately kept out of returned
//! errors so a PAN or a token cannot reach a log through an error path.
//!
//! Each clinic is its own Asaas account, so an instance of this is bound to one
//! merchant row's credentials and must never be shared across tenants.

use crate::domain::card_submission::{CardProcessorResult, CardSubmission, SensitiveCardData};
use crate::domain::card_token::{CardToken, TokenChargeRequest, TokenHolder};
use crate::domain::pix_payment::{
    amount_in_reais, cents_from_reais, PixChargeRequest, PixChargeResult, PixChargeState, PixStatus,
};
use crate::gateway::card_processor::{CardProcessor, CardProcessorError};
use crate::gateway::card_tokenizer::CardTokenizer;
use crate::gateway::pix_processor::{PixProcessor, PixProcessorError};
use crate::gateway::provider_customer::ProviderCustomerRegistry;
use chrono::{DateTime, NaiveDate, TimeZone, Utc};
use reqwest::{Client, RequestBuilder};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;
use zeroize::Zeroizing;

const SANDBOX_BASE_URL: &str = "https://api-sandbox.asaas.com/v3";
const PRODUCTION_BASE_URL: &str = "https://api.asaas.com/v3";

pub struct AsaasProcessor {
    client: Client,
    base_url: &'static str,
    api_key: Zeroizing<String>,
}

impl AsaasProcessor {
    /// `environment` comes from the merchant row, so an unknown value is a
    /// configuration error rather than a silent fall back to production.
    pub fn new(api_key: String, environment: &str) -> Result<Self, CardProcessorError> {
        if api_key.is_empty() {
            return Err(CardProcessorError::Configuration);
        }
        let base_url = match environment {
            "sandbox" => SANDBOX_BASE_URL,
            "production" => PRODUCTION_BASE_URL,
            _ => return Err(CardProcessorError::Configuration),
        };
        let client = Client::builder()
            .https_only(true)
            .timeout(Duration::from_secs(20))
            .build()
            .map_err(|_| CardProcessorError::Configuration)?;
        Ok(Self {
            client,
            base_url,
            api_key: Zeroizing::new(api_key),
        })
    }

    fn post(&self, path: &str) -> RequestBuilder {
        self.client
            .post(format!("{}{path}", self.base_url))
            .header("access_token", self.api_key.as_str())
    }

    fn get(&self, path: &str) -> RequestBuilder {
        self.client
            .get(format!("{}{path}", self.base_url))
            .header("access_token", self.api_key.as_str())
    }

    async fn payment(&self, body: serde_json::Value) -> Result<AsaasPayment, PaymentFailure> {
        let response = self
            .post("/payments")
            .json(&body)
            .send()
            .await
            .map_err(|_| PaymentFailure::Unknown)?;
        let status = response.status();
        // A 4xx is the provider saying no; anything else leaves us unsure whether
        // the payment was created, which must never be retried blindly.
        let payment: AsaasPayment = response.json().await.map_err(|_| PaymentFailure::Unknown)?;
        if status.is_success() {
            Ok(payment)
        } else if status.is_client_error() {
            Err(PaymentFailure::Rejected(payment))
        } else {
            Err(PaymentFailure::Unknown)
        }
    }

    async fn fetch_payment(&self, id: &str) -> Result<AsaasPayment, PixProcessorError> {
        let response = self
            .get(&format!("/payments/{id}"))
            .send()
            .await
            .map_err(|_| PixProcessorError::Unknown)?;
        if !response.status().is_success() {
            return Err(PixProcessorError::Unknown);
        }
        response
            .json()
            .await
            .map_err(|_| PixProcessorError::Unknown)
    }
}

/// The last four digits of a provider-masked number.
///
/// The provider returns something like `properties****1234`; the column is
/// `varchar(4)`, so storing it whole is a write error, not a cosmetic problem.
fn last_four(masked: &str) -> Option<String> {
    let digits: Vec<char> = masked.chars().filter(char::is_ascii_digit).collect();
    (digits.len() >= 4).then(|| digits[digits.len() - 4..].iter().collect())
}

fn holder_of(submission: &CardSubmission) -> Result<&TokenHolder, CardProcessorError> {
    submission
        .holder
        .as_ref()
        .ok_or(CardProcessorError::Configuration)
}

fn card_json(card: &SensitiveCardData) -> serde_json::Value {
    json!({
        "holderName": card.cardholder_name,
        "number": card.number(),
        "expiryMonth": format!("{:02}", card.expiration_month),
        "expiryYear": card.expiration_year.to_string(),
        "ccv": card.security_code(),
    })
}

fn holder_json(holder: &TokenHolder) -> serde_json::Value {
    json!({
        "name": holder.name,
        "email": holder.email,
        "cpfCnpj": holder.tax_id,
        "postalCode": holder.postal_code,
        "addressNumber": holder.address_number,
        "phone": holder.phone,
    })
}

/// Today, in the provider's date format. Pix and card payments are due now.
fn today() -> String {
    Utc::now().date_naive().to_string()
}

#[async_trait::async_trait]
impl ProviderCustomerRegistry for AsaasProcessor {
    /// Registers the payer, returning the id to store on the customer row and
    /// reuse from then on.
    async fn create_customer(&self, holder: &TokenHolder) -> Result<String, CardProcessorError> {
        let body = json!({
            "name": holder.name,
            "cpfCnpj": holder.tax_id,
            "email": holder.email,
            "mobilePhone": holder.phone,
            "postalCode": holder.postal_code,
            "addressNumber": holder.address_number,
        });
        let response = self
            .post("/customers")
            .json(&body)
            .send()
            .await
            .map_err(|_| CardProcessorError::Unknown)?;
        if !response.status().is_success() {
            return Err(CardProcessorError::Configuration);
        }
        let created: AsaasCustomerResponse = response
            .json()
            .await
            .map_err(|_| CardProcessorError::Unknown)?;
        if created.id.is_empty() {
            return Err(CardProcessorError::Unknown);
        }
        Ok(created.id)
    }
}

#[async_trait::async_trait]
impl CardProcessor for AsaasProcessor {
    async fn authorize(
        &self,
        submission: &CardSubmission,
    ) -> Result<CardProcessorResult, CardProcessorError> {
        let holder = holder_of(submission)?;
        let value =
            amount_in_reais(submission.amount_cents).map_err(|_| CardProcessorError::Configuration)?;
        let body = json!({
            "customer": holder.provider_customer_id,
            "billingType": "CREDIT_CARD",
            "value": value,
            "dueDate": today(),
            "description": format!("Charge {}", submission.reference),
            "externalReference": submission.reference,
            "installmentCount": (submission.installments > 1).then_some(submission.installments),
            "creditCard": card_json(&submission.card),
            "creditCardHolderInfo": holder_json(holder),
            "remoteIp": holder.remote_ip,
        });
        match self.payment(body).await {
            Ok(payment) => Ok(payment.into_card_result()),
            Err(PaymentFailure::Rejected(payment)) => {
                Err(CardProcessorError::Declined(payment.into_card_result()))
            }
            Err(PaymentFailure::Unknown) => Err(CardProcessorError::Unknown),
        }
    }
}

#[async_trait::async_trait]
impl PixProcessor for AsaasProcessor {
    async fn create_charge(
        &self,
        request: &PixChargeRequest,
    ) -> Result<PixChargeResult, PixProcessorError> {
        let value =
            amount_in_reais(request.amount_cents).map_err(|_| PixProcessorError::Configuration)?;
        let body = json!({
            "customer": request.provider_customer_id,
            "billingType": "PIX",
            "value": value,
            "dueDate": today(),
            "description": request.description,
            "externalReference": request.reference,
        });
        let payment = match self.payment(body).await {
            Ok(payment) => payment,
            Err(PaymentFailure::Rejected(payment)) => {
                return Err(PixProcessorError::Rejected(payment.status.unwrap_or_default()))
            }
            Err(PaymentFailure::Unknown) => return Err(PixProcessorError::Unknown),
        };

        // The QR is a second call. A payment that exists without a retrievable QR
        // is not a usable charge, but it is also not a failure we may retry — the
        // charge is already out there — so this surfaces as `Unknown`.
        let response = self
            .get(&format!("/payments/{}/pixQrCode", payment.id))
            .send()
            .await
            .map_err(|_| PixProcessorError::Unknown)?;
        if !response.status().is_success() {
            return Err(PixProcessorError::Unknown);
        }
        let qr: AsaasPixQrCode = response
            .json()
            .await
            .map_err(|_| PixProcessorError::Unknown)?;
        if qr.payload.is_empty() {
            return Err(PixProcessorError::Unknown);
        }
        Ok(PixChargeResult {
            provider_payment_id: payment.id,
            payload: qr.payload,
            encoded_image: qr.encoded_image,
            expires_at: qr.expiration_date.as_deref().and_then(parse_provider_datetime),
        })
    }

    async fn charge_status(
        &self,
        provider_payment_id: &str,
    ) -> Result<PixChargeState, PixProcessorError> {
        let payment = self.fetch_payment(provider_payment_id).await?;
        Ok(PixChargeState {
            status: map_pix_status(payment.status.as_deref().unwrap_or_default()),
            amount_cents: payment.value.and_then(cents_from_reais),
        })
    }
}

#[async_trait::async_trait]
impl CardTokenizer for AsaasProcessor {
    async fn tokenize(
        &self,
        card: &SensitiveCardData,
        holder: &TokenHolder,
    ) -> Result<CardToken, CardProcessorError> {
        let body = json!({
            "customer": holder.provider_customer_id,
            "creditCard": card_json(card),
            "creditCardHolderInfo": holder_json(holder),
            "remoteIp": holder.remote_ip,
        });
        let response = self
            .post("/creditCard/tokenizeCreditCard")
            .json(&body)
            .send()
            .await
            .map_err(|_| CardProcessorError::Unknown)?;
        if !response.status().is_success() {
            return Err(CardProcessorError::Unknown);
        }
        let token: AsaasTokenResponse = response
            .json()
            .await
            .map_err(|_| CardProcessorError::Unknown)?;
        if token.credit_card_token.is_empty() {
            return Err(CardProcessorError::Unknown);
        }
        Ok(CardToken {
            provider_token: token.credit_card_token,
            brand: token.credit_card_brand,
            // The provider returns the masked number; only the last four are
            // worth keeping, and only to show the customer which card this is.
            last4: token.credit_card_number.as_deref().and_then(last_four),
            expiry_month: None,
            expiry_year: None,
        })
    }

    async fn charge_token(
        &self,
        provider_token: &str,
        request: &TokenChargeRequest,
    ) -> Result<CardProcessorResult, CardProcessorError> {
        let value =
            amount_in_reais(request.amount_cents).map_err(|_| CardProcessorError::Configuration)?;
        let body = json!({
            "customer": request.provider_customer_id,
            "billingType": "CREDIT_CARD",
            "value": value,
            "dueDate": today(),
            "description": request.description,
            "externalReference": request.reference,
            "installmentCount": (request.installments > 1).then_some(request.installments),
            "creditCardToken": provider_token,
            "remoteIp": request.consent_ip,
        });
        match self.payment(body).await {
            Ok(payment) => Ok(payment.into_card_result()),
            Err(PaymentFailure::Rejected(payment)) => {
                Err(CardProcessorError::Declined(payment.into_card_result()))
            }
            Err(PaymentFailure::Unknown) => Err(CardProcessorError::Unknown),
        }
    }
}

enum PaymentFailure {
    Rejected(AsaasPayment),
    Unknown,
}

/// Provider payment states, mapped conservatively.
///
/// Anything unrecognised is `Pending`, never `Paid`: a status this code has not
/// been taught about must not be able to settle a charge. The provider adds
/// states over time, and the safe default is to keep waiting.
pub fn map_pix_status(status: &str) -> PixStatus {
    match status {
        "RECEIVED" | "CONFIRMED" | "RECEIVED_IN_CASH" => PixStatus::Paid,
        "OVERDUE" => PixStatus::Expired,
        "REFUNDED" | "REFUND_REQUESTED" | "REFUND_IN_PROGRESS" | "CHARGEBACK_REQUESTED"
        | "CHARGEBACK_DISPUTE" | "AWAITING_CHARGEBACK_REVERSAL" => PixStatus::Refunded,
        _ => PixStatus::Pending,
    }
}

fn parse_provider_datetime(value: &str) -> Option<DateTime<Utc>> {
    // The provider sends a local timestamp without an offset.
    chrono::NaiveDateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S")
        .ok()
        .or_else(|| {
            NaiveDate::parse_from_str(value, "%Y-%m-%d")
                .ok()
                .and_then(|date| date.and_hms_opt(23, 59, 59))
        })
        .and_then(|naive| Utc.from_local_datetime(&naive).single())
}

#[derive(Deserialize)]
struct AsaasCustomerResponse {
    #[serde(default)]
    id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AsaasPixQrCode {
    #[serde(default)]
    payload: String,
    #[serde(default)]
    encoded_image: Option<String>,
    #[serde(default)]
    expiration_date: Option<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AsaasTokenResponse {
    #[serde(default)]
    credit_card_number: Option<String>,
    #[serde(default)]
    credit_card_brand: Option<String>,
    #[serde(default)]
    credit_card_token: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AsaasPayment {
    #[serde(default)]
    id: String,
    #[serde(default)]
    status: Option<String>,
    #[serde(default)]
    value: Option<f64>,
    #[serde(default)]
    credit_card: Option<AsaasPaymentCard>,
    /// Present on a rejection. Never propagated into an error — only the code.
    #[serde(default)]
    errors: Option<Vec<AsaasError>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AsaasPaymentCard {
    #[serde(default)]
    credit_card_number: Option<String>,
    #[serde(default)]
    credit_card_brand: Option<String>,
}

#[derive(Deserialize)]
struct AsaasError {
    #[serde(default)]
    code: String,
    #[serde(default)]
    description: String,
}

impl AsaasPayment {
    fn into_card_result(self) -> CardProcessorResult {
        let status = self.status.unwrap_or_default();
        // The provider captures as part of creating a card payment; there is no
        // authorize-only mode here, so an accepted payment is captured money.
        let settled = matches!(status.as_str(), "RECEIVED" | "CONFIRMED" | "RECEIVED_IN_CASH");
        let (code, message) = match self.errors.and_then(|errors| errors.into_iter().next()) {
            Some(error) => (error.code, error.description),
            None => (status.clone(), status),
        };
        let card = self.credit_card;
        CardProcessorResult {
            provider_transaction_id: self.id,
            return_code: code,
            return_message: message,
            approved: settled,
            captured: settled,
            last4: card
                .as_ref()
                .and_then(|card| card.credit_card_number.as_deref())
                .and_then(last_four),
            brand: card.and_then(|card| card.credit_card_brand),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn an_unknown_provider_status_never_settles() {
        assert_eq!(map_pix_status("RECEIVED"), PixStatus::Paid);
        assert_eq!(map_pix_status("CONFIRMED"), PixStatus::Paid);
        assert_eq!(map_pix_status("PENDING"), PixStatus::Pending);
        assert_eq!(map_pix_status("OVERDUE"), PixStatus::Expired);
        assert_eq!(map_pix_status("REFUNDED"), PixStatus::Refunded);
        assert_eq!(map_pix_status("CHARGEBACK_REQUESTED"), PixStatus::Refunded);
        // The property that matters: a state added by the provider after this
        // code was written must not be able to mark a charge paid.
        assert_eq!(map_pix_status("SOME_FUTURE_STATE"), PixStatus::Pending);
        assert_eq!(map_pix_status(""), PixStatus::Pending);
    }

    #[test]
    fn an_unknown_environment_is_refused_rather_than_defaulting() {
        assert!(AsaasProcessor::new("key".into(), "sandbox").is_ok());
        assert!(AsaasProcessor::new("key".into(), "production").is_ok());
        // Never silently fall back to production.
        assert!(AsaasProcessor::new("key".into(), "staging").is_err());
        assert!(AsaasProcessor::new("key".into(), "").is_err());
        assert!(AsaasProcessor::new(String::new(), "sandbox").is_err());
    }

    #[test]
    fn only_a_settled_provider_status_counts_as_captured() {
        let payment: AsaasPayment =
            serde_json::from_value(json!({"id": "pay_1", "status": "CONFIRMED"})).unwrap();
        let result = payment.into_card_result();
        assert!(result.approved && result.captured);

        let payment: AsaasPayment =
            serde_json::from_value(json!({"id": "pay_2", "status": "PENDING"})).unwrap();
        let result = payment.into_card_result();
        assert!(!result.approved && !result.captured);
    }

    #[test]
    fn a_rejection_carries_the_provider_code_but_not_its_body() {
        let payment: AsaasPayment = serde_json::from_value(json!({
            "id": "",
            "errors": [{"code": "invalid_creditCard", "description": "recusado"}]
        }))
        .unwrap();
        let result = payment.into_card_result();
        assert_eq!(result.return_code, "invalid_creditCard");
        assert!(!result.captured);
    }

    #[test]
    fn a_masked_number_is_stored_as_four_digits() {
        // The column is varchar(4): anything longer is a failed write at the
        // end of a successful payment, which is the worst place to find out.
        assert_eq!(last_four("properties****1234").as_deref(), Some("1234"));
        assert_eq!(last_four("5162******1234").as_deref(), Some("1234"));
        assert_eq!(last_four("1234").as_deref(), Some("1234"));
        assert_eq!(last_four("12"), None);
        assert_eq!(last_four(""), None);

        let payment: AsaasPayment = serde_json::from_value(json!({
            "id": "pay_1",
            "status": "CONFIRMED",
            "creditCard": {"creditCardNumber": "8829", "creditCardBrand": "VISA"}
        }))
        .unwrap();
        let result = payment.into_card_result();
        assert_eq!(result.last4.as_deref(), Some("8829"));
        assert_eq!(result.brand.as_deref(), Some("VISA"));
    }

    #[test]
    fn parses_the_provider_expiry_formats() {
        assert!(parse_provider_datetime("2026-09-04 23:59:59").is_some());
        assert!(parse_provider_datetime("2026-09-04").is_some());
        assert!(parse_provider_datetime("not a date").is_none());
    }
}
