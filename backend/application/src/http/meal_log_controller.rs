use crate::http::json::meal_analysis_json::MealAnalysisErrorJson;
use crate::http::json::meal_log_json::{
    DailyNutritionSummaryJson, MealLogEntryJson, MealLogResponseJson, SaveMealLogRequestJson,
};
use crate::AppState;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Extension;
use axum::Json;
use business::domain::ai_provider::FoodItem;
use business::domain::user::User;
use business::use_cases::ai::meal_log_use_case::{MealLogUseCase, SaveMealLogError};
use business::use_cases::image_storage_use_case::ImageStorageUseCase;
use chrono::NaiveDate;
use uuid::Uuid;

/// Resolves a meal_log row's stored photo (either an S3 key or base64 bytes,
/// never both) into a single ready-to-use string: a data URL, or a signed
/// CloudFront URL. Mirrors `EatMapper::json`'s resolution logic.
fn resolve_meal_log_photo(photo: Option<String>, photo_base64: Option<Vec<u8>>) -> Option<String> {
    if let Some(bytes) = photo_base64 {
        return String::from_utf8(bytes).ok();
    }
    photo
        .filter(|p| !p.trim().is_empty())
        .and_then(|key| ImageStorageUseCase::generate_cloudfront_signed_url(&key).ok())
}

#[derive(serde::Deserialize)]
pub struct DailySummaryQuery {
    pub date: Option<String>,
}

