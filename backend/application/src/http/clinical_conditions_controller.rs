use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::clinical_conditions_json::ClinicalConditionsJson;
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::infrastructure::mapper::{ClinicalConditionsMapper, Mapper};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::Json;
use business::gateway::clinical_conditions_gateway::ClinicalConditionsGateway;
use business::use_cases::clinical_conditions_use_case::ClinicalConditionsUseCase;

#[utoipa::path(
    post,
    tag = "ClinicalConditions",
    path = "/clinical-conditions",
    request_body = ClinicalConditionsJson,
    responses(
        (status = 201, description = "ClinicalConditions created", body = ClinicalConditionsJson),
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
    Json(payload): Json<ClinicalConditionsJson>,
) -> HttpResponse<(StatusCode, Json<ClinicalConditionsJson>)> {
    let domain = ClinicalConditionsMapper::domain(payload);
    let use_case = ClinicalConditionsUseCase::new(ClinicalConditionsGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(ClinicalConditionsMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "ClinicalConditions",
    path = "/clinical-conditions/{id}",
    params(
        ("id" = i32, Path, description = "ClinicalConditions ID")
    ),
    responses(
        (status = 200, description = "ClinicalConditions found", body = ClinicalConditionsJson),
        (status = 404, description = "ClinicalConditions not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<ClinicalConditionsJson>> {
    let use_case = ClinicalConditionsUseCase::new(ClinicalConditionsGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_id(id).await {
        Ok(res) => Ok(Json(ClinicalConditionsMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "ClinicalConditions",
    path = "/clinical-conditions/uuid/{uuid}",
    params(
        ("uuid" = String, Path, description = "ClinicalConditions UUID")
    ),
    responses(
        (status = 200, description = "ClinicalConditions found", body = ClinicalConditionsJson),
        (status = 404, description = "ClinicalConditions not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<ClinicalConditionsJson>> {
    let use_case = ClinicalConditionsUseCase::new(ClinicalConditionsGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_uuid(uuid).await {
        Ok(res) => Ok(Json(ClinicalConditionsMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "ClinicalConditions",
    path = "/clinical-conditions",
    responses(
        (status = 200, description = "List of clinical conditions", body = Vec<ClinicalConditionsJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<ClinicalConditionsJson>>> {
    let use_case = ClinicalConditionsUseCase::new(ClinicalConditionsGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all().await {
        Ok(list) => Ok(Json(ClinicalConditionsMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    put,
    tag = "ClinicalConditions",
    path = "/clinical-conditions/{id}",
    params(
        ("id" = i32, Path, description = "ClinicalConditions ID")
    ),
    request_body = ClinicalConditionsJson,
    responses(
        (status = 200, description = "ClinicalConditions updated", body = ClinicalConditionsJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 404, description = "ClinicalConditions not found", body = NotFoundErrorJson),
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
    Json(payload): Json<ClinicalConditionsJson>,
) -> HttpResponse<Json<ClinicalConditionsJson>> {
    let domain = ClinicalConditionsMapper::domain(payload);
    let use_case = ClinicalConditionsUseCase::new(ClinicalConditionsGateway::new(state.conn.as_ref().clone()));
    match use_case.update(id, domain).await {
        Ok(res) => Ok(Json(ClinicalConditionsMapper::json(res))),
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
