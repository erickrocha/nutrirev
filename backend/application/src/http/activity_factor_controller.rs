use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::activity_factor_json::ActivityFactorJson;
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::infrastructure::mapper::{ActivityFactorMapper, Mapper};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::Json;
use business::gateway::activity_factor_gateway::ActivityFactorGateway;
use business::use_cases::activity_factor_use_case::ActivityFactorUseCase;

#[utoipa::path(
    post,
    tag = "ActivityFactor",
    path = "/activity-factor",
    request_body = ActivityFactorJson,
    responses(
        (status = 201, description = "ActivityFactor created", body = ActivityFactorJson),
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
    Json(payload): Json<ActivityFactorJson>,
) -> HttpResponse<(StatusCode, Json<ActivityFactorJson>)> {
    let domain = ActivityFactorMapper::domain(payload);
    let use_case = ActivityFactorUseCase::new(ActivityFactorGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(ActivityFactorMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "ActivityFactor",
    path = "/activity-factor/{id}",
    params(
        ("id" = i32, Path, description = "ActivityFactor ID")
    ),
    responses(
        (status = 200, description = "ActivityFactor found", body = ActivityFactorJson),
        (status = 404, description = "ActivityFactor not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<ActivityFactorJson>> {
    let use_case = ActivityFactorUseCase::new(ActivityFactorGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_id(id).await {
        Ok(res) => Ok(Json(ActivityFactorMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "ActivityFactor",
    path = "/activity-factor/uuid/{uuid}",
    params(
        ("uuid" = String, Path, description = "ActivityFactor UUID")
    ),
    responses(
        (status = 200, description = "ActivityFactor found", body = ActivityFactorJson),
        (status = 404, description = "ActivityFactor not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<ActivityFactorJson>> {
    let use_case = ActivityFactorUseCase::new(ActivityFactorGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_uuid(uuid).await {
        Ok(res) => Ok(Json(ActivityFactorMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "ActivityFactor",
    path = "/activity-factor",
    responses(
        (status = 200, description = "List of activity factors", body = Vec<ActivityFactorJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<ActivityFactorJson>>> {
    let use_case = ActivityFactorUseCase::new(ActivityFactorGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all().await {
        Ok(list) => Ok(Json(ActivityFactorMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    put,
    tag = "ActivityFactor",
    path = "/activity-factor/{id}",
    params(
        ("id" = i32, Path, description = "ActivityFactor ID")
    ),
    request_body = ActivityFactorJson,
    responses(
        (status = 200, description = "ActivityFactor updated", body = ActivityFactorJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 404, description = "ActivityFactor not found", body = NotFoundErrorJson),
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
    Json(payload): Json<ActivityFactorJson>,
) -> HttpResponse<Json<ActivityFactorJson>> {
    let domain = ActivityFactorMapper::domain(payload);
    let use_case = ActivityFactorUseCase::new(ActivityFactorGateway::new(state.conn.as_ref().clone()));
    match use_case.update(id, domain).await {
        Ok(res) => Ok(Json(ActivityFactorMapper::json(res))),
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