pub async fn get_daily_summary(
    State(state): State<AppState>,
    Extension(current_user): Extension<User>,
    Query(query): Query<DailySummaryQuery>,
) -> Response {
    let date = query
        .date
        .as_deref()
        .and_then(|value| chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d").ok())
        .unwrap_or_else(|| chrono::Utc::now().date_naive());
    match MealLogUseCase::daily_summary(&state.conn, current_user.id.unwrap_or(0), date).await {
        Ok(summary) => Json(DailyNutritionSummaryJson {
            date: date.to_string(),
            calories_consumed: summary.calories,
            protein_g: summary.protein_g,
            carbs_g: summary.carbs_g,
            fat_g: summary.fat_g,
            meals_logged: summary.meals_logged,
        })
        .into_response(),
        Err(error) => {
            log::error!("Failed to load daily nutrition summary: {}", error);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

fn status_code_for_error_code(code: &str) -> StatusCode {
    match code {
        "ANALYSIS_NOT_FOUND" => StatusCode::NOT_FOUND,
        "ANALYSIS_NOT_COMPLETED" | "ALREADY_LOGGED" => StatusCode::CONFLICT,
        "INVALID_DAILY_MEAL" | "INVALID_DATE" | "INVALID_ANALYSIS_ID" => StatusCode::BAD_REQUEST,
        "UNAUTHORIZED" => StatusCode::UNAUTHORIZED,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

fn error_response(request_id: String,status: StatusCode,error_code: &str,message: impl Into<String>) -> Response {
    (status,Json(MealAnalysisErrorJson {error_code: error_code.to_string(),message: message.into(),request_id})).into_response()
}

#[utoipa::path(
    post,
    tag = "MealLog",
    path = "/v1/meals/log",
    request_body = SaveMealLogRequestJson,
    responses(
        (status = 201, description = "Meal analysis saved to the daily log", body = MealLogResponseJson),
        (status = 400, description = "Invalid daily_meal_id, meal_date or analysis_id", body = MealAnalysisErrorJson),
        (status = 401, description = "Unauthorized", body = MealAnalysisErrorJson),
        (status = 404, description = "Analysis job not found", body = MealAnalysisErrorJson),
        (status = 409, description = "Analysis not completed yet, or already logged", body = MealAnalysisErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn save_meal_log(State(state): State<AppState>,Extension(current_user): Extension<User>,Json(payload): Json<SaveMealLogRequestJson>) -> Response {
    let request_id = Uuid::new_v4().to_string();
    let user_id = current_user.id.unwrap_or(0);

    let job_uuid = match Uuid::parse_str(&payload.analysis_id) {
        Ok(id) => id,
        Err(_) => {
            return error_response(
                request_id,
                StatusCode::BAD_REQUEST,
                "INVALID_ANALYSIS_ID",
                "analysis_id must be a valid UUID.",
            );
        }
    };

    let meal_date = match NaiveDate::parse_from_str(&payload.meal_date, "%Y-%m-%d") {
        Ok(date) => date,
        Err(_) => return error_response(request_id,StatusCode::BAD_REQUEST,"INVALID_DATE","meal_date must be in YYYY-MM-DD format.")
    };

    let saved = MealLogUseCase::save(&state.conn,user_id,job_uuid,payload.daily_meal_id,meal_date,None,None).await;

    let (log, points_awarded) = match saved {
        Ok(result) => result,
        Err(err) => {
            let (code, message): (&str, String) = match err {
                SaveMealLogError::AnalysisNotFound => {
                    ("ANALYSIS_NOT_FOUND", "Analysis job not found.".to_string())
                }
                SaveMealLogError::AnalysisNotCompleted => (
                    "ANALYSIS_NOT_COMPLETED",
                    "Analysis is not completed yet.".to_string(),
                ),
                SaveMealLogError::AlreadyLogged => (
                    "ALREADY_LOGGED",
                    "This analysis has already been logged.".to_string(),
                ),
                SaveMealLogError::InvalidDailyMeal => (
                    "INVALID_DAILY_MEAL",
                    "daily_meal_id does not exist.".to_string(),
                ),
                SaveMealLogError::Db(e) => {
                    log::error!("Failed to save meal log: {}", e);
                    (
                        "INTERNAL_ERROR",
                        "Failed to save meal to your log.".to_string(),
                    )
                }
            };
            let status = status_code_for_error_code(code);
            return error_response(request_id, status, code, message);
        }
    };

    let items: Vec<FoodItem> = log
        .items_json
        .as_deref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_default();

    let response = MealLogResponseJson {
        log_id: Uuid::from_slice(&log.uuid)
            .map(|u| u.to_string())
            .unwrap_or_default(),
        daily_meal_id: log.daily_meal_id,
        meal_date: log.meal_date.format("%Y-%m-%d").to_string(),
        analysis_id: Some(payload.analysis_id),
        analysis_type: log.analysis_type,
        items: items
            .into_iter()
            .map(|it| crate::http::json::meal_analysis_json::FoodItemJson {
                name: it.name,
                estimated_grams: it.estimated_grams,
                calories: it.calories,
                protein_g: it.protein_g,
                carbs_g: it.carbs_g,
                fat_g: it.fat_g,
                confidence: it.confidence,
            })
            .collect(),
        totals: crate::http::json::meal_analysis_json::MacrosJson {
            calories: log.calories,
            protein_g: log.protein_g,
            carbs_g: log.carbs_g,
            fat_g: log.fat_g,
        },
        photo: resolve_meal_log_photo(log.photo, log.photo_base64),
        created_at: log.created_at.to_rfc3339(),
        points_awarded,
    };

    (StatusCode::CREATED, Json(response)).into_response()
}

#[derive(serde::Deserialize)]
pub struct MealLogListQuery {
    pub date: Option<String>,
}

#[utoipa::path(
    get,
    tag = "MealLog",
    path = "/v1/meals/log",
    params(("date" = Option<String>, Query, description = "YYYY-MM-DD, defaults to today")),
    responses(
        (status = 200, description = "Meals logged by the current customer on the given date", body = Vec<MealLogEntryJson>),
        (status = 400, description = "Invalid date", body = MealAnalysisErrorJson),
        (status = 401, description = "Unauthorized", body = MealAnalysisErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_meal_logs(
    State(state): State<AppState>,
    Extension(current_user): Extension<User>,
    Query(query): Query<MealLogListQuery>,
) -> Response {
    let request_id = Uuid::new_v4().to_string();
    let user_id = current_user.id.unwrap_or(0);

    let date = match query.date.as_deref() {
        Some(value) => match NaiveDate::parse_from_str(value, "%Y-%m-%d") {
            Ok(date) => date,
            Err(_) => {
                return error_response(
                    request_id,
                    StatusCode::BAD_REQUEST,
                    "INVALID_DATE",
                    "date must be in YYYY-MM-DD format.",
                );
            }
        },
        None => chrono::Utc::now().date_naive(),
    };

    match MealLogUseCase::list_for_date(&state.conn, user_id, date).await {
        Ok(logs) => {
            let entries: Vec<MealLogEntryJson> = logs
                .into_iter()
                .map(|log| {
                    let items: Vec<FoodItem> = log
                        .items_json
                        .as_deref()
                        .and_then(|s| serde_json::from_str(s).ok())
                        .unwrap_or_default();

                    MealLogEntryJson {
                        log_id: Uuid::from_slice(&log.uuid).map(|u| u.to_string()).unwrap_or_default(),
                        daily_meal_id: log.daily_meal_id,
                        meal_date: log.meal_date.format("%Y-%m-%d").to_string(),
                        analysis_type: log.analysis_type,
                        items: items
                            .into_iter()
                            .map(|it| crate::http::json::meal_analysis_json::FoodItemJson {
                                name: it.name,
                                estimated_grams: it.estimated_grams,
                                calories: it.calories,
                                protein_g: it.protein_g,
                                carbs_g: it.carbs_g,
                                fat_g: it.fat_g,
                                confidence: it.confidence,
                            })
                            .collect(),
                        totals: crate::http::json::meal_analysis_json::MacrosJson {
                            calories: log.calories,
                            protein_g: log.protein_g,
                            carbs_g: log.carbs_g,
                            fat_g: log.fat_g,
                        },
                        photo: resolve_meal_log_photo(log.photo, log.photo_base64),
                        created_at: log.created_at.to_rfc3339(),
                    }
                })
                .collect();

            Json(entries).into_response()
        }
        Err(e) => {
            log::error!("Failed to list meal logs: {}", e);
            error_response(
                request_id,
                StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                "Failed to load your logged meals.",
            )
        }
    }
}
