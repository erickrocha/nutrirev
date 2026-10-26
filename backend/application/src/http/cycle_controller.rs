use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::cycle_json::CycleJson;
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::infrastructure::mapper::{CycleMapper, Mapper};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::Json;
use business::gateway::cycle_gateway::CycleGateway;
use business::use_cases::cycle_use_case::CycleUseCase;

#[utoipa::path(
    post,
    tag = "Cycle",
    path = "/cycle",
    request_body = CycleJson,
    responses(
        (status = 201, description = "Cycle created", body = CycleJson),
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
    Json(payload): Json<CycleJson>,
) -> HttpResponse<(StatusCode, Json<CycleJson>)> {
    let domain = CycleMapper::domain(payload);
    let use_case = CycleUseCase::new(CycleGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(CycleMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "Cycle",
    path = "/cycle/{id}",
    params(
        ("id" = i32, Path, description = "Cycle ID")
    ),
    responses(
        (status = 200, description = "Cycle found", body = CycleJson),
        (status = 404, description = "Cycle not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<CycleJson>> {
    let use_case = CycleUseCase::new(CycleGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_id(id).await {
        Ok(res) => Ok(Json(CycleMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "Cycle",
    path = "/cycle/uuid/{uuid}",
    params(
        ("uuid" = String, Path, description = "Cycle UUID")
    ),
    responses(
        (status = 200, description = "Cycle found", body = CycleJson),
        (status = 404, description = "Cycle not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<CycleJson>> {
    let use_case = CycleUseCase::new(CycleGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_uuid(uuid).await {
        Ok(res) => Ok(Json(CycleMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "Cycle",
    path = "/cycle",
    responses(
        (status = 200, description = "List of cycles", body = Vec<CycleJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<CycleJson>>> {
    let use_case = CycleUseCase::new(CycleGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all().await {
        Ok(list) => Ok(Json(CycleMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    put,
    tag = "Cycle",
    path = "/cycle/{id}",
    params(
        ("id" = i32, Path, description = "Cycle ID")
    ),
    request_body = CycleJson,
    responses(
        (status = 200, description = "Cycle updated", body = CycleJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 404, description = "Cycle not found", body = NotFoundErrorJson),
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
    Json(payload): Json<CycleJson>,
) -> HttpResponse<Json<CycleJson>> {
    let domain = CycleMapper::domain(payload);
    let use_case = CycleUseCase::new(CycleGateway::new(state.conn.as_ref().clone()));
    match use_case.update(id, domain).await {
        Ok(res) => Ok(Json(CycleMapper::json(res))),
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

#[utoipa::path(
    delete,
    tag = "Cycle",
    path = "/cycle/{id}",
    params(
        ("id" = i32, Path, description = "Cycle ID")
    ),
    responses(
        (status = 204, description = "Cycle deleted"),
        (status = 404, description = "Cycle not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn delete(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Path(id): Path<i32>,
) -> HttpResponse<StatusCode> {
    let use_case = CycleUseCase::new(CycleGateway::new(state.conn.as_ref().clone()));
    match use_case.delete(id).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}
