use crate::http::json::meal_analysis_json::MealAnalysisErrorJson;
use crate::http::json::meal_point_tier_json::{MealPointTierResponseJson, SaveMealPointTierRequestJson};
use crate::AppState;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Extension;
use axum::Json;
// Role import removed as it is no longer used
use business::domain::user::User;
use business::use_cases::ai::meal_point_tier_use_case::{MealPointTierRecord, MealPointTierUseCase, SaveMealPointTierError};
use chrono::NaiveTime;
use uuid::Uuid;



fn error_response(status: StatusCode, error_code: &str, message: impl Into<String>) -> Response {
    (
        status,
        Json(MealAnalysisErrorJson {
            error_code: error_code.to_string(),
            message: message.into(),
            request_id: Uuid::new_v4().to_string(),
        }),
    )
        .into_response()
}

fn parse_deadline_time(raw: &str) -> Option<NaiveTime> {
    NaiveTime::parse_from_str(raw, "%H:%M:%S").or_else(|_| NaiveTime::parse_from_str(raw, "%H:%M")).ok()
}

fn to_response(m: MealPointTierRecord) -> MealPointTierResponseJson {
    MealPointTierResponseJson {
        id: m.id,
        uuid: m.uuid,
        daily_meal_id: m.daily_meal_id,
        tenant_id: m.tenant_id,
        deadline_time: m.deadline_time.format("%H:%M:%S").to_string(),
        points: m.points,
        created_at: m.created_at.to_rfc3339(),
        updated_at: m.updated_at.to_rfc3339(),
    }
}

fn map_save_error(err: SaveMealPointTierError) -> Response {
    match err {
        SaveMealPointTierError::InvalidDailyMeal => {
            error_response(StatusCode::BAD_REQUEST, "INVALID_DAILY_MEAL", "daily_meal_id does not exist.")
        }
        SaveMealPointTierError::NotFound => error_response(StatusCode::NOT_FOUND, "NOT_FOUND", "Meal point tier not found."),
        SaveMealPointTierError::Db(e) => {
            log::error!("Failed to save meal point tier: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Failed to save meal point tier.")
        }
    }
}

#[utoipa::path(
    post,
    tag = "MealPointTier",
    path = "/meal-point-tier",
    request_body = SaveMealPointTierRequestJson,
    responses(
        (status = 201, description = "Meal point tier created", body = MealPointTierResponseJson),
        (status = 400, description = "Invalid daily_meal_id or deadline_time", body = MealAnalysisErrorJson),
        (status = 401, description = "Unauthorized", body = MealAnalysisErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn add(
    State(state): State<AppState>,
    Extension(_current_user): Extension<User>,
    Json(payload): Json<SaveMealPointTierRequestJson>,
) -> Response {
    let Some(deadline_time) = parse_deadline_time(&payload.deadline_time) else {
        return error_response(StatusCode::BAD_REQUEST, "INVALID_DEADLINE_TIME", "deadline_time must be HH:MM or HH:MM:SS.");
    };

    let tenant_id = payload.tenant_id.or(_current_user.tenant_id);

    match MealPointTierUseCase::create(
        &state.conn,
        tenant_id,
        payload.daily_meal_id,
        deadline_time,
        payload.points,
        _current_user.email,
    )
    .await
    {
        Ok(saved) => (StatusCode::CREATED, Json(to_response(saved))).into_response(),
        Err(e) => map_save_error(e),
    }
}

#[utoipa::path(
    put,
    tag = "MealPointTier",
    path = "/meal-point-tier/{id}",
    params(("id" = i32, Path, description = "Meal point tier ID")),
    request_body = SaveMealPointTierRequestJson,
    responses(
        (status = 200, description = "Meal point tier updated", body = MealPointTierResponseJson),
        (status = 400, description = "Invalid daily_meal_id or deadline_time", body = MealAnalysisErrorJson),
        (status = 401, description = "Unauthorized", body = MealAnalysisErrorJson),
        (status = 404, description = "Meal point tier not found", body = MealAnalysisErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn update(
    State(state): State<AppState>,
    Extension(_current_user): Extension<User>,
    Path(id): Path<i32>,
    Json(payload): Json<SaveMealPointTierRequestJson>,
) -> Response {
    let Some(deadline_time) = parse_deadline_time(&payload.deadline_time) else {
        return error_response(StatusCode::BAD_REQUEST, "INVALID_DEADLINE_TIME", "deadline_time must be HH:MM or HH:MM:SS.");
    };

    let tenant_id = payload.tenant_id.or(_current_user.tenant_id);

    match MealPointTierUseCase::update(
        &state.conn,
        id,
        tenant_id,
        payload.daily_meal_id,
        deadline_time,
        payload.points,
        _current_user.email,
    )
    .await
    {
        Ok(saved) => Json(to_response(saved)).into_response(),
        Err(e) => map_save_error(e),
    }
}

#[utoipa::path(
    get,
    tag = "MealPointTier",
    path = "/meal-point-tier/{id}",
    params(("id" = i32, Path, description = "Meal point tier ID")),
    responses(
        (status = 200, description = "Meal point tier found", body = MealPointTierResponseJson),
        (status = 401, description = "Unauthorized", body = MealAnalysisErrorJson),
        (status = 404, description = "Meal point tier not found", body = MealAnalysisErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_by_id(State(state): State<AppState>, Extension(_current_user): Extension<User>, Path(id): Path<i32>) -> Response {
    match MealPointTierUseCase::find_by_id(&state.conn, id).await {
        Ok(Some(m)) => Json(to_response(m)).into_response(),
        Ok(None) => error_response(StatusCode::NOT_FOUND, "NOT_FOUND", "Meal point tier not found."),
        Err(e) => {
            log::error!("Failed to load meal point tier: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Failed to load meal point tier.")
        }
    }
}

#[utoipa::path(
    get,
    tag = "MealPointTier",
    path = "/meal-point-tier",
    responses(
        (status = 200, description = "List of meal point tiers", body = Vec<MealPointTierResponseJson>),
        (status = 401, description = "Unauthorized", body = MealAnalysisErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(State(state): State<AppState>, Extension(_current_user): Extension<User>) -> Response {
    match MealPointTierUseCase::find_all(&state.conn).await {
        Ok(list) => Json(list.into_iter().map(to_response).collect::<Vec<_>>()).into_response(),
        Err(e) => {
            log::error!("Failed to list meal point tiers: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Failed to list meal point tiers.")
        }
    }
}
