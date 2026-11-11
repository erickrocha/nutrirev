//! Stripe adapter: cards, Pix, and stored-card tokens against one clinic's account.
//!
//! Same posture as `asaas_processor`: HTTPS only, a bounded timeout, the secret
//! key held as `Zeroizing` and never read from a request or the payment tables,
//! and provider response bodies kept out of returned errors so a PAN or a token
//! cannot reach a log through an error path.
//!
//! Each clinic is its own Stripe account, so an instance is bound to one
//! merchant row's key and must never be shared across tenants.
//!
//! Stripe takes `application/x-www-form-urlencoded` bodies with bracketed keys
//! (`payment_method_data[card][number]`) and amounts in the smallest currency
//! unit, so — unlike the PSP — no reais conversion happens here.

use crate::domain::card_submission::{CardProcessorResult, CardSubmission, SensitiveCardData};
use crate::domain::card_token::{CardToken, TokenChargeRequest, TokenHolder};
use crate::domain::pix_payment::{PixChargeRequest, PixChargeResult, PixChargeState, PixStatus};
use crate::gateway::card_processor::{CardProcessor, CardProcessorError};
use crate::gateway::card_tokenizer::CardTokenizer;
use crate::gateway::pix_processor::{PixProcessor, PixProcessorError};
use crate::gateway::provider_customer::ProviderCustomerRegistry;
use base64::Engine;
use chrono::{TimeZone, Utc};
use hmac::{Hmac, Mac};
use reqwest::{Client, RequestBuilder, StatusCode};
use serde::Deserialize;
use sha2::Sha256;
use std::time::Duration;
use zeroize::Zeroizing;

const BASE_URL: &str = "https://api.stripe.com/v1";
const CURRENCY: &str = "brl";

/// How far a webhook timestamp may drift from our clock. Stripe's own
/// libraries use five minutes; anything older is treated as a replay.
pub const WEBHOOK_TOLERANCE_SECONDS: i64 = 300;

/// Matches the columns these values are written to.
const RETURN_CODE_MAX: usize = 64;
const RETURN_MESSAGE_MAX: usize = 256;

type Form = Vec<(String, String)>;

pub struct StripeProcessor {
    client: Client,
    secret_key: Zeroizing<String>,
}

impl StripeProcessor {
    /// Stripe has a single host; the environment is a property of the key.
    /// The key prefix is checked against the merchant row's environment so a
    /// live key configured on a sandbox row (or the reverse) is refused rather
    /// than quietly charging real cards from a test setup.
    pub fn new(secret_key: String, environment: &str) -> Result<Self, CardProcessorError> {
        let expected = match environment {
            "sandbox" => "_test_",
            "production" => "_live_",
            _ => return Err(CardProcessorError::Configuration),
        };
        let prefix_ok = ["sk", "rk"]
            .iter()
            .any(|kind| secret_key.starts_with(&format!("{kind}{expected}")));
        if !prefix_ok {
            return Err(CardProcessorError::Configuration);
        }
        let client = Client::builder()
            .https_only(true)
            .timeout(Duration::from_secs(20))
            .build()
            .map_err(|_| CardProcessorError::Configuration)?;
        Ok(Self {
            client,
            secret_key: Zeroizing::new(secret_key),
        })
    }

    fn post(&self, path: &str) -> RequestBuilder {
        self.client
            .post(format!("{BASE_URL}{path}"))
            .bearer_auth(self.secret_key.as_str())
    }

    fn get(&self, path: &str) -> RequestBuilder {
        self.client
            .get(format!("{BASE_URL}{path}"))
            .bearer_auth(self.secret_key.as_str())
    }

    /// Creates and confirms a PaymentIntent, classifying the answer.
    ///
    /// The idempotency key is our attempt reference: a retry of the same
    /// attempt can never create a second PaymentIntent at Stripe.
    async fn payment_intent(
        &self,
        form: &Form,
        idempotency_key: &str,
    ) -> Result<StripePaymentIntent, IntentFailure> {
        let response = self
            .post("/payment_intents")
            .header("Idempotency-Key", idempotency_key)
            .form(form)
            .send()
            .await
            .map_err(|_| IntentFailure::Unknown)?;
        let status = response.status();
        if status.is_success() {
            return response
                .json::<StripePaymentIntent>()
                .await
                .map_err(|_| IntentFailure::Unknown);
        }
        let body: StripeErrorEnvelope = response.json().await.unwrap_or_default();
        Err(classify_error(status, body.error))
    }

    async fn fetch_intent(&self, id: &str) -> Result<StripePaymentIntent, PixProcessorError> {
        if !is_safe_id(id) {
            return Err(PixProcessorError::Configuration);
        }
        let response = self
            .get(&format!("/payment_intents/{id}?expand%5B%5D=latest_charge"))
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

    /// The QR image, as base64 PNG, to match what the web and mobile clients
    /// already render. Best-effort: the copy-and-paste payload is the charge,
    /// and a missing picture must not turn an issued charge into a failure.
    async fn qr_image(&self, url: Option<&str>) -> Option<String> {
        let url = url.filter(|u| u.starts_with("https://"))?;
        let response = self.client.get(url).send().await.ok()?;
        if !response.status().is_success() {
            return None;
        }
        let bytes = response.bytes().await.ok()?;
        Some(base64::engine::general_purpose::STANDARD.encode(bytes))
    }
}

/// Stripe ids are `prefix_alphanumerics`. Anything else is refused before it
/// is interpolated into a URL path.
fn is_safe_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 255
        && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_')
}

