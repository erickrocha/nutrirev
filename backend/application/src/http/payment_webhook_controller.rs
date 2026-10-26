//! Provider callbacks. The only unauthenticated route in the application.
//!
//! Three rules govern everything here.
//!
//! **The body is not evidence.** It arrives from the open internet and names the
//! row it wants acted on. It is used to *locate* an attempt and for nothing else:
//! the status and the amount that settle a charge come from a read we make back
//! to the provider with that clinic's own key.
//!
//! **Answer 200 to anything we understood enough to ignore.** Asaas pauses the
//! entire webhook queue for an account when the endpoint returns non-2xx, so an
//! unrecognised event or an unknown reference must not look like a failure —
//! that would stop billing for the clinic until someone noticed by hand.
//!
//! **The secret is per clinic.** Verified after the attempt is located, against
//! that tenant's own merchant secret, in constant time. One shared token would
//! let any holder settle any clinic's charge.

use crate::AppState;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::Json;
use business::domain::pix_payment::PixStatus;
use business::gateway::card_payment_gateway::CardPaymentGateway;
use business::gateway::payment_secret_resolver::{
    secrets_match, EnvironmentPaymentSecretResolver, PaymentSecretResolver,
};
use business::gateway::pix_processor::PixProcessor;
use business::use_cases::pix_payment_use_case::PixPaymentUseCase;
use serde::Deserialize;

const TOKEN_HEADER: &str = "asaas-access-token";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AsaasWebhookJson {
    #[serde(default)]
    pub event: String,
    #[serde(default)]
    pub payment: Option<AsaasWebhookPayment>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AsaasWebhookPayment {
    #[serde(default)]
    pub id: String,
    /// Our attempt reference. Globally unique, which is what lets an
    /// unauthenticated request establish which clinic it concerns.
    #[serde(default)]
    pub external_reference: Option<String>,
}

/// Handles one provider callback.
///
/// Returns 401 only when the clinic's secret does not match. Everything else —
/// malformed body, unknown reference, event we do not act on, provider read that
/// failed — answers 200, because the alternative is a stalled webhook queue.
pub async fn asaas(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: String,
) -> (StatusCode, Json<serde_json::Value>) {
    let Ok(payload) = serde_json::from_str::<AsaasWebhookJson>(&body) else {
        log::warn!("Asaas webhook: unparseable body, ignoring");
        return ok();
    };
    let event = payload.event;
    let Some(payment) = payload.payment else {
        log::info!("Asaas webhook: event '{event}' carries no payment, ignoring");
        return ok();
    };
    let Some(reference) = payment.external_reference.filter(|r| !r.is_empty()) else {
        return ok();
    };

    // Locating the attempt is what tells us whose clinic this is. It proves
    // nothing about the caller; the secret check below does that.
    let attempt = match CardPaymentGateway::attempt_by_reference(state.conn.as_ref(), &reference)
        .await
    {
        Ok(Some(attempt)) => attempt,
        Ok(None) => {
            log::info!("Asaas webhook: event '{event}' references no known attempt, ignoring");
            return ok();
        }
        Err(_) => {
            log::error!("Asaas webhook: attempt lookup failed");
            return ok();
        }
    };

    let secrets = EnvironmentPaymentSecretResolver;
    let Ok(Some(merchant)) =
        CardPaymentGateway::merchant_by_id(state.conn.as_ref(), attempt.tenant_id, attempt.merchant_id)
            .await
    else {
        log::error!("Asaas webhook: merchant unavailable for the referenced attempt");
        return ok();
    };

    let Ok(expected) = secrets.asaas_webhook_token(&merchant.credentials_secret_ref) else {
        log::error!("Asaas webhook: no webhook secret configured for this merchant");
        return ok();
    };
    let presented = headers
        .get(TOKEN_HEADER)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();
    if !secrets_match(presented, expected.as_str()) {
        log::warn!("Asaas webhook: rejected a callback with an invalid token");
        return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"received": false})),
        );
    }

    // Authenticated. Now ask the provider what actually happened, rather than
    // believing the body that just told us.
    let Ok(credentials) = secrets.asaas(&merchant.credentials_secret_ref) else {
        log::error!("Asaas webhook: merchant credentials unavailable");
        return ok();
    };
    let Ok(processor) = business::gateway::asaas_processor::AsaasProcessor::new(
        credentials.api_key.to_string(),
        &merchant.environment,
    ) else {
        log::error!("Asaas webhook: processor unavailable");
        return ok();
    };

    let state_now = match processor.charge_status(&payment.id).await {
        Ok(state_now) => state_now,
        Err(_) => {
            // The provider retries; a failed read here is not a failed callback.
            log::warn!("Asaas webhook: could not read the payment back, will retry");
            return ok();
        }
    };
    if state_now.status == PixStatus::Pending {
        return ok();
    }

    match PixPaymentUseCase::settle(
        &state.conn,
        attempt.tenant_id,
        attempt.id,
        state_now.status,
        state_now.amount_cents,
    )
    .await
    {
        Ok(_) => ok(),
        Err(error) => {
            // Includes the amount mismatch, which deliberately leaves the
            // attempt flagged for a human rather than settling anything.
            log::error!("Asaas webhook: event '{}' settlement refused: {}", event, error.message);
            ok()
        }
    }
}

fn ok() -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::OK, Json(serde_json::json!({"received": true})))
}
