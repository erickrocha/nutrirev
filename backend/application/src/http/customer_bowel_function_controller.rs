use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::customer_bowel_function_json::CustomerBowelFunctionJson;
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, UnauthorizedErrorJson,
};
use crate::infrastructure::mapper::{CustomerBowelFunctionMapper, Mapper};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::Json;
use business::gateway::customer_bowel_function_gateway::CustomerBowelFunctionGateway;
use business::use_cases::customer_bowel_function_use_case::CustomerBowelFunctionUseCase;

#[utoipa::path(
    post,
    tag = "CustomerBowelFunction",
    path = "/customer-bowel-function",
    request_body = CustomerBowelFunctionJson,
    responses(
        (status = 201, description = "CustomerBowelFunction created", body = CustomerBowelFunctionJson),
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
    Json(payload): Json<CustomerBowelFunctionJson>,
) -> HttpResponse<(StatusCode, Json<CustomerBowelFunctionJson>)> {
    let domain = CustomerBowelFunctionMapper::domain(payload);
    let use_case = CustomerBowelFunctionUseCase::new(CustomerBowelFunctionGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(CustomerBowelFunctionMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "CustomerBowelFunction",
    path = "/customer-bowel-function/customer/{customer_id}",
    params(
        ("customer_id" = i32, Path, description = "Customer ID")
    ),
    responses(
        (status = 200, description = "List of bowel functions for customer", body = Vec<CustomerBowelFunctionJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_by_customer_id(
    state: State<AppState>,
    Path(customer_id): Path<i32>,
) -> HttpResponse<Json<Vec<CustomerBowelFunctionJson>>> {
    let use_case = CustomerBowelFunctionUseCase::new(CustomerBowelFunctionGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_customer_id(customer_id).await {
        Ok(list) => Ok(Json(CustomerBowelFunctionMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    get,
    tag = "CustomerBowelFunction",
    path = "/customer-bowel-function",
    responses(
        (status = 200, description = "List of all customer bowel functions", body = Vec<CustomerBowelFunctionJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<CustomerBowelFunctionJson>>> {
    let use_case = CustomerBowelFunctionUseCase::new(CustomerBowelFunctionGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all().await {
        Ok(list) => Ok(Json(CustomerBowelFunctionMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    delete,
    tag = "CustomerBowelFunction",
    path = "/customer-bowel-function/customer/{customer_id}/function/{bowel_function_id}",
    params(
        ("customer_id" = i32, Path, description = "Customer ID"),
        ("bowel_function_id" = i32, Path, description = "Bowel Function ID")
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
    Path((customer_id, bowel_function_id)): Path<(i32, i32)>,
) -> HttpResponse<StatusCode> {
    let use_case = CustomerBowelFunctionUseCase::new(CustomerBowelFunctionGateway::new(state.conn.as_ref().clone()));
    match use_case.delete(customer_id, bowel_function_id).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}
