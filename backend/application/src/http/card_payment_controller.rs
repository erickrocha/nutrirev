use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::card_payment_json::{AuthorizeCardPaymentJson, CardPaymentResultJson};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::HeaderMap;
use axum::Json;
use business::domain::card_submission::{AuthorizeCardPayment, SensitiveCardData};
use business::domain::user::User;
use business::gateway::payment_secret_resolver::EnvironmentPaymentSecretResolver;
use business::use_cases::card_payment_use_case::CardPaymentUseCase;

#[utoipa::path(
    post,
    tag = "CardPayments",
    path = "/v1/card-payments/{attempt_id}/authorize",
    params(("attempt_id" = i32, Path, description = "Prepared payment attempt")),
    request_body = AuthorizeCardPaymentJson,
    responses(
        (status = 200, description = "Authorization outcome", body = CardPaymentResultJson),
        (status = 400, description = "Invalid or unavailable payment"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Charge access denied")
    ),
    security(("bearer_auth" = []))
)]
pub async fn authorize(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    headers: HeaderMap,
    Path(attempt_id): Path<i32>,
    Json(payload): Json<AuthorizeCardPaymentJson>,
) -> HttpResponse<Json<CardPaymentResultJson>> {
    let card = SensitiveCardData::new(
        payload.card_number,
        payload.security_code,
        payload.expiration_month,
        payload.expiration_year,
        payload.cardholder_name,
    )
    .map_err(|_| ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue))?;
    let result = CardPaymentUseCase::authorize_with_clinic_acquirer(
        &state.conn,
        &user,
        AuthorizeCardPayment { attempt_id, card },
        client_ip(&headers),
        payload.tax_id.as_deref(),
        &EnvironmentPaymentSecretResolver,
    )
    .await
    .map_err(|error| match error.message.as_str() {
        "Forbidden" => ExceptionResponse::Forbidden(locale, ErrorKey::InvalidParameterValue),
        "Tax id is required" | "Tax id is not valid" => {
            ExceptionResponse::BadRequest(locale, ErrorKey::PaymentTaxIdRequired)
        }
        "No payment connection is enabled for this clinic"
        | "Payment processor is unavailable"
        | "Payment merchant credentials are unavailable" => {
            ExceptionResponse::BadRequest(locale, ErrorKey::PaymentProviderUnavailable)
        }
        _ => ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue),
    })?;
    Ok(Json(CardPaymentResultJson {
        attempt_id: result.id,
        status: result.status,
        reference: result.reference,
        amount_cents: result.amount_cents,
        currency: result.currency,
        last4: result.last4,
        brand: result.brand,
    }))
}

/// The cardholder's IP, forwarded to the provider for anti-fraud. Advisory: the
/// socket peer behind the load balancer is the proxy, not the customer, and this
/// is never used for an authorization decision here.
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
