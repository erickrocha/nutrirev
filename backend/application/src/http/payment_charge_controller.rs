use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::payment_charge_json::{
    PaymentChargeJson, PrepareChargePaymentJson, PreparedAttemptJson,
};
use crate::http::json::payment_reversal_json::PaymentReversalJson;
use crate::infrastructure::mapper::PaymentChargeJsonMapper;
use crate::AppState;
use axum::extract::{Extension, Path, Query, State};
use axum::Json;
use business::domain::card_payment::{PaymentMethod, PrepareCardPayment};
use business::domain::user::User;
use business::use_cases::card_payment_use_case::CardPaymentUseCase;
use business::use_cases::payment_schedule_use_case::PaymentScheduleUseCase;
use serde::Deserialize;
use utoipa::IntoParams;

#[derive(Deserialize, IntoParams)]
#[serde(rename_all = "camelCase")]
pub struct ChargeListQuery {
    /// Which customer to list. Required for clinic staff; ignored for a
    /// customer, who only ever sees their own charges.
    pub customer_id: Option<i32>,
}

#[utoipa::path(
    get,
    tag = "PaymentCharges",
    path = "/v1/payments/charges",
    params(ChargeListQuery),
    responses(
        (status = 200, description = "Charges visible to the caller", body = [PaymentChargeJson]),
        (status = 400, description = "Bad request"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Charge access denied")
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_charges(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Query(query): Query<ChargeListQuery>,
) -> HttpResponse<Json<Vec<PaymentChargeJson>>> {
    let charges = PaymentScheduleUseCase::list_charges(&state.conn, &user, query.customer_id)
        .await
        .map_err(|error| map_error(locale, &error.message))?;
    Ok(Json(PaymentChargeJsonMapper::json_vec(charges)))
}

#[utoipa::path(
    post,
    tag = "PaymentCharges",
    path = "/v1/payments/charges/{charge_id}/prepare",
    params(("charge_id" = i32, Path, description = "Charge to reserve an attempt against")),
    request_body = PrepareChargePaymentJson,
    responses(
        (status = 200, description = "Attempt reserved", body = PreparedAttemptJson),
        (status = 400, description = "Charge is not payable"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Charge access denied")
    ),
    security(("bearer_auth" = []))
)]
pub async fn prepare_charge(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Path(charge_id): Path<i32>,
    Json(payload): Json<PrepareChargePaymentJson>,
) -> HttpResponse<Json<PreparedAttemptJson>> {
    // A clinic scope is not proof of access to this patient's billing, so the
    // charge is re-read through the same authorization the listing uses before
    // anything is reserved against it.
    let owned = PaymentScheduleUseCase::can_access_charge(&state.conn, &user, charge_id)
        .await
        .map_err(|_| ExceptionResponse::Forbidden(locale, ErrorKey::PaymentChargeForbidden))?;
    if !owned {
        return Err(ExceptionResponse::Forbidden(
            locale,
            ErrorKey::PaymentChargeForbidden,
        ));
    }

    let Some(method) = PaymentMethod::parse(&payload.method) else {
        return Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        ));
    };

    let attempt = CardPaymentUseCase::prepare(
        &state.conn,
        PrepareCardPayment {
            charge_id,
            idempotency_key: payload.idempotency_key,
            method,
            installments: payload.installments,
        },
    )
    .await
    .map_err(|error| map_error(locale, &error.message))?;

    Ok(Json(PreparedAttemptJson {
        attempt_id: attempt.id,
        charge_id: attempt.charge_id,
        status: attempt.status,
        reference: attempt.reference,
        method: attempt.method,
        installments: attempt.installments,
        amount_cents: attempt.amount_cents,
        currency: attempt.currency,
    }))
}

#[utoipa::path(
    get,
    tag = "PaymentCharges",
    path = "/v1/payments/reversals",
    responses(
        (status = 200, description = "Payments that were reversed", body = [PaymentReversalJson]),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Clinic staff only")
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_reversals(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
) -> HttpResponse<Json<Vec<PaymentReversalJson>>> {
    let reversals = PaymentScheduleUseCase::list_reversals(&state.conn, &user, 100)
        .await
        .map_err(|error| map_error(locale, &error.message))?;

    Ok(Json(
        reversals
            .into_iter()
            .map(|row| PaymentReversalJson {
                attempt_id: row.attempt_id,
                charge_id: row.charge_id,
                customer_id: row.customer_id,
                customer_name: row.customer_name,
                amount_cents: row.amount_cents,
                method: row.method,
                reversed_at: row.reversed_at.to_rfc3339(),
                charge_status: row.charge_status,
                due_date: row.due_date.to_string(),
            })
            .collect(),
    ))
}

fn map_error(locale: Locale, message: &str) -> ExceptionResponse {
    match message {
        "Forbidden" => ExceptionResponse::Forbidden(locale, ErrorKey::PaymentChargeForbidden),
        "Charge not found" | "Customer not found" => {
            ExceptionResponse::NotFound(locale, ErrorKey::PaymentChargeNotFound)
        }
        _ => ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue),
    }
}
