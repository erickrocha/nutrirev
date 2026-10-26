use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::pix_payment_json::{
    AttemptStatusJson, CreatePixChargeJson, PixChargeJson,
};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::HeaderMap;
use axum::Json;
use business::domain::card_payment::PaymentScope;
use business::domain::user::User;
use business::gateway::card_payment_gateway::CardPaymentGateway;
use business::gateway::payment_secret_resolver::EnvironmentPaymentSecretResolver;
use business::use_cases::payment_schedule_use_case::PaymentScheduleUseCase;
use business::use_cases::pix_payment_use_case::{cancel_attempt, PixPaymentUseCase};

#[utoipa::path(
    post,
    tag = "PixPayments",
    path = "/v1/payments/charges/{charge_id}/pix",
    params(("charge_id" = i32, Path, description = "Charge to pay by Pix")),
    request_body = CreatePixChargeJson,
    responses(
        (status = 200, description = "Pix charge issued", body = PixChargeJson),
        (status = 400, description = "Charge is not payable"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Charge access denied")
    ),
    security(("bearer_auth" = []))
)]
pub async fn create_pix_charge(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    headers: HeaderMap,
    Path(charge_id): Path<i32>,
    Json(payload): Json<CreatePixChargeJson>,
) -> HttpResponse<Json<PixChargeJson>> {
    let scope = require_charge_access(&state, &user, locale, charge_id).await?;

    let issued = PixPaymentUseCase::issue_for_charge(
        &state.conn,
        scope,
        charge_id,
        payload.idempotency_key,
        client_ip(&headers),
        payload.tax_id.as_deref(),
        &EnvironmentPaymentSecretResolver,
    )
    .await
    .map_err(|error| map_error(locale, &error.message))?;

    Ok(Json(PixChargeJson {
        attempt_id: issued.attempt.id,
        charge_id: issued.attempt.charge_id,
        status: issued.attempt.status,
        amount_cents: issued.attempt.amount_cents,
        currency: issued.attempt.currency,
        payload: issued.payload,
        encoded_image: issued.encoded_image,
        expires_at: issued.attempt.pix_expires_at.map(|at| at.to_rfc3339()),
    }))
}

#[utoipa::path(
    get,
    tag = "PixPayments",
    path = "/v1/payments/attempts/{attempt_id}",
    params(("attempt_id" = i32, Path, description = "Attempt to read")),
    responses(
        (status = 200, description = "Attempt state", body = AttemptStatusJson),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Attempt access denied"),
        (status = 404, description = "Attempt not found")
    ),
    security(("bearer_auth" = []))
)]
pub async fn attempt_status(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Path(attempt_id): Path<i32>,
) -> HttpResponse<Json<AttemptStatusJson>> {
    let (attempt, _) = load_owned_attempt(&state, &user, locale, attempt_id).await?;
    let charge = business::use_cases::pix_payment_use_case::charge_of_attempt(
        &state.conn,
        attempt.tenant_id,
        attempt.charge_id,
    )
    .await
    .map_err(|error| map_error(locale, &error.message))?;

    Ok(Json(AttemptStatusJson {
        attempt_id: attempt.id,
        charge_id: attempt.charge_id,
        status: attempt.status,
        method: attempt.method,
        amount_cents: attempt.amount_cents,
        currency: attempt.currency,
        payload: attempt.pix_payload,
        expires_at: attempt.pix_expires_at.map(|at| at.to_rfc3339()),
        charge_paid: charge.is_some_and(|charge| charge.status == "paid"),
    }))
}

#[utoipa::path(
    post,
    tag = "PixPayments",
    path = "/v1/payments/attempts/{attempt_id}/cancel",
    params(("attempt_id" = i32, Path, description = "Attempt to release")),
    responses(
        (status = 200, description = "Attempt released", body = AttemptStatusJson),
        (status = 400, description = "Attempt can no longer be cancelled"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Attempt access denied")
    ),
    security(("bearer_auth" = []))
)]
pub async fn cancel(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Path(attempt_id): Path<i32>,
) -> HttpResponse<Json<AttemptStatusJson>> {
    let (attempt, _) = load_owned_attempt(&state, &user, locale, attempt_id).await?;
    let cancelled = cancel_attempt(&state.conn, attempt.tenant_id, attempt_id)
        .await
        .map_err(|error| map_error(locale, &error.message))?;

    Ok(Json(AttemptStatusJson {
        attempt_id: cancelled.id,
        charge_id: cancelled.charge_id,
        status: cancelled.status,
        method: cancelled.method,
        amount_cents: cancelled.amount_cents,
        currency: cancelled.currency,
        payload: None,
        expires_at: None,
        charge_paid: false,
    }))
}

