//! The patient's own door onto automatic billing.
//!
//! The clinic-facing `/payment-date` routes are staff-only, and deliberately so:
//! before that was fixed, any authenticated patient could rewrite another
//! patient's subscription. These routes are the narrow replacement — they resolve
//! the subscription through `customer.user_id`, so a patient reaches theirs and
//! nothing else, and they can change only how it is paid. Dates, amount and cycle
//! stay with the clinic.

use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::recurring_payment_json::{
    SaveCardJson, SavedCardJson, SubscriptionBillingJson,
};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::HeaderMap;
use axum::Json;
use business::domain::card_payment::PaymentScope;
use business::domain::card_submission::SensitiveCardData;
use business::domain::card_token::TokenHolder;
use business::domain::user::User;
use business::gateway::asaas_processor::AsaasProcessor;
use business::gateway::payment_provider_factory::{active_connection, asaas_client};
use business::gateway::payment_secret_resolver::EnvironmentPaymentSecretResolver;
use business::use_cases::card_on_file_use_case::{
    subscription_owned_by_user, CardOnFileUseCase,
};
use business::use_cases::pix_payment_use_case::{
    ensure_provider_customer, provider_environment,
};

#[utoipa::path(
    post,
    tag = "RecurringPayments",
    path = "/v1/payments/subscriptions/{subscription_id}/card",
    params(("subscription_id" = i32, Path, description = "The caller's own subscription")),
    request_body = SaveCardJson,
    responses(
        (status = 200, description = "Automatic billing enabled", body = SubscriptionBillingJson),
        (status = 400, description = "Card or document rejected"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Subscription access denied")
    ),
    security(("bearer_auth" = []))
)]
pub async fn enable_recurring(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    headers: HeaderMap,
    Path(subscription_id): Path<i32>,
    Json(payload): Json<SaveCardJson>,
) -> HttpResponse<Json<SubscriptionBillingJson>> {
    let (tenant_id, subscription) =
        own_subscription(&state, &user, locale, subscription_id).await?;
    let customer_id = subscription
        .customer_id
        .ok_or(ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue))?;

    let card = SensitiveCardData::new(
        payload.card_number,
        payload.security_code,
        payload.expiration_month,
        payload.expiration_year,
        payload.cardholder_name,
    )
    .map_err(|_| ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue))?;

    let remote_ip = client_ip(&headers);
    let processor = provider_for(&state, tenant_id, locale).await?;
    let provider_customer_id = ensure_provider_customer(
        &state.conn,
        tenant_id,
        customer_id,
        remote_ip.clone(),
        payload.tax_id.as_deref(),
        &processor,
    )
    .await
    .map_err(|error| map_error(locale, &error.message))?;

    let customer = entity::customer_entity::Entity::find_by_id(customer_id)
        .one(state.conn.as_ref())
        .await
        .map_err(|_| ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue))?
        .ok_or(ExceptionResponse::NotFound(locale, ErrorKey::PaymentChargeNotFound))?;
    let tax_id = customer
        .tax_id
        .clone()
        .filter(|value| !value.is_empty())
        .ok_or(ExceptionResponse::BadRequest(locale, ErrorKey::PaymentTaxIdRequired))?;

    let holder = TokenHolder {
        provider_customer_id,
        name: customer.name.clone(),
        email: customer.email.clone(),
        tax_id,
        postal_code: customer.postal_code.clone(),
        address_number: None,
        phone: Some(customer.phone.clone()),
        remote_ip,
    };

    let saved = CardOnFileUseCase::enable_for_subscription(
        &state.conn,
        tenant_id,
        subscription_id,
        &card,
        &holder,
        &processor,
    )
    .await
    .map_err(|error| map_error(locale, &error.message))?;

    Ok(Json(SubscriptionBillingJson {
        subscription_id,
        billing_mode: "card_on_file".into(),
        card: Some(SavedCardJson {
            brand: saved.brand,
            last4: saved.last4,
            consented_at: saved.consent_at.to_rfc3339(),
        }),
    }))
}

#[utoipa::path(
    delete,
    tag = "RecurringPayments",
    path = "/v1/payments/subscriptions/{subscription_id}/card",
    params(("subscription_id" = i32, Path, description = "The caller's own subscription")),
    responses(
        (status = 200, description = "Automatic billing disabled", body = SubscriptionBillingJson),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Subscription access denied")
    ),
    security(("bearer_auth" = []))
)]
pub async fn disable_recurring(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Path(subscription_id): Path<i32>,
) -> HttpResponse<Json<SubscriptionBillingJson>> {
    let (tenant_id, _) = own_subscription(&state, &user, locale, subscription_id).await?;

    CardOnFileUseCase::disable_for_subscription(&state.conn, tenant_id, subscription_id)
        .await
        .map_err(|error| map_error(locale, &error.message))?;

    Ok(Json(SubscriptionBillingJson {
        subscription_id,
        billing_mode: "manual".into(),
        card: None,
    }))
}