/// Stripe payer ids are `cus_` followed by mixed-case alphanumerics. An
/// all-digit suffix is the PSP's format, never Stripe's.
pub fn is_stripe_customer_id(id: &str) -> bool {
    id.strip_prefix("cus_").is_some_and(|rest| {
        !rest.is_empty()
            && rest.bytes().all(|b| b.is_ascii_alphanumeric())
            && !rest.bytes().all(|b| b.is_ascii_digit())
    })
}

fn push(form: &mut Form, key: &str, value: impl Into<String>) {
    form.push((key.to_owned(), value.into()));
}

fn clip(value: String, max: usize) -> String {
    if value.len() <= max {
        return value;
    }
    let mut end = max;
    while !value.is_char_boundary(end) {
        end -= 1;
    }
    value[..end].to_owned()
}

fn card_fields(form: &mut Form, prefix: &str, card: &SensitiveCardData) {
    push(form, &format!("{prefix}[type]"), "card");
    push(form, &format!("{prefix}[card][number]"), card.number());
    push(form, &format!("{prefix}[card][exp_month]"), card.expiration_month.to_string());
    push(form, &format!("{prefix}[card][exp_year]"), card.expiration_year.to_string());
    push(form, &format!("{prefix}[card][cvc]"), card.security_code());
    push(
        form,
        &format!("{prefix}[billing_details][name]"),
        card.cardholder_name.clone(),
    );
}

/// Parcelamento: Brazilian cards accept a fixed monthly plan chosen at confirm.
fn installment_fields(form: &mut Form, installments: i32) {
    if installments > 1 {
        push(form, "payment_method_options[card][installments][enabled]", "true");
        push(
            form,
            "payment_method_options[card][installments][plan][count]",
            installments.to_string(),
        );
        push(form, "payment_method_options[card][installments][plan][interval]", "month");
        push(form, "payment_method_options[card][installments][plan][type]", "fixed_count");
    }
}

/// The form for a customer-present card payment.
fn card_payment_form(submission: &CardSubmission) -> Form {
    let mut form = Form::new();
    push(&mut form, "amount", submission.amount_cents.to_string());
    push(&mut form, "currency", CURRENCY);
    push(&mut form, "confirm", "true");
    push(&mut form, "payment_method_types[]", "card");
    // There is no browser to come back to; a payment that would need a
    // redirect must fail now rather than hang in `requires_action`.
    push(&mut form, "error_on_requires_action", "true");
    card_fields(&mut form, "payment_method_data", &submission.card);
    if let Some(holder) = submission.holder.as_ref() {
        if is_stripe_customer_id(&holder.provider_customer_id) {
            push(&mut form, "customer", holder.provider_customer_id.clone());
        }
        push(&mut form, "payment_method_data[billing_details][email]", holder.email.clone());
    }
    installment_fields(&mut form, submission.installments);
    push(&mut form, "description", format!("Charge {}", submission.reference));
    push(&mut form, "metadata[reference]", submission.reference.clone());
    push(&mut form, "expand[]", "latest_charge");
    form
}

/// The form for a merchant-initiated charge against a stored card.
fn token_charge_form(provider_token: &str, request: &TokenChargeRequest) -> Form {
    let mut form = Form::new();
    push(&mut form, "amount", request.amount_cents.to_string());
    push(&mut form, "currency", CURRENCY);
    push(&mut form, "customer", request.provider_customer_id.clone());
    push(&mut form, "payment_method", provider_token);
    push(&mut form, "payment_method_types[]", "card");
    push(&mut form, "off_session", "true");
    push(&mut form, "confirm", "true");
    installment_fields(&mut form, request.installments);
    push(&mut form, "description", request.description.clone());
    push(&mut form, "metadata[reference]", request.reference.clone());
    push(&mut form, "expand[]", "latest_charge");
    form
}

fn pix_charge_form(request: &PixChargeRequest) -> Form {
    let mut form = Form::new();
    push(&mut form, "amount", request.amount_cents.to_string());
    push(&mut form, "currency", CURRENCY);
    push(&mut form, "customer", request.provider_customer_id.clone());
    push(&mut form, "confirm", "true");
    push(&mut form, "payment_method_types[]", "pix");
    push(&mut form, "payment_method_data[type]", "pix");
    push(
        &mut form,
        "payment_method_options[pix][expires_after_seconds]",
        request.expires_in_seconds.to_string(),
    );
    push(&mut form, "description", request.description.clone());
    push(&mut form, "metadata[reference]", request.reference.clone());
    form
}

