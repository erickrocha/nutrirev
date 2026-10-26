use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::bowel_function_json::BowelFunctionJson;
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::infrastructure::mapper::{BowelFunctionMapper, Mapper};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::Json;
use business::gateway::bowel_function_gateway::BowelFunctionGateway;
use business::use_cases::bowel_function_use_case::BowelFunctionUseCase;

#[utoipa::path(
    post,
    tag = "BowelFunction",
    path = "/bowel-function",
    request_body = BowelFunctionJson,
    responses(
        (status = 201, description = "BowelFunction created", body = BowelFunctionJson),
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
    Json(payload): Json<BowelFunctionJson>,
) -> HttpResponse<(StatusCode, Json<BowelFunctionJson>)> {
    let domain = BowelFunctionMapper::domain(payload);
    let use_case = BowelFunctionUseCase::new(BowelFunctionGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(BowelFunctionMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "BowelFunction",
    path = "/bowel-function/{id}",
    params(
        ("id" = i32, Path, description = "BowelFunction ID")
    ),
    responses(
        (status = 200, description = "BowelFunction found", body = BowelFunctionJson),
        (status = 404, description = "BowelFunction not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<BowelFunctionJson>> {
    let use_case = BowelFunctionUseCase::new(BowelFunctionGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_id(id).await {
        Ok(res) => Ok(Json(BowelFunctionMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "BowelFunction",
    path = "/bowel-function/uuid/{uuid}",
    params(
        ("uuid" = String, Path, description = "BowelFunction UUID")
    ),
    responses(
        (status = 200, description = "BowelFunction found", body = BowelFunctionJson),
        (status = 404, description = "BowelFunction not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<BowelFunctionJson>> {
    let use_case = BowelFunctionUseCase::new(BowelFunctionGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_uuid(uuid).await {
        Ok(res) => Ok(Json(BowelFunctionMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "BowelFunction",
    path = "/bowel-function",
    responses(
        (status = 200, description = "List of bowel functions", body = Vec<BowelFunctionJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<BowelFunctionJson>>> {
    let use_case = BowelFunctionUseCase::new(BowelFunctionGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all().await {
        Ok(list) => Ok(Json(BowelFunctionMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    put,
    tag = "BowelFunction",
    path = "/bowel-function/{id}",
    params(
        ("id" = i32, Path, description = "BowelFunction ID")
    ),
    request_body = BowelFunctionJson,
    responses(
        (status = 200, description = "BowelFunction updated", body = BowelFunctionJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 404, description = "BowelFunction not found", body = NotFoundErrorJson),
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
    Json(payload): Json<BowelFunctionJson>,
) -> HttpResponse<Json<BowelFunctionJson>> {
    let domain = BowelFunctionMapper::domain(payload);
    let use_case = BowelFunctionUseCase::new(BowelFunctionGateway::new(state.conn.as_ref().clone()));
    match use_case.update(id, domain).await {
        Ok(res) => Ok(Json(BowelFunctionMapper::json(res))),
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
