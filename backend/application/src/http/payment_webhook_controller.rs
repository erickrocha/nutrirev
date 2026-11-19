//! Stripe Webhook Callback Handler
//!
//! Descriptografa o segredo do webhook do tenant no banco e valida a assinatura criptográfica Stripe-Signature.

use crate::infrastructure::payment_secret_resolver::DatabasePaymentSecretResolver;
use crate::AppState;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::Json;
use business::domain::merchant_capabilities::Provider;
use business::domain::pix_payment::PixStatus;
use business::gateway::card_payment_gateway::CardPaymentGateway;
use business::gateway::payment_provider_factory::psp_client_for;
use business::gateway::payment_secret_resolver::PaymentSecretResolver;
use business::gateway::pix_processor::PixProcessor;
use business::gateway::stripe_processor::{verify_webhook_signature, StripeWebhookEvent};
use business::use_cases::pix_payment_use_case::PixPaymentUseCase;

const STRIPE_SIGNATURE_HEADER: &str = "stripe-signature";

pub async fn stripe(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: String,
) -> (StatusCode, Json<serde_json::Value>) {
    let Ok(event) = serde_json::from_str::<StripeWebhookEvent>(&body) else {
        log::warn!("Stripe webhook: unparseable body, ignoring");
        return ok();
    };
    let event_type = event.event_type.clone();
    let Some(intent_id) = event.payment_intent_id() else {
        log::info!("Stripe webhook: event '{event_type}' names no PaymentIntent, ignoring");
        return ok();
    };

    let located = match event.reference() {
        Some(reference) => {
            CardPaymentGateway::attempt_by_reference(state.conn.as_ref(), &reference).await
        }
        None => {
            CardPaymentGateway::attempt_by_provider_transaction(state.conn.as_ref(), &intent_id)
                .await
        }
    };
    let attempt = match located {
        Ok(Some(attempt)) => attempt,
        Ok(None) => {
            log::info!("Stripe webhook: event '{event_type}' references no known attempt, ignoring");
            return ok();
        }
        Err(_) => {
            log::error!("Stripe webhook: attempt lookup failed");
            return ok();
        }
    };

    let resolver = DatabasePaymentSecretResolver::new(state.conn.clone(), state.payment_keys.clone());
    let Ok(Some(merchant)) =
        CardPaymentGateway::merchant_by_id(state.conn.as_ref(), attempt.tenant_id, attempt.merchant_id)
            .await
    else {
        log::error!("Stripe webhook: merchant unavailable for the referenced attempt");
        return ok();
    };
    if Provider::parse(&merchant.provider) != Some(Provider::Stripe) {
        log::warn!("Stripe webhook: referenced attempt was not made through Stripe, ignoring");
        return ok();
    }

    let Ok(signing_secret) = resolver.stripe_webhook_secret(merchant.id) else {
        log::error!("Stripe webhook: no signing secret configured for this merchant");
        return ok();
    };
    let presented = headers
        .get(STRIPE_SIGNATURE_HEADER)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();
    if !verify_webhook_signature(
        presented,
        &body,
        signing_secret.as_str(),
        chrono::Utc::now().timestamp(),
    ) {
        log::warn!("Stripe webhook: rejected a callback with an invalid signature");
        return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"received": false})),
        );
    }

    // The attempt must already be bound to this PaymentIntent
    if attempt.provider_transaction_id.as_deref() != Some(intent_id.as_str()) {
        log::warn!("Stripe webhook: event '{event_type}' names a different PaymentIntent, ignoring");
        return ok();
    }

    let Ok(processor) = psp_client_for(&merchant, Provider::Stripe, &resolver) else {
        log::error!("Stripe webhook: processor unavailable");
        return ok();
    };
    let state_now = match processor.charge_status(&intent_id).await {
        Ok(state_now) => state_now,
        Err(_) => {
            log::warn!("Stripe webhook: could not read the PaymentIntent back, will retry");
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
            log::error!(
                "Stripe webhook: event '{}' settlement refused: {}",
                event_type,
                error.message
            );
            ok()
        }
    }
}

fn ok() -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::OK, Json(serde_json::json!({"received": true})))
}