/// CPF (11 digits) or CNPJ (14), as Stripe's tax id types name them.
fn tax_id_type(tax_id: &str) -> Option<&'static str> {
    match tax_id.len() {
        11 => Some("br_cpf"),
        14 => Some("br_cnpj"),
        _ => None,
    }
}

#[async_trait::async_trait]
impl ProviderCustomerRegistry for StripeProcessor {
    async fn create_customer(&self, holder: &TokenHolder) -> Result<String, CardProcessorError> {
        let digits: String = holder.tax_id.chars().filter(char::is_ascii_digit).collect();
        let mut form = Form::new();
        push(&mut form, "name", holder.name.clone());
        push(&mut form, "email", holder.email.clone());
        if let Some(phone) = holder.phone.as_ref().filter(|p| !p.is_empty()) {
            push(&mut form, "phone", phone.clone());
        }
        if let Some(postal) = holder.postal_code.as_ref().filter(|p| !p.is_empty()) {
            push(&mut form, "address[postal_code]", postal.clone());
            push(&mut form, "address[country]", "BR");
        }
        // Stripe reads the payer's document from the customer for Pix; keeping
        // it there means the charge itself never has to carry it.
        if let Some(kind) = tax_id_type(&digits) {
            push(&mut form, "tax_id_data[0][type]", kind);
            push(&mut form, "tax_id_data[0][value]", digits.clone());
        }
        push(&mut form, "metadata[tax_id]", digits);

        let response = self
            .post("/customers")
            .form(&form)
            .send()
            .await
            .map_err(|_| CardProcessorError::Unknown)?;
        if !response.status().is_success() {
            return Err(CardProcessorError::Configuration);
        }
        let created: StripeObjectId = response
            .json()
            .await
            .map_err(|_| CardProcessorError::Unknown)?;
        if !is_stripe_customer_id(&created.id) {
            return Err(CardProcessorError::Unknown);
        }
        Ok(created.id)
    }

    fn owns_customer_id(&self, provider_customer_id: &str) -> bool {
        is_stripe_customer_id(provider_customer_id)
    }
}

#[async_trait::async_trait]
impl CardProcessor for StripeProcessor {
    async fn authorize(
        &self,
        submission: &CardSubmission,
    ) -> Result<CardProcessorResult, CardProcessorError> {
        let form = card_payment_form(submission);
        intent_outcome(self.payment_intent(&form, &submission.reference).await)
    }
}

#[async_trait::async_trait]
impl PixProcessor for StripeProcessor {
    async fn create_charge(
        &self,
        request: &PixChargeRequest,
    ) -> Result<PixChargeResult, PixProcessorError> {
        if request.amount_cents <= 0 {
            return Err(PixProcessorError::Configuration);
        }
        let form = pix_charge_form(request);
        let intent = match self.payment_intent(&form, &request.reference).await {
            Ok(intent) => intent,
            Err(IntentFailure::Declined(error)) => {
                return Err(PixProcessorError::Rejected(error.code()));
            }
            Err(IntentFailure::Configuration) => return Err(PixProcessorError::Configuration),
            Err(IntentFailure::Unknown) => return Err(PixProcessorError::Unknown),
        };

        // A PaymentIntent that exists without a QR is not a usable charge, but
        // it is also not one we may retry — it is already out there.
        let Some(qr) = intent
            .next_action
            .and_then(|action| action.pix_display_qr_code)
            .filter(|qr| !qr.data.is_empty())
        else {
            return Err(PixProcessorError::Unknown);
        };
        let encoded_image = self.qr_image(qr.image_url_png.as_deref()).await;
        Ok(PixChargeResult {
            provider_payment_id: intent.id,
            payload: qr.data,
            encoded_image,
            expires_at: qr
                .expires_at
                .and_then(|seconds| Utc.timestamp_opt(seconds, 0).single()),
        })
    }

    async fn charge_status(
        &self,
        provider_payment_id: &str,
    ) -> Result<PixChargeState, PixProcessorError> {
        let intent = self.fetch_intent(provider_payment_id).await?;
        let status = map_intent_status(&intent);
        Ok(PixChargeState {
            status,
            // Only money that arrived is reported. A pending intent carries
            // its requested amount, which says nothing about what was paid.
            amount_cents: (status == PixStatus::Paid).then_some(intent.amount_received).flatten(),
        })
    }
}

