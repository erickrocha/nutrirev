use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::customer_dietary_restriction_json::CustomerDietaryRestrictionJson;
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, UnauthorizedErrorJson,
};
use crate::infrastructure::mapper::{CustomerDietaryRestrictionMapper, Mapper};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::Json;
use business::gateway::customer_dietary_restriction_gateway::CustomerDietaryRestrictionGateway;
use business::use_cases::customer_dietary_restriction_use_case::CustomerDietaryRestrictionUseCase;

#[utoipa::path(
    post,
    tag = "CustomerDietaryRestriction",
    path = "/customer-dietary-restriction",
    request_body = CustomerDietaryRestrictionJson,
    responses(
        (status = 201, description = "CustomerDietaryRestriction created", body = CustomerDietaryRestrictionJson),
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
    Json(payload): Json<CustomerDietaryRestrictionJson>,
) -> HttpResponse<(StatusCode, Json<CustomerDietaryRestrictionJson>)> {
    let domain = CustomerDietaryRestrictionMapper::domain(payload);
    let use_case = CustomerDietaryRestrictionUseCase::new(CustomerDietaryRestrictionGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(CustomerDietaryRestrictionMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "CustomerDietaryRestriction",
    path = "/customer-dietary-restriction/customer/{customer_id}",
    params(
        ("customer_id" = i32, Path, description = "Customer ID")
    ),
    responses(
        (status = 200, description = "List of dietary restrictions for customer", body = Vec<CustomerDietaryRestrictionJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_by_customer_id(
    state: State<AppState>,
    Path(customer_id): Path<i32>,
) -> HttpResponse<Json<Vec<CustomerDietaryRestrictionJson>>> {
    let use_case = CustomerDietaryRestrictionUseCase::new(CustomerDietaryRestrictionGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_customer_id(customer_id).await {
        Ok(list) => Ok(Json(CustomerDietaryRestrictionMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    get,
    tag = "CustomerDietaryRestriction",
    path = "/customer-dietary-restriction",
    responses(
        (status = 200, description = "List of all customer dietary restrictions", body = Vec<CustomerDietaryRestrictionJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<CustomerDietaryRestrictionJson>>> {
    let use_case = CustomerDietaryRestrictionUseCase::new(CustomerDietaryRestrictionGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all().await {
        Ok(list) => Ok(Json(CustomerDietaryRestrictionMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    delete,
    tag = "CustomerDietaryRestriction",
    path = "/customer-dietary-restriction/customer/{customer_id}/restriction/{dietary_restriction_id}",
    params(
        ("customer_id" = i32, Path, description = "Customer ID"),
        ("dietary_restriction_id" = i32, Path, description = "Dietary Restriction ID")
    ),
    responses(
        (status = 204, description = "Deleted successfully"),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn delete(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Path((customer_id, dietary_restriction_id)): Path<(i32, i32)>,
) -> HttpResponse<StatusCode> {
    let use_case = CustomerDietaryRestrictionUseCase::new(CustomerDietaryRestrictionGateway::new(state.conn.as_ref().clone()));
    match use_case.delete(customer_id, dietary_restriction_id).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}
