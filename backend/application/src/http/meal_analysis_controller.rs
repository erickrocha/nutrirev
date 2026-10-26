use crate::http::json::meal_analysis_json::{
    FoodItemJson, MacrosJson, ManualMealAnalysisRequestJson, ManualMealAnalysisResponseJson,
    MealAnalysisErrorJson, MealAnalysisResponseV1, MealAnalysisStatusJson,
};
use crate::AppState;
use axum::extract::{Multipart, Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Extension;
use axum::Json;
use business::domain::ai_provider::{MealAnalysisResult, ProviderErrorKind};
use business::domain::user::User;
use business::use_cases::ai::analysis_job_use_case::{AnalysisJobUseCase, KIND_MEAL, STATUS_COMPLETED, STATUS_FAILED};
use business::use_cases::manual_meal_analysis_use_case::{
    ManualMealAnalysisError, ManualMealAnalysisInput, ManualMealAnalysisUseCase,
    ManualMealItemInput,
};
use business::use_cases::meal_analysis_use_case::MealAnalysisUseCase;
use chrono::Utc;
use std::sync::Arc;
use uuid::Uuid;

fn status_code_for_error_code(code: &str) -> StatusCode {
    match code {
        "INVALID_IMAGE" | "INVALID_DAILY_MEAL" | "INVALID_DATE" | "EMPTY_ITEMS" | "INVALID_QUANTITY" | "INGREDIENT_NOT_FOUND" | "INVALID_UNIT" => StatusCode::BAD_REQUEST,
        "PROVIDER_TIMEOUT" => StatusCode::GATEWAY_TIMEOUT,
        "PARSE_FAILURE" => StatusCode::BAD_GATEWAY,
        "QUOTA_EXCEEDED" => StatusCode::TOO_MANY_REQUESTS,
        "UNAUTHORIZED" => StatusCode::UNAUTHORIZED,
        _ => StatusCode::BAD_GATEWAY,
    }
}

fn error_response(request_id: String, status: StatusCode, error_code: &str, message: impl Into<String>) -> Response {
    (
        status,
        Json(MealAnalysisErrorJson {
            error_code: error_code.to_string(),
            message: message.into(),
            request_id,
        }),
    )
        .into_response()
}

#[utoipa::path(
    post,
    tag = "MealAnalysis",
    path = "/v1/meals/analyze",
    responses(
        (status = 202, description = "Meal analysis submitted; poll GET /v1/meals/analyze/{analysis_id} for the result", body = MealAnalysisStatusJson),
        (status = 400, description = "Invalid image file or parameters", body = MealAnalysisErrorJson),
        (status = 401, description = "Unauthorized", body = MealAnalysisErrorJson),
        (status = 429, description = "Quota exceeded", body = MealAnalysisErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn analyze_meal(State(state): State<AppState>,Extension(current_user): Extension<User>,mut multipart: Multipart) -> Response {
    let request_id = Uuid::new_v4().to_string();
    let mut image_bytes: Option<Vec<u8>> = None;
    let mut meal_type_hint: Option<String> = None;
    let mut daily_meal_id_raw: Option<String> = None;
    let mut meal_date_raw: Option<String> = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        if name == "image" || name == "file" {
            if let Ok(bytes) = field.bytes().await {
                image_bytes = Some(bytes.to_vec());
            }
        } else if name == "meal_type" || name == "mealType" {
            if let Ok(text) = field.text().await {
                if !text.trim().is_empty() {
                    meal_type_hint = Some(text.trim().to_string());
                }
            }
        } else if name == "daily_meal_id" || name == "dailyMealId" {
            if let Ok(text) = field.text().await {
                daily_meal_id_raw = Some(text.trim().to_string());
            }
        } else if name == "meal_date" || name == "mealDate" {
            if let Ok(text) = field.text().await {
                meal_date_raw = Some(text.trim().to_string());
            }
        }
    }

    let raw_bytes = match image_bytes {
        Some(bytes) if !bytes.is_empty() => bytes,
        _ => {
            return error_response(
                request_id,
                StatusCode::BAD_REQUEST,
                "INVALID_IMAGE",
                "A valid image file under field 'image' is required.",
            );
        }
    };

    let daily_meal_id = match daily_meal_id_raw.as_deref().and_then(|v| v.parse::<i32>().ok()) {
        Some(id) => id,
        None => {
            return error_response(
                request_id,
                StatusCode::BAD_REQUEST,
                "INVALID_DAILY_MEAL",
                "A valid 'daily_meal_id' field is required.",
            );
        }
    };

    let meal_date = match meal_date_raw
        .as_deref()
        .and_then(|v| chrono::NaiveDate::parse_from_str(v, "%Y-%m-%d").ok())
    {
        Some(date) => date,
        None => {
            return error_response(
                request_id,
                StatusCode::BAD_REQUEST,
                "INVALID_DATE",
                "A valid 'meal_date' field (YYYY-MM-DD) is required.",
            );
        }
    };

    let user_id = current_user.id.unwrap_or(0);
    let use_case = MealAnalysisUseCase::new();

    let input = match use_case
        .prepare(&state.conn, user_id, &raw_bytes, meal_type_hint, daily_meal_id, meal_date)
        .await
    {
        Ok(input) => input,
        Err(err) => {
            let status = status_code_for_error_code(err.kind.as_code());
            return error_response(request_id, status, err.kind.as_code(), err.message);
        }
    };

    let job_uuid = match AnalysisJobUseCase::create_pending(&state.conn, user_id, KIND_MEAL).await {
        Ok(id) => id,
        Err(e) => {
            log::error!("Failed to create meal analysis job: {}", e);
            return error_response(
                request_id,
                StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                "Failed to submit analysis job.",
            );
        }
    };

    use_case.spawn_analysis(Arc::clone(&state.conn), job_uuid, user_id, input);

    (
        StatusCode::ACCEPTED,
        Json(MealAnalysisStatusJson {
            analysis_id: job_uuid.to_string(),
            status: "processing".to_string(),
        }),
    )
        .into_response()
}

#[utoipa::path(
    post,
    tag = "MealAnalysis",
    path = "/v1/meals/analyze/manual",
    request_body = ManualMealAnalysisRequestJson,
    responses(
        (status = 201, description = "Manual meal analysis calculated and saved to daily log", body = ManualMealAnalysisResponseJson),
        (status = 400, description = "Invalid daily_meal_id, items, quantities or date", body = MealAnalysisErrorJson),
        (status = 401, description = "Unauthorized", body = MealAnalysisErrorJson),
        (status = 500, description = "Internal server error", body = MealAnalysisErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn analyze_meal_manual(
    State(state): State<AppState>,
    Extension(current_user): Extension<User>,
    Json(payload): Json<ManualMealAnalysisRequestJson>,
) -> Response {
    let request_id = Uuid::new_v4().to_string();
    let user_id = current_user.id.unwrap_or(0);

    let meal_date = match payload.meal_date.as_deref() {
        Some(d) if !d.trim().is_empty() => match chrono::NaiveDate::parse_from_str(d.trim(), "%Y-%m-%d") {
            Ok(date) => date,
            Err(_) => {
                return error_response(
                    request_id,
                    StatusCode::BAD_REQUEST,
                    "INVALID_DATE",
                    "A valid 'meal_date' field (YYYY-MM-DD) is required.",
                );
            }
        },
        _ => chrono::Utc::now().date_naive(),
    };

    let items_input: Vec<ManualMealItemInput> = payload
        .items
        .into_iter()
        .map(|it| ManualMealItemInput {
            ingredient_id: it.ingredient_id,
            quantity: it.quantity,
            unit: it.unit,
        })
        .collect();

    let input = ManualMealAnalysisInput {
        daily_meal_id: payload.daily_meal_id,
        meal_date,
        items: items_input,
    };

    match ManualMealAnalysisUseCase::analyze_and_log(&state.conn, user_id, input).await {
        Ok((saved, food_items, totals, points_awarded)) => {
            let response = ManualMealAnalysisResponseJson {
                log_id: Uuid::from_slice(&saved.uuid)
                    .map(|u| u.to_string())
                    .unwrap_or_default(),
                daily_meal_id: saved.daily_meal_id,
                meal_date: saved.meal_date.format("%Y-%m-%d").to_string(),
                analysis_type: saved.analysis_type,
                items: food_items
                    .into_iter()
                    .map(|it| FoodItemJson {
                        name: it.name,
                        estimated_grams: it.estimated_grams,
                        calories: it.calories,
                        protein_g: it.protein_g,
                        carbs_g: it.carbs_g,
                        fat_g: it.fat_g,
                        confidence: it.confidence,
                    })
                    .collect(),
                totals: MacrosJson {
                    calories: totals.calories,
                    protein_g: totals.protein_g,
                    carbs_g: totals.carbs_g,
                    fat_g: totals.fat_g,
                },
                created_at: saved.created_at.to_rfc3339(),
                points_awarded,
            };

            (StatusCode::CREATED, Json(response)).into_response()
        }
        Err(err) => {
            let (status, code, message) = match err {
                ManualMealAnalysisError::InvalidDailyMeal => (
                    StatusCode::BAD_REQUEST,
                    "INVALID_DAILY_MEAL",
                    "daily_meal_id does not exist.".to_string(),
                ),
                ManualMealAnalysisError::EmptyItems => (
                    StatusCode::BAD_REQUEST,
                    "EMPTY_ITEMS",
                    "At least one ingredient is required.".to_string(),
                ),
                ManualMealAnalysisError::InvalidQuantity => (
                    StatusCode::BAD_REQUEST,
                    "INVALID_QUANTITY",
                    "Ingredient quantity must be greater than zero.".to_string(),
                ),
                ManualMealAnalysisError::IngredientNotFound(id) => (
                    StatusCode::BAD_REQUEST,
                    "INGREDIENT_NOT_FOUND",
                    format!("Ingredient with id {} not found.", id),
                ),
                ManualMealAnalysisError::InvalidUnit(u) => (
                    StatusCode::BAD_REQUEST,
                    "INVALID_UNIT",
                    format!("Invalid measurement unit: {}", u),
                ),
                ManualMealAnalysisError::Db(e) => {
                    log::error!("Failed to manually analyze and save meal: {}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "INTERNAL_ERROR",
                        "Failed to calculate and save meal analysis.".to_string(),
                    )
                }
            };

            error_response(request_id, status, code, message)
        }
    }
}

#[utoipa::path(
    get,
    tag = "MealAnalysis",
    path = "/v1/meals/analyze/{analysis_id}",
    params(("analysis_id" = String, Path, description = "Job id returned by POST /v1/meals/analyze")),
    responses(
        (status = 200, description = "Job status (processing) or completed nutrition analysis", body = MealAnalysisResponseV1),
        (status = 400, description = "Invalid analysis_id", body = MealAnalysisErrorJson),
        (status = 401, description = "Unauthorized", body = MealAnalysisErrorJson),
        (status = 404, description = "Analysis job not found", body = MealAnalysisErrorJson),
        (status = 502, description = "AI provider or parse failure", body = MealAnalysisErrorJson),
        (status = 504, description = "AI provider timeout", body = MealAnalysisErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_meal_analysis_status(
    State(state): State<AppState>,
    Extension(current_user): Extension<User>,
    Path(analysis_id): Path<String>,
) -> Response {
    let request_id = Uuid::new_v4().to_string();
    let user_id = current_user.id.unwrap_or(0);

    let job_uuid = match Uuid::parse_str(&analysis_id) {
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

    let job = match AnalysisJobUseCase::find_by_uuid(&state.conn, job_uuid, user_id).await {
        Ok(Some(job)) => job,
        Ok(None) => {
            return error_response(request_id, StatusCode::NOT_FOUND, "NOT_FOUND", "Analysis job not found.");
        }
        Err(e) => {
            log::error!("Failed to load meal analysis job: {}", e);
            return error_response(
                request_id,
                StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                "Failed to load analysis job.",
            );
        }
    };

    match job.status.as_str() {
        STATUS_COMPLETED => {
            let result_json = job.result_json.unwrap_or_default();
            match serde_json::from_str::<MealAnalysisResult>(&result_json) {
                Ok(result) => {
                    let response_v1 = MealAnalysisResponseV1 {
                        schema_version: "1.0".to_string(),
                        provider: "internal".to_string(),
                        analysis_id,
                        status: "completed".to_string(),
                        items: result
                            .items
                            .into_iter()
                            .map(|it| FoodItemJson {
                                name: it.name,
                                estimated_grams: it.estimated_grams,
                                calories: it.calories,
                                protein_g: it.protein_g,
                                carbs_g: it.carbs_g,
                                fat_g: it.fat_g,
                                confidence: it.confidence,
                            })
                            .collect(),
                        totals: MacrosJson {
                            calories: result.totals.calories,
                            protein_g: result.totals.protein_g,
                            carbs_g: result.totals.carbs_g,
                            fat_g: result.totals.fat_g,
                        },
                        created_at: Utc::now().to_rfc3339(),
                    };
                    (StatusCode::OK, Json(response_v1)).into_response()
                }
                Err(e) => {
                    log::error!("Failed to deserialize stored meal analysis result: {}", e);
                    error_response(
                        request_id,
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "INTERNAL_ERROR",
                        "Failed to load analysis result.",
                    )
                }
            }
        }
        STATUS_FAILED => {
            let code = job.error_code.unwrap_or_else(|| ProviderErrorKind::ProviderError.as_code().to_string());
            let status = status_code_for_error_code(&code);
            error_response(
                request_id,
                status,
                &code,
                job.error_message.unwrap_or_else(|| "Analysis failed.".to_string()),
            )
        }
        other => (
            StatusCode::OK,
            Json(MealAnalysisStatusJson {
                analysis_id,
                status: other.to_string(),
            }),
        )
            .into_response(),
    }
}