/// The tenant this caller may act in, having proved access to the charge.
///
/// Reuses the listing's authorization rather than writing a second rule: a
/// clinic scope alone is not proof of access to a patient's billing.
async fn require_charge_access(
    state: &AppState,
    user: &User,
    locale: Locale,
    charge_id: i32,
) -> Result<i32, ExceptionResponse> {
    let scope = PaymentScope::from_current_user()
        .map_err(|_| ExceptionResponse::Forbidden(locale, ErrorKey::PaymentChargeForbidden))?;
    let owned = PaymentScheduleUseCase::can_access_charge(&state.conn, user, charge_id)
        .await
        .map_err(|_| ExceptionResponse::Forbidden(locale, ErrorKey::PaymentChargeForbidden))?;
    if !owned {
        return Err(ExceptionResponse::Forbidden(
            locale,
            ErrorKey::PaymentChargeForbidden,
        ));
    }
    Ok(scope.tenant_id())
}

/// An attempt the caller is allowed to see, authorized through its charge.
async fn load_owned_attempt(
    state: &AppState,
    user: &User,
    locale: Locale,
    attempt_id: i32,
) -> Result<(entity::payment_attempt_entity::Model, i32), ExceptionResponse> {
    let scope = PaymentScope::from_current_user()
        .map_err(|_| ExceptionResponse::Forbidden(locale, ErrorKey::PaymentChargeForbidden))?;
    let attempt = CardPaymentGateway::attempt_for_read(state.conn.as_ref(), scope.tenant_id(), attempt_id)
        .await
        .map_err(|_| ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue))?
        .ok_or(ExceptionResponse::NotFound(
            locale,
            ErrorKey::PaymentAttemptNotFound,
        ))?;
    let tenant_id = require_charge_access(state, user, locale, attempt.charge_id).await?;
    Ok((attempt, tenant_id))
}

/// The cardholder's IP, for the provider's anti-fraud checks.
///
/// Taken from `X-Forwarded-For` because the socket peer behind the platform load
/// balancer is the proxy, not the customer. The first hop is the client-claimed
/// address, so this is advisory data forwarded to the provider — it is never used
/// for an authorization decision here, and must not be.
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
        "Forbidden" => ExceptionResponse::Forbidden(locale, ErrorKey::PaymentChargeForbidden),
        "Tax id is required" | "Tax id is not valid" => {
            ExceptionResponse::BadRequest(locale, ErrorKey::PaymentTaxIdRequired)
        }
        "Payment attempt not found" => {
            ExceptionResponse::NotFound(locale, ErrorKey::PaymentAttemptNotFound)
        }
        "Charge not found" | "Customer not found" => {
            ExceptionResponse::NotFound(locale, ErrorKey::PaymentChargeNotFound)
        }
        "Payment provider is unavailable"
        | "Payment processor is unavailable"
        | "Pix charge could not be created"
        | "An enabled Asaas connection is required"
        | "Payment merchant credentials are unavailable" => {
            ExceptionResponse::BadRequest(locale, ErrorKey::PaymentProviderUnavailable)
        }
        _ => ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn takes_the_first_forwarded_hop_and_falls_back() {
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-for", "203.0.113.7, 10.0.0.1".parse().unwrap());
        assert_eq!(client_ip(&headers), "203.0.113.7");

        // No header at all still has to produce something the provider accepts,
        // rather than failing a payment over a missing anti-fraud hint.
        assert_eq!(client_ip(&HeaderMap::new()), "0.0.0.0");

        let mut blank = HeaderMap::new();
        blank.insert("x-forwarded-for", "".parse().unwrap());
        assert_eq!(client_ip(&blank), "0.0.0.0");
    }
}
