use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::http::json::pre_existing_conditions_json::PreExistingConditionsJson;
use crate::infrastructure::mapper::{Mapper, PreExistingConditionsMapper};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::Json;
use business::gateway::pre_existing_conditions_gateway::PreExistingConditionsGateway;
use business::use_cases::pre_existing_conditions_use_case::PreExistingConditionsUseCase;

#[utoipa::path(
    post,
    tag = "PreExistingConditions",
    path = "/pre-existing-conditions",
    request_body = PreExistingConditionsJson,
    responses(
        (status = 201, description = "PreExistingConditions created", body = PreExistingConditionsJson),
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
    Json(payload): Json<PreExistingConditionsJson>,
) -> HttpResponse<(StatusCode, Json<PreExistingConditionsJson>)> {
    let domain = PreExistingConditionsMapper::domain(payload);
    let use_case = PreExistingConditionsUseCase::new(PreExistingConditionsGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(PreExistingConditionsMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "PreExistingConditions",
    path = "/pre-existing-conditions/{id}",
    params(
        ("id" = i32, Path, description = "PreExistingConditions ID")
    ),
    responses(
        (status = 200, description = "PreExistingConditions found", body = PreExistingConditionsJson),
        (status = 404, description = "PreExistingConditions not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<PreExistingConditionsJson>> {
    let use_case = PreExistingConditionsUseCase::new(PreExistingConditionsGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_id(id).await {
        Ok(res) => Ok(Json(PreExistingConditionsMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "PreExistingConditions",
    path = "/pre-existing-conditions/uuid/{uuid}",
    params(
        ("uuid" = String, Path, description = "PreExistingConditions UUID")
    ),
    responses(
        (status = 200, description = "PreExistingConditions found", body = PreExistingConditionsJson),
        (status = 404, description = "PreExistingConditions not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<PreExistingConditionsJson>> {
    let use_case = PreExistingConditionsUseCase::new(PreExistingConditionsGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_uuid(uuid).await {
        Ok(res) => Ok(Json(PreExistingConditionsMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "PreExistingConditions",
    path = "/pre-existing-conditions",
    responses(
        (status = 200, description = "List of pre existing conditions", body = Vec<PreExistingConditionsJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<PreExistingConditionsJson>>> {
    let use_case = PreExistingConditionsUseCase::new(PreExistingConditionsGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all().await {
        Ok(list) => Ok(Json(PreExistingConditionsMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    put,
    tag = "PreExistingConditions",
    path = "/pre-existing-conditions/{id}",
    params(
        ("id" = i32, Path, description = "PreExistingConditions ID")
    ),
    request_body = PreExistingConditionsJson,
    responses(
        (status = 200, description = "PreExistingConditions updated", body = PreExistingConditionsJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 404, description = "PreExistingConditions not found", body = NotFoundErrorJson),
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
    Json(payload): Json<PreExistingConditionsJson>,
) -> HttpResponse<Json<PreExistingConditionsJson>> {
    let domain = PreExistingConditionsMapper::domain(payload);
    let use_case = PreExistingConditionsUseCase::new(PreExistingConditionsGateway::new(state.conn.as_ref().clone()));
    match use_case.update(id, domain).await {
        Ok(res) => Ok(Json(PreExistingConditionsMapper::json(res))),
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