#[async_trait::async_trait]
impl CardTokenizer for StripeProcessor {
    /// Saves the card with a confirmed SetupIntent marked for off-session use.
    ///
    /// A SetupIntent, not a bare PaymentMethod attach: it is what records the
    /// cardholder's consent for later merchant-initiated charges, and the
    /// issuer may decline those without it.
    async fn tokenize(
        &self,
        card: &SensitiveCardData,
        holder: &TokenHolder,
    ) -> Result<CardToken, CardProcessorError> {
        if !is_stripe_customer_id(&holder.provider_customer_id) {
            return Err(CardProcessorError::Configuration);
        }
        let mut form = Form::new();
        push(&mut form, "customer", holder.provider_customer_id.clone());
        push(&mut form, "confirm", "true");
        push(&mut form, "usage", "off_session");
        push(&mut form, "payment_method_types[]", "card");
        card_fields(&mut form, "payment_method_data", card);
        push(&mut form, "payment_method_data[billing_details][email]", holder.email.clone());
        push(&mut form, "mandate_data[customer_acceptance][type]", "online");
        push(
            &mut form,
            "mandate_data[customer_acceptance][online][ip_address]",
            holder.remote_ip.clone(),
        );
        push(
            &mut form,
            "mandate_data[customer_acceptance][online][user_agent]",
            "nutrirev",
        );
        push(&mut form, "expand[]", "payment_method");

        let response = self
            .post("/setup_intents")
            .form(&form)
            .send()
            .await
            .map_err(|_| CardProcessorError::Unknown)?;
        let status = response.status();
        if !status.is_success() {
            let body: StripeErrorEnvelope = response.json().await.unwrap_or_default();
            return Err(match classify_error(status, body.error) {
                IntentFailure::Declined(error) => {
                    CardProcessorError::Declined(Box::new(error.into_result(String::new())))
                }
                IntentFailure::Configuration => CardProcessorError::Configuration,
                IntentFailure::Unknown => CardProcessorError::Unknown,
            });
        }
        let setup: StripeSetupIntent = response
            .json()
            .await
            .map_err(|_| CardProcessorError::Unknown)?;
        setup.into_token()
    }

    async fn charge_token(
        &self,
        provider_token: &str,
        request: &TokenChargeRequest,
    ) -> Result<CardProcessorResult, CardProcessorError> {
        if !is_safe_id(provider_token) || !is_stripe_customer_id(&request.provider_customer_id) {
            return Err(CardProcessorError::Configuration);
        }
        let form = token_charge_form(provider_token, request);
        intent_outcome(self.payment_intent(&form, &request.reference).await)
    }

    fn provider_name(&self) -> &'static str {
        "stripe"
    }
}

/// How a PaymentIntent request failed.
enum IntentFailure {
    /// The provider said no: the card was declined, or the request was refused
    /// before anything was charged.
    Declined(StripeError),
    /// Our key or account setup is wrong. Nothing was charged.
    Configuration,
    /// We cannot tell whether a payment was created. Never retried blindly.
    Unknown,
}

/// Classifies a non-2xx response conservatively.
///
/// * 402 is Stripe's "request failed" — a decline. Nothing was captured.
/// * 400/404 are a refused request. Nothing was created.
/// * 401/403 mean the key is wrong or lacks permission.
/// * 409 (idempotency conflict), 429 and 5xx leave the outcome unknown.
fn classify_error(status: StatusCode, error: Option<StripeError>) -> IntentFailure {
    match status.as_u16() {
        400 | 402 | 404 => IntentFailure::Declined(error.unwrap_or_default()),
        401 | 403 => IntentFailure::Configuration,
        _ => IntentFailure::Unknown,
    }
}

/// A PaymentIntent outcome, in the card boundary's terms.
fn intent_outcome(
    outcome: Result<StripePaymentIntent, IntentFailure>,
) -> Result<CardProcessorResult, CardProcessorError> {
    match outcome {
        Ok(intent) => match intent.status.as_deref().unwrap_or_default() {
            "succeeded" | "requires_capture" => Ok(intent.into_card_result()),
            // Still moving at Stripe; we cannot call it either way.
            "processing" => Err(CardProcessorError::Unknown),
            // `requires_action` (3DS with nobody to complete it),
            // `requires_payment_method`, `canceled`: not paid.
            _ => Err(CardProcessorError::Declined(Box::new(intent.into_card_result()))),
        },
        Err(IntentFailure::Declined(error)) => {
            let id = error
                .payment_intent
                .as_ref()
                .map(|intent| intent.id.clone())
                .unwrap_or_default();
            Err(CardProcessorError::Declined(Box::new(error.into_result(id))))
        }
        Err(IntentFailure::Configuration) => Err(CardProcessorError::Configuration),
        Err(IntentFailure::Unknown) => Err(CardProcessorError::Unknown),
    }
}

/// PaymentIntent states, mapped conservatively for Pix reconciliation.
///
/// Anything unrecognised is `Pending`, never `Paid`: a state this code has not
/// been taught about must not be able to settle a charge.
pub fn map_intent_status(intent: &StripePaymentIntent) -> PixStatus {
    let reversed = intent.latest_charge.as_ref().is_some_and(|charge| {
        charge.refunded || charge.disputed || charge.amount_refunded.unwrap_or(0) > 0
    });
    match intent.status.as_deref().unwrap_or_default() {
        "succeeded" if reversed => PixStatus::Refunded,
        "succeeded" => PixStatus::Paid,
        "canceled" => PixStatus::Expired,
        _ => PixStatus::Pending,
    }
}

