use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::dietary_restriction_json::DietaryRestrictionJson;
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::infrastructure::mapper::{DietaryRestrictionMapper, Mapper};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::Json;
use business::gateway::dietary_restriction_gateway::DietaryRestrictionGateway;
use business::use_cases::dietary_restriction_use_case::DietaryRestrictionUseCase;

#[utoipa::path(
    post,
    tag = "DietaryRestriction",
    path = "/dietary-restriction",
    request_body = DietaryRestrictionJson,
    responses(
        (status = 201, description = "DietaryRestriction created", body = DietaryRestrictionJson),
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
    Json(payload): Json<DietaryRestrictionJson>,
) -> HttpResponse<(StatusCode, Json<DietaryRestrictionJson>)> {
    let domain = DietaryRestrictionMapper::domain(payload);
    let use_case = DietaryRestrictionUseCase::new(DietaryRestrictionGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(DietaryRestrictionMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "DietaryRestriction",
    path = "/dietary-restriction/{id}",
    params(
        ("id" = i32, Path, description = "DietaryRestriction ID")
    ),
    responses(
        (status = 200, description = "DietaryRestriction found", body = DietaryRestrictionJson),
        (status = 404, description = "DietaryRestriction not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<DietaryRestrictionJson>> {
    let use_case = DietaryRestrictionUseCase::new(DietaryRestrictionGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_id(id).await {
        Ok(res) => Ok(Json(DietaryRestrictionMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "DietaryRestriction",
    path = "/dietary-restriction/uuid/{uuid}",
    params(
        ("uuid" = String, Path, description = "DietaryRestriction UUID")
    ),
    responses(
        (status = 200, description = "DietaryRestriction found", body = DietaryRestrictionJson),
        (status = 404, description = "DietaryRestriction not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<DietaryRestrictionJson>> {
    let use_case = DietaryRestrictionUseCase::new(DietaryRestrictionGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_uuid(uuid).await {
        Ok(res) => Ok(Json(DietaryRestrictionMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "DietaryRestriction",
    path = "/dietary-restriction",
    responses(
        (status = 200, description = "List of dietary restrictions", body = Vec<DietaryRestrictionJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<DietaryRestrictionJson>>> {
    let use_case = DietaryRestrictionUseCase::new(DietaryRestrictionGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all().await {
        Ok(list) => Ok(Json(DietaryRestrictionMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    put,
    tag = "DietaryRestriction",
    path = "/dietary-restriction/{id}",
    params(
        ("id" = i32, Path, description = "DietaryRestriction ID")
    ),
    request_body = DietaryRestrictionJson,
    responses(
        (status = 200, description = "DietaryRestriction updated", body = DietaryRestrictionJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 404, description = "DietaryRestriction not found", body = NotFoundErrorJson),
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
    Json(payload): Json<DietaryRestrictionJson>,
) -> HttpResponse<Json<DietaryRestrictionJson>> {
    let domain = DietaryRestrictionMapper::domain(payload);
    let use_case = DietaryRestrictionUseCase::new(DietaryRestrictionGateway::new(state.conn.as_ref().clone()));
    match use_case.update(id, domain).await {
        Ok(res) => Ok(Json(DietaryRestrictionMapper::json(res))),
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
