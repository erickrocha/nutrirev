use crate::domain::card_submission::{CardProcessorResult, CardSubmission};
use crate::gateway::card_processor::{CardProcessor, CardProcessorError};
use base64::Engine;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use zeroize::Zeroizing;

const SANDBOX_TOKEN_URL: &str = "https://rl7-sandbox-api.useredecloud.com.br/oauth2/token";
const SANDBOX_TRANSACTION_URL: &str = "https://sandbox-erede.useredecloud.com.br/v2/transactions";

pub struct RedeSandboxProcessor {
    client: Client,
    client_id: Zeroizing<String>,
    client_secret: Zeroizing<String>,
}

impl RedeSandboxProcessor {
    /// Credentials must be resolved from `payment_merchant.credentials_secret_ref`
    /// by the composition root. They must not come from a request or the database.
    pub fn new(client_id: String, client_secret: String) -> Result<Self, CardProcessorError> {
        if client_id.is_empty() || client_secret.is_empty() {
            return Err(CardProcessorError::Configuration);
        }
        let client = Client::builder()
            .https_only(true)
            .timeout(Duration::from_secs(20))
            .build()
            .map_err(|_| CardProcessorError::Configuration)?;
        Ok(Self {
            client,
            client_id: Zeroizing::new(client_id),
            client_secret: Zeroizing::new(client_secret),
        })
    }

    async fn access_token(&self) -> Result<Zeroizing<String>, CardProcessorError> {
        let basic = base64::engine::general_purpose::STANDARD.encode(format!(
            "{}:{}",
            self.client_id.as_str(),
            self.client_secret.as_str()
        ));
        let response = self
            .client
            .post(SANDBOX_TOKEN_URL)
            .header("Authorization", format!("Basic {basic}"))
            .form(&[("grant_type", "client_credentials")])
            .send()
            .await
            .map_err(|_| CardProcessorError::Unknown)?;
        if !response.status().is_success() {
            return Err(CardProcessorError::Configuration);
        }
        let token: OAuthResponse = response
            .json()
            .await
            .map_err(|_| CardProcessorError::Unknown)?;
        Ok(Zeroizing::new(token.access_token))
    }
}

#[async_trait::async_trait]
impl CardProcessor for RedeSandboxProcessor {
    async fn authorize(
        &self,
        submission: &CardSubmission,
    ) -> Result<CardProcessorResult, CardProcessorError> {
        let token = self.access_token().await?;
        let request = RedeTransactionRequest::from(submission);
        let response = self
            .client
            .post(SANDBOX_TRANSACTION_URL)
            .bearer_auth(token.as_str())
            .json(&request)
            .send()
            .await
            .map_err(|_| CardProcessorError::Unknown)?;
        let status = response.status();
        let body: RedeTransactionResponse = response
            .json()
            .await
            .map_err(|_| CardProcessorError::Unknown)?;
        let result = CardProcessorResult {
            provider_transaction_id: body.tid.unwrap_or_default(),
            approved: status.is_success() && body.return_code == "00",
            // The request above asks for capture, so an approved response is
            // captured money.
            captured: status.is_success() && body.return_code == "00",
            return_code: body.return_code,
            return_message: body.return_message,
            last4: body.last4,
            brand: body.brand.map(|brand| brand.name),
        };
        if result.approved {
            Ok(result)
        } else {
            Err(CardProcessorError::Declined(result))
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RedeTransactionRequest<'a> {
    capture: bool,
    reference: &'a str,
    amount: i64,
    kind: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    installments: Option<i32>,
    cardholder_name: &'a str,
    card_number: &'a str,
    expiration_month: u8,
    expiration_year: u16,
    security_code: &'a str,
}

impl<'a> From<&'a CardSubmission> for RedeTransactionRequest<'a> {
    fn from(value: &'a CardSubmission) -> Self {
        Self {
            // Authorize and capture together. This is an invoice being paid now,
            // not a pre-authorization: a separate capture step would only add a
            // window in which the authorization can expire uncaptured.
            capture: true,
            reference: &value.reference,
            amount: value.amount_cents,
            kind: value.method.as_str(),
            installments: (value.installments > 1).then_some(value.installments),
            cardholder_name: &value.card.cardholder_name,
            card_number: value.card.number(),
            expiration_month: value.card.expiration_month,
            expiration_year: value.card.expiration_year,
            security_code: value.card.security_code(),
        }
    }
}

#[derive(Deserialize)]
struct OAuthResponse {
    access_token: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RedeTransactionResponse {
    tid: Option<String>,
    #[serde(default)]
    return_code: String,
    #[serde(default)]
    return_message: String,
    last4: Option<String>,
    brand: Option<RedeBrand>,
}

#[derive(Deserialize)]
struct RedeBrand {
    name: String,
}
