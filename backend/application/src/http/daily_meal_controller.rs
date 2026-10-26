use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::daily_meal_json::DailyMealJson;
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::infrastructure::mapper::{DailyMealMapper, Mapper};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::Json;
use business::gateway::daily_meal_gateway::DailyMealGateway;
use business::use_cases::daily_meal_use_case::DailyMealUseCase;

#[utoipa::path(
    post,
    tag = "DailyMeal",
    path = "/daily-meal",
    request_body = DailyMealJson,
    responses(
        (status = 201, description = "DailyMeal created", body = DailyMealJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn add(state: State<AppState>,Extension(locale): Extension<Locale>,Json(payload): Json<DailyMealJson>) -> HttpResponse<(StatusCode, Json<DailyMealJson>)> {
    let domain = DailyMealMapper::domain(payload);
    let use_case = DailyMealUseCase::new(DailyMealGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(DailyMealMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "DailyMeal",
    path = "/daily-meal/{id}",
    params(
        ("id" = i32, Path, description = "DailyMeal ID")
    ),
    responses(
        (status = 200, description = "DailyMeal found", body = DailyMealJson),
        (status = 404, description = "DailyMeal not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_by_id(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Path(id): Path<i32>,
) -> HttpResponse<Json<DailyMealJson>> {
    let use_case = DailyMealUseCase::new(DailyMealGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_id(id).await {
        Ok(res) => Ok(Json(DailyMealMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "DailyMeal",
    path = "/daily-meal/uuid/{uuid}",
    params(
        ("uuid" = String, Path, description = "DailyMeal UUID")
    ),
    responses(
        (status = 200, description = "DailyMeal found", body = DailyMealJson),
        (status = 404, description = "DailyMeal not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_by_uuid(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Path(uuid): Path<String>,
) -> HttpResponse<Json<DailyMealJson>> {
    let use_case = DailyMealUseCase::new(DailyMealGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_uuid(uuid).await {
        Ok(res) => Ok(Json(DailyMealMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "DailyMeal",
    path = "/daily-meal",
    responses(
        (status = 200, description = "List of daily meals", body = Vec<DailyMealJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<DailyMealJson>>> {
    let use_case = DailyMealUseCase::new(DailyMealGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all().await {
        Ok(list) => Ok(Json(DailyMealMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    put,
    tag = "DailyMeal",
    path = "/daily-meal/{id}",
    params(
        ("id" = i32, Path, description = "DailyMeal ID")
    ),
    request_body = DailyMealJson,
    responses(
        (status = 200, description = "DailyMeal updated", body = DailyMealJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 404, description = "DailyMeal not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn update(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Path(id): Path<i32>,
    Json(payload): Json<DailyMealJson>,
) -> HttpResponse<Json<DailyMealJson>> {
    let domain = DailyMealMapper::domain(payload);
    let use_case = DailyMealUseCase::new(DailyMealGateway::new(state.conn.as_ref().clone()));
    match use_case.update(id, domain).await {
        Ok(res) => Ok(Json(DailyMealMapper::json(res))),
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
