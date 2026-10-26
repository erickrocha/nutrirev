use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::customer_daily_meal_json::CustomerDailyMealJson;
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, UnauthorizedErrorJson,
};
use crate::infrastructure::mapper::{CustomerDailyMealMapper, Mapper};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::Json;
use business::gateway::customer_daily_meal_gateway::CustomerDailyMealGateway;
use business::use_cases::customer_daily_meal_use_case::CustomerDailyMealUseCase;

#[utoipa::path(
    post,
    tag = "CustomerDailyMeal",
    path = "/customer-daily-meal",
    request_body = CustomerDailyMealJson,
    responses(
        (status = 201, description = "CustomerDailyMeal created", body = CustomerDailyMealJson),
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
    Json(payload): Json<CustomerDailyMealJson>,
) -> HttpResponse<(StatusCode, Json<CustomerDailyMealJson>)> {
    let domain = CustomerDailyMealMapper::domain(payload);
    let use_case = CustomerDailyMealUseCase::new(CustomerDailyMealGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(CustomerDailyMealMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "CustomerDailyMeal",
    path = "/customer-daily-meal/customer/{customer_id}",
    params(
        ("customer_id" = i32, Path, description = "Customer ID")
    ),
    responses(
        (status = 200, description = "List of daily meals for customer", body = Vec<CustomerDailyMealJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_by_customer_id(
    state: State<AppState>,
    Path(customer_id): Path<i32>,
) -> HttpResponse<Json<Vec<CustomerDailyMealJson>>> {
    let use_case = CustomerDailyMealUseCase::new(CustomerDailyMealGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_customer_id(customer_id).await {
        Ok(list) => Ok(Json(CustomerDailyMealMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    get,
    tag = "CustomerDailyMeal",
    path = "/customer-daily-meal",
    responses(
        (status = 200, description = "List of all customer daily meals", body = Vec<CustomerDailyMealJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<CustomerDailyMealJson>>> {
    let use_case = CustomerDailyMealUseCase::new(CustomerDailyMealGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all().await {
        Ok(list) => Ok(Json(CustomerDailyMealMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    delete,
    tag = "CustomerDailyMeal",
    path = "/customer-daily-meal/customer/{customer_id}/meal/{daily_meal_id}",
    params(
        ("customer_id" = i32, Path, description = "Customer ID"),
        ("daily_meal_id" = i32, Path, description = "Daily Meal ID")
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
    Path((customer_id, daily_meal_id)): Path<(i32, i32)>,
) -> HttpResponse<StatusCode> {
    let use_case = CustomerDailyMealUseCase::new(CustomerDailyMealGateway::new(state.conn.as_ref().clone()));
    match use_case.delete(customer_id, daily_meal_id).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}