#[utoipa::path(
    get,
    tag = "RecurringPayments",
    path = "/v1/payments/subscriptions/{subscription_id}/billing",
    params(("subscription_id" = i32, Path, description = "The caller's own subscription")),
    responses(
        (status = 200, description = "How this subscription is paid", body = SubscriptionBillingJson),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Subscription access denied")
    ),
    security(("bearer_auth" = []))
)]
pub async fn billing_mode(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Path(subscription_id): Path<i32>,
) -> HttpResponse<Json<SubscriptionBillingJson>> {
    let (tenant_id, subscription) =
        own_subscription(&state, &user, locale, subscription_id).await?;

    let card = match subscription.payment_token_id {
        Some(token_id) => entity::payment_token_entity::Entity::find_by_id(token_id)
            .filter(entity::payment_token_entity::Column::TenantId.eq(tenant_id))
            .one(state.conn.as_ref())
            .await
            .map_err(|_| ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue))?
            .filter(|token| token.status == "active")
            .map(|token| SavedCardJson {
                brand: token.brand,
                last4: token.last4,
                consented_at: token.consent_at.to_rfc3339(),
            }),
        None => None,
    };

    Ok(Json(SubscriptionBillingJson {
        subscription_id,
        billing_mode: subscription.billing_mode,
        card,
    }))
}

async fn own_subscription(
    state: &AppState,
    user: &User,
    locale: Locale,
    subscription_id: i32,
) -> Result<(i32, entity::payment_date_entity::Model), ExceptionResponse> {
    let scope = PaymentScope::from_current_user()
        .map_err(|_| ExceptionResponse::Forbidden(locale, ErrorKey::PaymentChargeForbidden))?;
    let user_id = user
        .id
        .filter(|id| *id > 0)
        .ok_or(ExceptionResponse::Forbidden(locale, ErrorKey::PaymentChargeForbidden))?;
    let subscription = subscription_owned_by_user(
        &state.conn,
        scope.tenant_id(),
        user_id,
        subscription_id,
    )
    .await
    .map_err(|_| ExceptionResponse::Forbidden(locale, ErrorKey::PaymentChargeForbidden))?
    .ok_or(ExceptionResponse::Forbidden(
        locale,
        ErrorKey::PaymentChargeForbidden,
    ))?;
    Ok((scope.tenant_id(), subscription))
}

async fn provider_for(
    state: &AppState,
    tenant_id: i32,
    locale: Locale,
) -> Result<AsaasProcessor, ExceptionResponse> {
    let connection = active_connection(
        state.conn.as_ref(),
        tenant_id,
        &provider_environment(),
    )
    .await
    .map_err(|_| ExceptionResponse::BadRequest(locale, ErrorKey::PaymentProviderUnavailable))?;
    if !connection.capabilities.recurring {
        // Refused here rather than at the provider: the clinic either switched
        // recurring off or moved to an acquirer that cannot store cards, and
        // either way the patient should be told now, not after typing a card.
        return Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::PaymentMethodUnavailable,
        ));
    }
    asaas_client(&connection, &EnvironmentPaymentSecretResolver)
        .map_err(|_| ExceptionResponse::BadRequest(locale, ErrorKey::PaymentProviderUnavailable))
}

/// The cardholder's IP, forwarded to the provider and stored as consent
/// evidence. Advisory: it is never used for an authorization decision here.
fn client_ip(headers: &HeaderMap) -> String {
    headers
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(',').next())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("0.0.0.0")
        .to_owned()
}

fn map_error(locale: Locale, message: &str) -> ExceptionResponse {
    match message {
        "Tax id is required" | "Tax id is not valid" => {
            ExceptionResponse::BadRequest(locale, ErrorKey::PaymentTaxIdRequired)
        }
        "Subscription not found" => {
            ExceptionResponse::NotFound(locale, ErrorKey::PaymentChargeNotFound)
        }
        "Payment provider is unavailable" => {
            ExceptionResponse::BadRequest(locale, ErrorKey::PaymentProviderUnavailable)
        }
        _ => ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue),
    }
}

use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
