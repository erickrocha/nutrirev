use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::customer_pre_existing_conditions_json::CustomerPreExistingConditionsJson;
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, UnauthorizedErrorJson,
};
use crate::infrastructure::mapper::{CustomerPreExistingConditionsMapper, Mapper};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::Json;
use business::gateway::customer_pre_existing_conditions_gateway::CustomerPreExistingConditionsGateway;
use business::use_cases::customer_pre_existing_conditions_use_case::CustomerPreExistingConditionsUseCase;

#[utoipa::path(
    post,
    tag = "CustomerPreExistingConditions",
    path = "/customer-pre-existing-conditions",
    request_body = CustomerPreExistingConditionsJson,
    responses(
        (status = 201, description = "CustomerPreExistingConditions created", body = CustomerPreExistingConditionsJson),
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
    Json(payload): Json<CustomerPreExistingConditionsJson>,
) -> HttpResponse<(StatusCode, Json<CustomerPreExistingConditionsJson>)> {
    let domain = CustomerPreExistingConditionsMapper::domain(payload);
    let use_case = CustomerPreExistingConditionsUseCase::new(CustomerPreExistingConditionsGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(CustomerPreExistingConditionsMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "CustomerPreExistingConditions",
    path = "/customer-pre-existing-conditions/customer/{customer_id}",
    params(
        ("customer_id" = i32, Path, description = "Customer ID")
    ),
    responses(
        (status = 200, description = "List of pre existing conditions for customer", body = Vec<CustomerPreExistingConditionsJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_by_customer_id(
    state: State<AppState>,
    Path(customer_id): Path<i32>,
) -> HttpResponse<Json<Vec<CustomerPreExistingConditionsJson>>> {
    let use_case = CustomerPreExistingConditionsUseCase::new(CustomerPreExistingConditionsGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_customer_id(customer_id).await {
        Ok(list) => Ok(Json(CustomerPreExistingConditionsMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    get,
    tag = "CustomerPreExistingConditions",
    path = "/customer-pre-existing-conditions",
    responses(
        (status = 200, description = "List of all customer pre existing conditions", body = Vec<CustomerPreExistingConditionsJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<CustomerPreExistingConditionsJson>>> {
    let use_case = CustomerPreExistingConditionsUseCase::new(CustomerPreExistingConditionsGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all().await {
        Ok(list) => Ok(Json(CustomerPreExistingConditionsMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    delete,
    tag = "CustomerPreExistingConditions",
    path = "/customer-pre-existing-conditions/customer/{customer_id}/condition/{pre_existing_conditions_id}",
    params(
        ("customer_id" = i32, Path, description = "Customer ID"),
        ("pre_existing_conditions_id" = i32, Path, description = "Pre Existing Conditions ID")
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
    Path((customer_id, pre_existing_conditions_id)): Path<(i32, i32)>,
) -> HttpResponse<StatusCode> {
    let use_case = CustomerPreExistingConditionsUseCase::new(CustomerPreExistingConditionsGateway::new(state.conn.as_ref().clone()));
    match use_case.delete(customer_id, pre_existing_conditions_id).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}
