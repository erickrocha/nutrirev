use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::http::json::payment_date_json::PaymentDateJson;
use crate::infrastructure::mapper::{Mapper, PaymentDateMapper};
use crate::AppState;
use axum::extract::{Extension, Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use business::domain::enums::Role;
use business::domain::user::User;
use business::gateway::payment_date_gateway::PaymentDateGateway;
use business::use_cases::payment_date_use_case::PaymentDateUseCase;
use serde::Deserialize;

/// A subscription drives real billing, so only clinic staff may read or write one.
/// A patient reaches their own subscription through the dedicated billing-mode route,
/// never through this collection: a tenant scope is not proof of access to every customer.
fn check_role_permission(role: &Role) -> bool {
    matches!(role, Role::TenantOwner | Role::TenantUser | Role::SysAdmin)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentDateListQuery {
    pub customer_id: Option<i32>,
}

#[utoipa::path(
    post,
    tag = "PaymentDate",
    path = "/payment-date",
    request_body = PaymentDateJson,
    responses(
        (status = 201, description = "PaymentDate created", body = PaymentDateJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn add(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(current_user): Extension<User>,
    Json(payload): Json<PaymentDateJson>,
) -> HttpResponse<(StatusCode, Json<PaymentDateJson>)> {
    if !check_role_permission(&current_user.role) {
        return Err(ExceptionResponse::Forbidden(
            locale,
            ErrorKey::RequiredHeaderValueMissing,
        ));
    }

    let domain = PaymentDateMapper::domain(payload);
    let use_case = PaymentDateUseCase::new(PaymentDateGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(PaymentDateMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "PaymentDate",
    path = "/payment-date/{id}",
    params(
        ("id" = i32, Path, description = "PaymentDate ID")
    ),
    responses(
        (status = 200, description = "PaymentDate found", body = PaymentDateJson),
        (status = 404, description = "PaymentDate not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_by_id(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(current_user): Extension<User>,
    Path(id): Path<i32>,
) -> HttpResponse<Json<PaymentDateJson>> {
    if !check_role_permission(&current_user.role) {
        return Err(ExceptionResponse::Forbidden(
            locale,
            ErrorKey::RequiredHeaderValueMissing,
        ));
    }

    let use_case = PaymentDateUseCase::new(PaymentDateGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_id(id).await {
        Ok(res) => Ok(Json(PaymentDateMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "PaymentDate",
    path = "/payment-date/uuid/{uuid}",
    params(
        ("uuid" = String, Path, description = "PaymentDate UUID")
    ),
    responses(
        (status = 200, description = "PaymentDate found", body = PaymentDateJson),
        (status = 404, description = "PaymentDate not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_by_uuid(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(current_user): Extension<User>,
    Path(uuid): Path<String>,
) -> HttpResponse<Json<PaymentDateJson>> {
    if !check_role_permission(&current_user.role) {
        return Err(ExceptionResponse::Forbidden(
            locale,
            ErrorKey::RequiredHeaderValueMissing,
        ));
    }

    let use_case = PaymentDateUseCase::new(PaymentDateGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_uuid(uuid).await {
        Ok(res) => Ok(Json(PaymentDateMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "PaymentDate",
    path = "/payment-date",
    params(
        ("customerId" = Option<i32>, Query, description = "Optional Filter by Customer ID")
    ),
    responses(
        (status = 200, description = "List of payment dates", body = Vec<PaymentDateJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(current_user): Extension<User>,
    Query(query): Query<PaymentDateListQuery>,
) -> HttpResponse<Json<Vec<PaymentDateJson>>> {
    if !check_role_permission(&current_user.role) {
        return Err(ExceptionResponse::Forbidden(
            locale,
            ErrorKey::RequiredHeaderValueMissing,
        ));
    }

    let use_case = PaymentDateUseCase::new(PaymentDateGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all(query.customer_id).await {
        Ok(list) => Ok(Json(PaymentDateMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    put,
    tag = "PaymentDate",
    path = "/payment-date/{id}",
    params(
        ("id" = i32, Path, description = "PaymentDate ID")
    ),
    request_body = PaymentDateJson,
    responses(
        (status = 200, description = "PaymentDate updated", body = PaymentDateJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 404, description = "PaymentDate not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn update(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(current_user): Extension<User>,
    Path(id): Path<i32>,
    Json(payload): Json<PaymentDateJson>,
) -> HttpResponse<Json<PaymentDateJson>> {
    if !check_role_permission(&current_user.role) {
        return Err(ExceptionResponse::Forbidden(
            locale,
            ErrorKey::RequiredHeaderValueMissing,
        ));
    }

    let domain = PaymentDateMapper::domain(payload);
    let use_case = PaymentDateUseCase::new(PaymentDateGateway::new(state.conn.as_ref().clone()));
    match use_case.update(id, domain).await {
        Ok(res) => Ok(Json(PaymentDateMapper::json(res))),
        Err(err) => {
            if err.message.contains("not found") {
                Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing))
            } else {
                Err(ExceptionResponse::BadRequest(
                    locale,
                    ErrorKey::InvalidParameterValue,
                ))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_clinic_staff_may_reach_subscriptions() {
        assert!(check_role_permission(&Role::TenantOwner));
        assert!(check_role_permission(&Role::TenantUser));
        assert!(check_role_permission(&Role::SysAdmin));
        // The regression this guards: every handler here used to take no user at
        // all, so a patient could read and rewrite another patient's subscription
        // as long as they shared a clinic.
        assert!(!check_role_permission(&Role::User));
    }
}
