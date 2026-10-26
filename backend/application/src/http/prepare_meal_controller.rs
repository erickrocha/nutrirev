use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::http::json::prepare_meal_json::PrepareMealJson;
use crate::infrastructure::mapper::{Mapper, PrepareMealMapper};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::Json;
use business::gateway::prepare_meal_gateway::PrepareMealGateway;
use business::use_cases::prepare_meal_use_case::PrepareMealUseCase;

#[utoipa::path(
    post,
    tag = "PrepareMeal",
    path = "/prepare-meal",
    request_body = PrepareMealJson,
    responses(
        (status = 201, description = "PrepareMeal created", body = PrepareMealJson),
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
    Json(payload): Json<PrepareMealJson>,
) -> HttpResponse<(StatusCode, Json<PrepareMealJson>)> {
    let domain = PrepareMealMapper::domain(payload);
    let use_case = PrepareMealUseCase::new(PrepareMealGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(PrepareMealMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "PrepareMeal",
    path = "/prepare-meal/{id}",
    params(
        ("id" = i32, Path, description = "PrepareMeal ID")
    ),
    responses(
        (status = 200, description = "PrepareMeal found", body = PrepareMealJson),
        (status = 404, description = "PrepareMeal not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<PrepareMealJson>> {
    let use_case = PrepareMealUseCase::new(PrepareMealGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_id(id).await {
        Ok(res) => Ok(Json(PrepareMealMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "PrepareMeal",
    path = "/prepare-meal/uuid/{uuid}",
    params(
        ("uuid" = String, Path, description = "PrepareMeal UUID")
    ),
    responses(
        (status = 200, description = "PrepareMeal found", body = PrepareMealJson),
        (status = 404, description = "PrepareMeal not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<PrepareMealJson>> {
    let use_case = PrepareMealUseCase::new(PrepareMealGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_uuid(uuid).await {
        Ok(res) => Ok(Json(PrepareMealMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "PrepareMeal",
    path = "/prepare-meal",
    responses(
        (status = 200, description = "List of prepare meals", body = Vec<PrepareMealJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<PrepareMealJson>>> {
    let use_case = PrepareMealUseCase::new(PrepareMealGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all().await {
        Ok(list) => Ok(Json(PrepareMealMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    put,
    tag = "PrepareMeal",
    path = "/prepare-meal/{id}",
    params(
        ("id" = i32, Path, description = "PrepareMeal ID")
    ),
    request_body = PrepareMealJson,
    responses(
        (status = 200, description = "PrepareMeal updated", body = PrepareMealJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 404, description = "PrepareMeal not found", body = NotFoundErrorJson),
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
    Json(payload): Json<PrepareMealJson>,
) -> HttpResponse<Json<PrepareMealJson>> {
    let domain = PrepareMealMapper::domain(payload);
    let use_case = PrepareMealUseCase::new(PrepareMealGateway::new(state.conn.as_ref().clone()));
    match use_case.update(id, domain).await {
        Ok(res) => Ok(Json(PrepareMealMapper::json(res))),
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