/// Verifies a `Stripe-Signature` header against this clinic's signing secret.
///
/// The header is `t=<unix>,v1=<hex>[,v1=<hex>...]`; the signed content is
/// `"{t}.{raw body}"`, HMAC-SHA256 with the secret. Several `v1` entries appear
/// while a secret is being rolled, and any one matching is enough. Comparison
/// is constant time, and a timestamp outside the tolerance is a replay.
pub fn verify_webhook_signature(header: &str, body: &str, secret: &str, now_unix: i64) -> bool {
    if secret.is_empty() {
        return false;
    }
    let mut timestamp: Option<i64> = None;
    let mut signatures: Vec<&str> = Vec::new();
    for part in header.split(',') {
        match part.trim().split_once('=') {
            Some(("t", value)) => timestamp = value.parse().ok(),
            Some(("v1", value)) => signatures.push(value),
            _ => {}
        }
    }
    let Some(timestamp) = timestamp else {
        return false;
    };
    if (now_unix - timestamp).abs() > WEBHOOK_TOLERANCE_SECONDS || signatures.is_empty() {
        return false;
    }
    let Ok(mut mac) = Hmac::<Sha256>::new_from_slice(secret.as_bytes()) else {
        return false;
    };
    mac.update(timestamp.to_string().as_bytes());
    mac.update(b".");
    mac.update(body.as_bytes());
    let expected = hex::encode(mac.finalize().into_bytes());
    signatures
        .iter()
        .fold(false, |found, candidate| {
            crate::gateway::payment_secret_resolver::secrets_match(candidate, &expected) | found
        })
}

#[derive(Deserialize)]
struct StripeObjectId {
    #[serde(default)]
    id: String,
}

#[derive(Deserialize, Default)]
struct StripeErrorEnvelope {
    #[serde(default)]
    error: Option<StripeError>,
}

/// A Stripe error. Only codes and the provider's own message are kept; the
/// message never contains card data.
#[derive(Deserialize, Default)]
struct StripeError {
    #[serde(default)]
    code: Option<String>,
    #[serde(default)]
    decline_code: Option<String>,
    #[serde(default)]
    message: Option<String>,
    #[serde(default)]
    payment_intent: Option<StripeObjectId>,
}

impl StripeError {
    fn code(&self) -> String {
        self.decline_code
            .clone()
            .or_else(|| self.code.clone())
            .unwrap_or_else(|| "declined".to_owned())
    }

    fn into_result(self, provider_transaction_id: String) -> CardProcessorResult {
        let code = self.code();
        CardProcessorResult {
            provider_transaction_id,
            return_code: clip(code.clone(), RETURN_CODE_MAX),
            return_message: clip(self.message.unwrap_or(code), RETURN_MESSAGE_MAX),
            approved: false,
            captured: false,
            last4: None,
            brand: None,
        }
    }
}

#[derive(Deserialize)]
pub struct StripePaymentIntent {
    #[serde(default)]
    id: String,
    #[serde(default)]
    status: Option<String>,
    #[serde(default)]
    amount_received: Option<i64>,
    #[serde(default)]
    next_action: Option<StripeNextAction>,
    #[serde(default, deserialize_with = "expandable")]
    latest_charge: Option<StripeCharge>,
    #[serde(default)]
    last_payment_error: Option<StripeError>,
}

impl StripePaymentIntent {
    fn into_card_result(self) -> CardProcessorResult {
        let status = self.status.unwrap_or_default();
        let approved = matches!(status.as_str(), "succeeded" | "requires_capture");
        let captured = status == "succeeded";
        let (code, message) = match self.last_payment_error.filter(|_| !approved) {
            Some(error) => {
                let code = error.code();
                (code.clone(), error.message.unwrap_or(code))
            }
            None => (status.clone(), status),
        };
        let card = self
            .latest_charge
            .and_then(|charge| charge.payment_method_details)
            .and_then(|details| details.card);
        CardProcessorResult {
            provider_transaction_id: self.id,
            return_code: clip(code, RETURN_CODE_MAX),
            return_message: clip(message, RETURN_MESSAGE_MAX),
            approved,
            captured,
            last4: card.as_ref().and_then(|card| card.last4.clone()),
            brand: card.and_then(|card| card.brand),
        }
    }
}

/// `latest_charge` is an id unless expanded. Accept both; only the expanded
/// object carries anything we read.
fn expandable<'de, D>(deserializer: D) -> Result<Option<StripeCharge>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Expandable {
        Object(StripeCharge),
        Id(#[allow(dead_code)] String),
    }
    Ok(match Option::<Expandable>::deserialize(deserializer)? {
        Some(Expandable::Object(charge)) => Some(charge),
        _ => None,
    })
}

#[derive(Deserialize)]
struct StripeNextAction {
    #[serde(default)]
    pix_display_qr_code: Option<StripePixQrCode>,
}

#[derive(Deserialize)]
struct StripePixQrCode {
    #[serde(default)]
    data: String,
    #[serde(default)]
    expires_at: Option<i64>,
    #[serde(default)]
    image_url_png: Option<String>,
}

#[derive(Deserialize)]
struct StripeCharge {
    #[serde(default)]
    refunded: bool,
    #[serde(default)]
    disputed: bool,
    #[serde(default)]
    amount_refunded: Option<i64>,
    #[serde(default)]
    payment_method_details: Option<StripePaymentMethodDetails>,
}

