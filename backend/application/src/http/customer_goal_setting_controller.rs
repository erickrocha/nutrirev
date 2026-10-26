use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::customer_goal_setting_json::CustomerGoalSettingJson;
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::infrastructure::mapper::{CustomerGoalSettingMapper, Mapper};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::Json;
use business::gateway::customer_goal_setting_gateway::CustomerGoalSettingGateway;
use business::use_cases::customer_goal_setting_use_case::CustomerGoalSettingUseCase;

#[utoipa::path(
    post,
    tag = "CustomerGoalSetting",
    path = "/customer-goal-setting",
    request_body = CustomerGoalSettingJson,
    responses(
        (status = 201, description = "CustomerGoalSetting created", body = CustomerGoalSettingJson),
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
    Json(payload): Json<CustomerGoalSettingJson>,
) -> HttpResponse<(StatusCode, Json<CustomerGoalSettingJson>)> {
    let domain = CustomerGoalSettingMapper::domain(payload);
    let use_case = CustomerGoalSettingUseCase::new(CustomerGoalSettingGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(CustomerGoalSettingMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "CustomerGoalSetting",
    path = "/customer-goal-setting/{id}",
    params(
        ("id" = i32, Path, description = "CustomerGoalSetting ID")
    ),
    responses(
        (status = 200, description = "CustomerGoalSetting found", body = CustomerGoalSettingJson),
        (status = 404, description = "CustomerGoalSetting not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<CustomerGoalSettingJson>> {
    let use_case = CustomerGoalSettingUseCase::new(CustomerGoalSettingGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_id(id).await {
        Ok(res) => Ok(Json(CustomerGoalSettingMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "CustomerGoalSetting",
    path = "/customer-goal-setting/uuid/{uuid}",
    params(
        ("uuid" = String, Path, description = "CustomerGoalSetting UUID")
    ),
    responses(
        (status = 200, description = "CustomerGoalSetting found", body = CustomerGoalSettingJson),
        (status = 404, description = "CustomerGoalSetting not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<CustomerGoalSettingJson>> {
    let use_case = CustomerGoalSettingUseCase::new(CustomerGoalSettingGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_uuid(uuid).await {
        Ok(res) => Ok(Json(CustomerGoalSettingMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "CustomerGoalSetting",
    path = "/customer-goal-setting",
    responses(
        (status = 200, description = "List of customer goal settings", body = Vec<CustomerGoalSettingJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<CustomerGoalSettingJson>>> {
    let use_case = CustomerGoalSettingUseCase::new(CustomerGoalSettingGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all().await {
        Ok(list) => Ok(Json(CustomerGoalSettingMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    put,
    tag = "CustomerGoalSetting",
    path = "/customer-goal-setting/{id}",
    params(
        ("id" = i32, Path, description = "CustomerGoalSetting ID")
    ),
    request_body = CustomerGoalSettingJson,
    responses(
        (status = 200, description = "CustomerGoalSetting updated", body = CustomerGoalSettingJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 404, description = "CustomerGoalSetting not found", body = NotFoundErrorJson),
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
    Json(payload): Json<CustomerGoalSettingJson>,
) -> HttpResponse<Json<CustomerGoalSettingJson>> {
    let domain = CustomerGoalSettingMapper::domain(payload);
    let use_case = CustomerGoalSettingUseCase::new(CustomerGoalSettingGateway::new(state.conn.as_ref().clone()));
    match use_case.update(id, domain).await {
        Ok(res) => Ok(Json(CustomerGoalSettingMapper::json(res))),
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
