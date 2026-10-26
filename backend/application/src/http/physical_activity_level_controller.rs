use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::http::json::physical_activity_level_json::PhysicalActivityLevelJson;
use crate::infrastructure::mapper::{Mapper, PhysicalActivityLevelMapper};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::Json;
use business::gateway::physical_activity_level_gateway::PhysicalActivityLevelGateway;
use business::use_cases::physical_activity_level_use_case::PhysicalActivityLevelUseCase;

#[utoipa::path(
    post,
    tag = "PhysicalActivityLevel",
    path = "/physical-activity-level",
    request_body = PhysicalActivityLevelJson,
    responses(
        (status = 201, description = "PhysicalActivityLevel created", body = PhysicalActivityLevelJson),
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
    Json(payload): Json<PhysicalActivityLevelJson>,
) -> HttpResponse<(StatusCode, Json<PhysicalActivityLevelJson>)> {
    let domain = PhysicalActivityLevelMapper::domain(payload);
    let use_case = PhysicalActivityLevelUseCase::new(PhysicalActivityLevelGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(PhysicalActivityLevelMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "PhysicalActivityLevel",
    path = "/physical-activity-level/{id}",
    params(
        ("id" = i32, Path, description = "PhysicalActivityLevel ID")
    ),
    responses(
        (status = 200, description = "PhysicalActivityLevel found", body = PhysicalActivityLevelJson),
        (status = 404, description = "PhysicalActivityLevel not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<PhysicalActivityLevelJson>> {
    let use_case = PhysicalActivityLevelUseCase::new(PhysicalActivityLevelGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_id(id).await {
        Ok(res) => Ok(Json(PhysicalActivityLevelMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "PhysicalActivityLevel",
    path = "/physical-activity-level/uuid/{uuid}",
    params(
        ("uuid" = String, Path, description = "PhysicalActivityLevel UUID")
    ),
    responses(
        (status = 200, description = "PhysicalActivityLevel found", body = PhysicalActivityLevelJson),
        (status = 404, description = "PhysicalActivityLevel not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<PhysicalActivityLevelJson>> {
    let use_case = PhysicalActivityLevelUseCase::new(PhysicalActivityLevelGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_uuid(uuid).await {
        Ok(res) => Ok(Json(PhysicalActivityLevelMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "PhysicalActivityLevel",
    path = "/physical-activity-level",
    responses(
        (status = 200, description = "List of physical activity levels", body = Vec<PhysicalActivityLevelJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<PhysicalActivityLevelJson>>> {
    let use_case = PhysicalActivityLevelUseCase::new(PhysicalActivityLevelGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all().await {
        Ok(list) => Ok(Json(PhysicalActivityLevelMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    put,
    tag = "PhysicalActivityLevel",
    path = "/physical-activity-level/{id}",
    params(
        ("id" = i32, Path, description = "PhysicalActivityLevel ID")
    ),
    request_body = PhysicalActivityLevelJson,
    responses(
        (status = 200, description = "PhysicalActivityLevel updated", body = PhysicalActivityLevelJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 404, description = "PhysicalActivityLevel not found", body = NotFoundErrorJson),
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
    Json(payload): Json<PhysicalActivityLevelJson>,
) -> HttpResponse<Json<PhysicalActivityLevelJson>> {
    let domain = PhysicalActivityLevelMapper::domain(payload);
    let use_case = PhysicalActivityLevelUseCase::new(PhysicalActivityLevelGateway::new(state.conn.as_ref().clone()));
    match use_case.update(id, domain).await {
        Ok(res) => Ok(Json(PhysicalActivityLevelMapper::json(res))),
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