#[derive(Deserialize)]
struct StripePaymentMethodDetails {
    #[serde(default)]
    card: Option<StripeCardDetails>,
}

#[derive(Deserialize, Clone)]
struct StripeCardDetails {
    #[serde(default)]
    brand: Option<String>,
    #[serde(default)]
    last4: Option<String>,
    #[serde(default)]
    exp_month: Option<u8>,
    #[serde(default)]
    exp_year: Option<u16>,
}

#[derive(Deserialize)]
struct StripeSetupIntent {
    #[serde(default)]
    status: Option<String>,
    #[serde(default)]
    payment_method: Option<StripePaymentMethod>,
    #[serde(default)]
    last_setup_error: Option<StripeError>,
}

#[derive(Deserialize)]
struct StripePaymentMethod {
    #[serde(default)]
    id: String,
    #[serde(default)]
    card: Option<StripeCardDetails>,
}

impl StripeSetupIntent {
    fn into_token(self) -> Result<CardToken, CardProcessorError> {
        if self.status.as_deref() != Some("succeeded") {
            let error = self.last_setup_error.unwrap_or_default();
            return Err(CardProcessorError::Declined(Box::new(
                error.into_result(String::new()),
            )));
        }
        let method = self.payment_method.ok_or(CardProcessorError::Unknown)?;
        if !is_safe_id(&method.id) {
            return Err(CardProcessorError::Unknown);
        }
        let card = method.card.unwrap_or(StripeCardDetails {
            brand: None,
            last4: None,
            exp_month: None,
            exp_year: None,
        });
        Ok(CardToken {
            provider_token: method.id,
            brand: card.brand,
            last4: card.last4.filter(|digits| digits.len() == 4),
            expiry_month: card.exp_month,
            expiry_year: card.exp_year,
        })
    }
}

/// The minimal slice of a webhook event used to locate an attempt.
///
/// Nothing here is trusted: the event names a PaymentIntent and our reference,
/// and the status that settles anything is read back from Stripe.
#[derive(Deserialize)]
pub struct StripeWebhookEvent {
    #[serde(default, rename = "type")]
    pub event_type: String,
    #[serde(default)]
    pub data: Option<StripeWebhookData>,
}

#[derive(Deserialize)]
pub struct StripeWebhookData {
    pub object: StripeWebhookObject,
}

#[derive(Deserialize)]
pub struct StripeWebhookObject {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub object: String,
    /// Set on charges and disputes; points at the PaymentIntent.
    #[serde(default)]
    pub payment_intent: Option<String>,
    #[serde(default)]
    pub metadata: Option<std::collections::HashMap<String, String>>,
}

impl StripeWebhookEvent {
    /// The PaymentIntent this event concerns, whichever object it carries.
    pub fn payment_intent_id(&self) -> Option<String> {
        let object = &self.data.as_ref()?.object;
        let id = if object.object == "payment_intent" {
            Some(object.id.clone())
        } else {
            object.payment_intent.clone()
        };
        id.filter(|id| id.starts_with("pi_") && is_safe_id(id))
    }

