use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::http::json::objective_json::ObjectiveJson;
use crate::infrastructure::mapper::{Mapper, ObjectiveMapper};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::Json;
use business::gateway::objective_gateway::ObjectiveGateway;
use business::use_cases::objective_use_case::ObjectiveUseCase;

#[utoipa::path(
    post,
    tag = "Objective",
    path = "/objective",
    request_body = ObjectiveJson,
    responses(
        (status = 201, description = "Objective created", body = ObjectiveJson),
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
    Json(payload): Json<ObjectiveJson>,
) -> HttpResponse<(StatusCode, Json<ObjectiveJson>)> {
    let domain = ObjectiveMapper::domain(payload);
    let use_case = ObjectiveUseCase::new(ObjectiveGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(ObjectiveMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "Objective",
    path = "/objective/{id}",
    params(
        ("id" = i32, Path, description = "Objective ID")
    ),
    responses(
        (status = 200, description = "Objective found", body = ObjectiveJson),
        (status = 404, description = "Objective not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<ObjectiveJson>> {
    let use_case = ObjectiveUseCase::new(ObjectiveGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_id(id).await {
        Ok(res) => Ok(Json(ObjectiveMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "Objective",
    path = "/objective/uuid/{uuid}",
    params(
        ("uuid" = String, Path, description = "Objective UUID")
    ),
    responses(
        (status = 200, description = "Objective found", body = ObjectiveJson),
        (status = 404, description = "Objective not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<ObjectiveJson>> {
    let use_case = ObjectiveUseCase::new(ObjectiveGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_uuid(uuid).await {
        Ok(res) => Ok(Json(ObjectiveMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "Objective",
    path = "/objective",
    responses(
        (status = 200, description = "List of objectives", body = Vec<ObjectiveJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<ObjectiveJson>>> {
    let use_case = ObjectiveUseCase::new(ObjectiveGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all().await {
        Ok(list) => Ok(Json(ObjectiveMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    put,
    tag = "Objective",
    path = "/objective/{id}",
    params(
        ("id" = i32, Path, description = "Objective ID")
    ),
    request_body = ObjectiveJson,
    responses(
        (status = 200, description = "Objective updated", body = ObjectiveJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 404, description = "Objective not found", body = NotFoundErrorJson),
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
    Json(payload): Json<ObjectiveJson>,
) -> HttpResponse<Json<ObjectiveJson>> {
    let domain = ObjectiveMapper::domain(payload);
    let use_case = ObjectiveUseCase::new(ObjectiveGateway::new(state.conn.as_ref().clone()));
    match use_case.update(id, domain).await {
        Ok(res) => Ok(Json(ObjectiveMapper::json(res))),
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
