use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::clinical_plan_json::ClinicalPlanJson;
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::infrastructure::mapper::{ClinicalPlanMapper, Mapper};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::Json;
use business::gateway::clinical_plan_gateway::ClinicalPlanGateway;
use business::use_cases::clinical_plan_use_case::ClinicalPlanUseCase;

#[utoipa::path(
    post,
    tag = "ClinicalPlan",
    path = "/clinical-plan",
    request_body = ClinicalPlanJson,
    responses(
        (status = 201, description = "ClinicalPlan created", body = ClinicalPlanJson),
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
    Json(payload): Json<ClinicalPlanJson>,
) -> HttpResponse<(StatusCode, Json<ClinicalPlanJson>)> {
    let domain = ClinicalPlanMapper::domain(payload);
    let use_case = ClinicalPlanUseCase::new(ClinicalPlanGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(ClinicalPlanMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "ClinicalPlan",
    path = "/clinical-plan/{id}",
    params(
        ("id" = i32, Path, description = "ClinicalPlan ID")
    ),
    responses(
        (status = 200, description = "ClinicalPlan found", body = ClinicalPlanJson),
        (status = 404, description = "ClinicalPlan not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<ClinicalPlanJson>> {
    let use_case = ClinicalPlanUseCase::new(ClinicalPlanGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_id(id).await {
        Ok(res) => Ok(Json(ClinicalPlanMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "ClinicalPlan",
    path = "/clinical-plan/uuid/{uuid}",
    params(
        ("uuid" = String, Path, description = "ClinicalPlan UUID")
    ),
    responses(
        (status = 200, description = "ClinicalPlan found", body = ClinicalPlanJson),
        (status = 404, description = "ClinicalPlan not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<ClinicalPlanJson>> {
    let use_case = ClinicalPlanUseCase::new(ClinicalPlanGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_uuid(uuid).await {
        Ok(res) => Ok(Json(ClinicalPlanMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "ClinicalPlan",
    path = "/clinical-plan",
    responses(
        (status = 200, description = "List of clinical plans", body = Vec<ClinicalPlanJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<ClinicalPlanJson>>> {
    let use_case = ClinicalPlanUseCase::new(ClinicalPlanGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all().await {
        Ok(list) => Ok(Json(ClinicalPlanMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    put,
    tag = "ClinicalPlan",
    path = "/clinical-plan/{id}",
    params(
        ("id" = i32, Path, description = "ClinicalPlan ID")
    ),
    request_body = ClinicalPlanJson,
    responses(
        (status = 200, description = "ClinicalPlan updated", body = ClinicalPlanJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 404, description = "ClinicalPlan not found", body = NotFoundErrorJson),
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
    Json(payload): Json<ClinicalPlanJson>,
) -> HttpResponse<Json<ClinicalPlanJson>> {
    let domain = ClinicalPlanMapper::domain(payload);
    let use_case = ClinicalPlanUseCase::new(ClinicalPlanGateway::new(state.conn.as_ref().clone()));
    match use_case.update(id, domain).await {
        Ok(res) => Ok(Json(ClinicalPlanMapper::json(res))),
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