    /// Our attempt reference, when the object carries it.
    pub fn reference(&self) -> Option<String> {
        self.data
            .as_ref()?
            .object
            .metadata
            .as_ref()?
            .get("reference")
            .filter(|reference| !reference.is_empty())
            .cloned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::card_payment::CardMethod;
    use serde_json::json;

    fn intent(value: serde_json::Value) -> StripePaymentIntent {
        serde_json::from_value(value).unwrap()
    }

    fn form_value<'a>(form: &'a Form, key: &str) -> Option<&'a str> {
        form.iter().find(|(k, _)| k == key).map(|(_, v)| v.as_str())
    }

    fn sign(secret: &str, timestamp: i64, body: &str) -> String {
        let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).unwrap();
        mac.update(format!("{timestamp}.{body}").as_bytes());
        hex::encode(mac.finalize().into_bytes())
    }

    #[test]
    fn a_key_for_the_wrong_environment_is_refused() {
        assert!(StripeProcessor::new("sk_test_abc".into(), "sandbox").is_ok());
        assert!(StripeProcessor::new("rk_test_abc".into(), "sandbox").is_ok());
        assert!(StripeProcessor::new("sk_live_abc".into(), "production").is_ok());
        // The failure this prevents: a live key on a sandbox row charging real
        // cards while everyone believes they are testing.
        assert!(StripeProcessor::new("sk_live_abc".into(), "sandbox").is_err());
        assert!(StripeProcessor::new("sk_test_abc".into(), "production").is_err());
        assert!(StripeProcessor::new("sk_test_abc".into(), "staging").is_err());
        assert!(StripeProcessor::new(String::new(), "sandbox").is_err());
    }

    #[test]
    fn an_unknown_intent_status_never_settles() {
        assert_eq!(map_intent_status(&intent(json!({"status": "succeeded"}))), PixStatus::Paid);
        assert_eq!(map_intent_status(&intent(json!({"status": "canceled"}))), PixStatus::Expired);
        assert_eq!(
            map_intent_status(&intent(json!({"status": "requires_action"}))),
            PixStatus::Pending
        );
        assert_eq!(map_intent_status(&intent(json!({"status": "processing"}))), PixStatus::Pending);
        assert_eq!(map_intent_status(&intent(json!({"status": "future_state"}))), PixStatus::Pending);
        assert_eq!(map_intent_status(&intent(json!({}))), PixStatus::Pending);
    }

    #[test]
    fn a_reversed_payment_is_reported_as_refunded() {
        for charge in [
            json!({"refunded": true}),
            json!({"disputed": true}),
            json!({"amount_refunded": 100}),
        ] {
            let pi = intent(json!({"status": "succeeded", "latest_charge": charge}));
            assert_eq!(map_intent_status(&pi), PixStatus::Refunded);
        }
        // An unexpanded charge is just an id and proves nothing either way.
        let pi = intent(json!({"status": "succeeded", "latest_charge": "ch_123"}));
        assert_eq!(map_intent_status(&pi), PixStatus::Paid);
    }

    #[test]
    fn only_a_succeeded_intent_counts_as_captured() {
        let result = intent(json!({
            "id": "pi_1",
            "status": "succeeded",
            "latest_charge": {
                "payment_method_details": {"card": {"brand": "visa", "last4": "4242"}}
            }
        }))
        .into_card_result();
        assert!(result.approved && result.captured);
        assert_eq!(result.last4.as_deref(), Some("4242"));
        assert_eq!(result.brand.as_deref(), Some("visa"));

        let result = intent(json!({"id": "pi_2", "status": "requires_capture"})).into_card_result();
        assert!(result.approved && !result.captured);

        assert!(matches!(
            intent_outcome(Ok(intent(json!({"id": "pi_3", "status": "requires_payment_method"})))),
            Err(CardProcessorError::Declined(_))
        ));
        assert!(matches!(
            intent_outcome(Ok(intent(json!({"id": "pi_4", "status": "processing"})))),
            Err(CardProcessorError::Unknown)
        ));
    }

    #[test]
    fn errors_are_classified_without_guessing() {
        let decline: StripeError = serde_json::from_value(json!({
            "code": "card_declined",
            "decline_code": "insufficient_funds",
            "message": "Your card has insufficient funds.",
            "payment_intent": {"id": "pi_9"}
        }))
        .unwrap();
        match intent_outcome(Err(classify_error(StatusCode::PAYMENT_REQUIRED, Some(decline)))) {
            Err(CardProcessorError::Declined(result)) => {
                assert_eq!(result.return_code, "insufficient_funds");
                assert_eq!(result.provider_transaction_id, "pi_9");
                assert!(!result.captured);
            }
            _ => panic!("a 402 is a decline"),
        }
        assert!(matches!(
            classify_error(StatusCode::UNAUTHORIZED, None),
            IntentFailure::Configuration
        ));
        // Outcome unknown: these must never release the attempt for a retry.
        for status in [
            StatusCode::CONFLICT,
            StatusCode::TOO_MANY_REQUESTS,
            StatusCode::INTERNAL_SERVER_ERROR,
            StatusCode::BAD_GATEWAY,
        ] {
            assert!(matches!(classify_error(status, None), IntentFailure::Unknown));
        }
    }

    #[test]
    fn installments_are_sent_only_when_asked_for() {
        let mut form = Form::new();
        installment_fields(&mut form, 1);
        assert!(form.is_empty());

        installment_fields(&mut form, 3);
        assert_eq!(
            form_value(&form, "payment_method_options[card][installments][plan][count]"),
            Some("3")
        );
        assert_eq!(
            form_value(&form, "payment_method_options[card][installments][plan][interval]"),
            Some("month")
        );
    }

    #[test]
    fn a_card_payment_is_confirmed_in_reais_cents_with_our_reference() {
        let submission = CardSubmission {
            attempt_id: 1,
            reference: "ref-1".into(),
            amount_cents: 5001,
            method: CardMethod::Credit,
            installments: 2,
            card: SensitiveCardData::new(
                "4111111111111111".into(),
                "123".into(),
                12,
                2030,
                "TEST USER".into(),
            )
            .unwrap(),
            holder: None,
        };
        let form = card_payment_form(&submission);
        assert_eq!(form_value(&form, "amount"), Some("5001"));
        assert_eq!(form_value(&form, "currency"), Some("brl"));
        assert_eq!(form_value(&form, "confirm"), Some("true"));
        assert_eq!(form_value(&form, "error_on_requires_action"), Some("true"));
        assert_eq!(form_value(&form, "metadata[reference]"), Some("ref-1"));
        assert_eq!(
            form_value(&form, "payment_method_options[card][installments][plan][count]"),
            Some("2")
        );
    }

    #[test]
    fn an_unattended_charge_is_marked_off_session() {
        let form = token_charge_form(
            "pm_123",
            &TokenChargeRequest {
                reference: "ref-2".into(),
                amount_cents: 9900,
                provider_customer_id: "cus_Abc123".into(),
                description: "Charge ref-2".into(),
                installments: 1,
                consent_ip: None,
                consented_at: None,
            },
        );
        assert_eq!(form_value(&form, "off_session"), Some("true"));
        assert_eq!(form_value(&form, "payment_method"), Some("pm_123"));
        assert_eq!(form_value(&form, "customer"), Some("cus_Abc123"));
        assert_eq!(form_value(&form, "amount"), Some("9900"));
    }

    #[test]
    fn a_pix_charge_expires_when_we_say() {
        let form = pix_charge_form(&PixChargeRequest {
            reference: "ref-3".into(),
            amount_cents: 1500,
            provider_customer_id: "cus_Abc123".into(),
            description: "Charge ref-3".into(),
            expires_in_seconds: 1800,
        });
        assert_eq!(form_value(&form, "payment_method_types[]"), Some("pix"));
        assert_eq!(
            form_value(&form, "payment_method_options[pix][expires_after_seconds]"),
            Some("1800")
        );
    }

    #[test]
    fn a_valid_signature_is_accepted() {
        let body = r#"{"type":"payment_intent.succeeded"}"#;
        let header = format!("t=1000,v1={}", sign("whsec_x", 1000, body));
        assert!(verify_webhook_signature(&header, body, "whsec_x", 1000));
        // During a secret roll Stripe sends one signature per secret.
        let header = format!("t=1000,v1=deadbeef,v1={}", sign("whsec_x", 1000, body));
        assert!(verify_webhook_signature(&header, body, "whsec_x", 1100));
    }

    #[test]
    fn a_forged_tampered_or_replayed_callback_is_refused() {
        let body = r#"{"type":"payment_intent.succeeded"}"#;
        let good = sign("whsec_x", 1000, body);
        // Signed with another clinic's secret.
        let header = format!("t=1000,v1={}", sign("whsec_other", 1000, body));
        assert!(!verify_webhook_signature(&header, body, "whsec_x", 1000));
        // Body altered after signing.
        let header = format!("t=1000,v1={good}");
        assert!(!verify_webhook_signature(&header, r#"{"type":"x"}"#, "whsec_x", 1000));
        // Replayed outside the tolerance window.
        assert!(!verify_webhook_signature(&header, body, "whsec_x", 1000 + 301));
        // Malformed or empty.
        assert!(!verify_webhook_signature("", body, "whsec_x", 1000));
        assert!(!verify_webhook_signature(&format!("v1={good}"), body, "whsec_x", 1000));
        assert!(!verify_webhook_signature("t=1000", body, "whsec_x", 1000));
        assert!(!verify_webhook_signature(&header, body, "", 1000));
    }

    #[test]
    fn webhook_events_point_at_their_payment_intent() {
        let event: StripeWebhookEvent = serde_json::from_value(json!({
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": "pi_1", "object": "payment_intent",
                                "metadata": {"reference": "ref-1"}}}
        }))
        .unwrap();
        assert_eq!(event.payment_intent_id().as_deref(), Some("pi_1"));
        assert_eq!(event.reference().as_deref(), Some("ref-1"));

        let event: StripeWebhookEvent = serde_json::from_value(json!({
            "type": "charge.dispute.created",
            "data": {"object": {"id": "dp_1", "object": "dispute", "payment_intent": "pi_2"}}
        }))
        .unwrap();
        assert_eq!(event.payment_intent_id().as_deref(), Some("pi_2"));
        assert_eq!(event.reference(), None);

        let event: StripeWebhookEvent = serde_json::from_value(json!({
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": "pi_1/../x", "object": "payment_intent"}}
        }))
        .unwrap();
        assert_eq!(event.payment_intent_id(), None);
    }

    #[test]
    fn customer_ids_are_told_apart_from_the_psps() {
        assert!(is_stripe_customer_id("cus_NffrFeUfNV2Hib"));
        assert!(!is_stripe_customer_id("cus_000005219613"));
        assert!(!is_stripe_customer_id("cus_"));
        assert!(!is_stripe_customer_id("pi_123"));
    }

    #[test]
    fn a_stored_card_keeps_only_display_crumbs() {
        let setup: StripeSetupIntent = serde_json::from_value(json!({
            "status": "succeeded",
            "payment_method": {"id": "pm_1", "card": {
                "brand": "mastercard", "last4": "4444", "exp_month": 12, "exp_year": 2030
            }}
        }))
        .unwrap();
        let token = setup.into_token().unwrap();
        assert_eq!(token.provider_token, "pm_1");
        assert_eq!(token.last4.as_deref(), Some("4444"));
        assert_eq!(token.expiry_month, Some(12));

        let setup: StripeSetupIntent =
            serde_json::from_value(json!({"status": "requires_action"})).unwrap();
        assert!(matches!(setup.into_token(), Err(CardProcessorError::Declined(_))));
    }

    #[test]
    fn long_provider_codes_fit_their_columns() {
        assert_eq!(clip("a".repeat(100), RETURN_CODE_MAX).len(), RETURN_CODE_MAX);
        assert_eq!(clip("short".into(), RETURN_CODE_MAX), "short");
    }
}
