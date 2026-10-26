use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::http::json::meal_plan_json::MealPlanJson;
use crate::http::json::page_json::PageJson;
use crate::infrastructure::mapper::{Mapper, MealPlanMapper};
use crate::AppState;
use axum::extract::{Extension, Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use business::domain::enums::{MealPlanCategory, MealPlanGenerationStatus};
use business::gateway::ingredient_gateway::IngredientGateway;
use business::gateway::meal_plan_gateway::MealPlanGateway;
use business::use_cases::meal_plan_use_case::MealPlanUseCase;

#[utoipa::path(
    post,
    tag = "MealPlan",
    path = "/meal-plan",
    request_body = MealPlanJson,
    responses(
        (status = 201, description = "Meal plan created", body = MealPlanJson),
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
    Json(payload): Json<MealPlanJson>,
) -> HttpResponse<(StatusCode, Json<MealPlanJson>)> {
    if payload.category.parse::<MealPlanCategory>().is_err() {
        return Err(ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue));
    }
    if payload
        .generation_status
        .parse::<MealPlanGenerationStatus>()
        .is_err()
    {
        return Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        ));
    }
    let domain = MealPlanMapper::domain(payload);
    let use_case = MealPlanUseCase::new(MealPlanGateway::new(state.conn.as_ref().clone()));
    let ingredient_gateway = IngredientGateway::new(state.conn.as_ref().clone());

    match use_case.create(domain, &ingredient_gateway).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(MealPlanMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "MealPlan",
    path = "/meal-plan/{id}",
    params(
        ("id" = i32, Path, description = "Meal plan ID")
    ),
    responses(
        (status = 200, description = "Meal plan found", body = MealPlanJson),
        (status = 404, description = "Meal plan not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<MealPlanJson>> {
    let use_case = MealPlanUseCase::new(MealPlanGateway::new(state.conn.as_ref().clone()));
    let ingredient_gateway = IngredientGateway::new(state.conn.as_ref().clone());

    match use_case.find_by_id(id, &ingredient_gateway).await {
        Ok(res) => Ok(Json(MealPlanMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "MealPlan",
    path = "/meal-plan/uuid/{uuid}",
    params(
        ("uuid" = String, Path, description = "Meal plan UUID")
    ),
    responses(
        (status = 200, description = "Meal plan found", body = MealPlanJson),
        (status = 404, description = "Meal plan not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<MealPlanJson>> {
    let use_case = MealPlanUseCase::new(MealPlanGateway::new(state.conn.as_ref().clone()));
    let ingredient_gateway = IngredientGateway::new(state.conn.as_ref().clone());

    match use_case.find_by_uuid(uuid, &ingredient_gateway).await {
        Ok(res) => Ok(Json(MealPlanMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[derive(Debug, serde::Deserialize)]
pub struct MealPlanQueryParam {
    pub page: Option<u64>,
    pub size: Option<u64>,
    pub search: Option<String>,
    pub category: Option<String>,
    pub patient_id: Option<i32>,
}

#[utoipa::path(
    get,
    tag = "MealPlan",
    path = "/meal-plan/page",
    responses(
        (status = 200, description = "Paginated list of meal plans", body = PageJson<MealPlanJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_paginated(
    state: State<AppState>,
    Query(params): Query<MealPlanQueryParam>,
) -> HttpResponse<Json<crate::http::json::page_json::PageJson<MealPlanJson>>> {
    let page = params.page.unwrap_or(1);
    let size = params.size.unwrap_or(10);
    let use_case = MealPlanUseCase::new(MealPlanGateway::new(state.conn.as_ref().clone()));
    let ingredient_gateway = IngredientGateway::new(state.conn.as_ref().clone());

    match use_case
        .find_paginated(
            page,
            size,
            params.search,
            params.category,
            params.patient_id,
            &ingredient_gateway,
        )
        .await
    {
        Ok((list, total_elements, total_pages)) => {
            let content = MealPlanMapper::json_vec(list);
            Ok(Json(crate::http::json::page_json::PageJson {
                content,
                page,
                size,
                total_elements,
                total_pages,
            }))
        }
        Err(_) => Ok(Json(crate::http::json::page_json::PageJson {
            content: Vec::new(),
            page,
            size,
            total_elements: 0,
            total_pages: 0,
        })),
    }
}

#[utoipa::path(
    get,
    tag = "MealPlan",
    path = "/meal-plan",
    responses(
        (status = 200, description = "List of meal plans", body = Vec<MealPlanJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<MealPlanJson>>> {
    let use_case = MealPlanUseCase::new(MealPlanGateway::new(state.conn.as_ref().clone()));
    let ingredient_gateway = IngredientGateway::new(state.conn.as_ref().clone());

    match use_case.find_all(&ingredient_gateway).await {
        Ok(list) => Ok(Json(MealPlanMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    put,
    tag = "MealPlan",
    path = "/meal-plan/{id}",
    params(
        ("id" = i32, Path, description = "Meal plan ID")
    ),
    request_body = MealPlanJson,
    responses(
        (status = 200, description = "Meal plan updated", body = MealPlanJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 404, description = "Meal plan not found", body = NotFoundErrorJson),
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
    Json(payload): Json<MealPlanJson>,
) -> HttpResponse<Json<MealPlanJson>> {
    if payload.category.parse::<MealPlanCategory>().is_err() {
        return Err(ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue));
    }
    if payload
        .generation_status
        .parse::<MealPlanGenerationStatus>()
        .is_err()
    {
        return Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        ));
    }
    let domain = MealPlanMapper::domain(payload);
    let use_case = MealPlanUseCase::new(MealPlanGateway::new(state.conn.as_ref().clone()));
    let ingredient_gateway = IngredientGateway::new(state.conn.as_ref().clone());

    match use_case.update(id, domain, &ingredient_gateway).await {
        Ok(res) => Ok(Json(MealPlanMapper::json(res))),
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
    post,
    tag = "MealPlan",
    path = "/meal-plan/{id}/toggle-favorite",
    params(
        ("id" = i32, Path, description = "Meal plan ID")
    ),
    responses(
        (status = 200, description = "Favorite status toggled", body = MealPlanJson),
        (status = 404, description = "Meal plan not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn toggle_favorite(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Path(id): Path<i32>,
) -> HttpResponse<Json<MealPlanJson>> {
    let use_case = MealPlanUseCase::new(MealPlanGateway::new(state.conn.as_ref().clone()));
    let ingredient_gateway = IngredientGateway::new(state.conn.as_ref().clone());

    match use_case.toggle_favorite(id, &ingredient_gateway).await {
        Ok(res) => Ok(Json(MealPlanMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    delete,
    tag = "MealPlan",
    path = "/meal-plan/{id}",
    params(
        ("id" = i32, Path, description = "Meal plan ID")
    ),
    responses(
        (status = 204, description = "Meal plan deleted"),
        (status = 404, description = "Meal plan not found", body = NotFoundErrorJson),
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
    let use_case = MealPlanUseCase::new(MealPlanGateway::new(state.conn.as_ref().clone()));
    match use_case.delete(id).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}
