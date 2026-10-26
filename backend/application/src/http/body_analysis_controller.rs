use crate::http::json::body_analysis_json::{
    BodyAnalysisErrorJson, BodyAnalysisResponseV1, BodyAnalysisStatusJson, BodyFatEstimateJson,
    BodyMeasurementsJson, BodyMetricsEstimateJson, BodyRecommendationsJson, MuscleMassAnalysisJson,
    PostureAndSymmetryJson,
};
use crate::AppState;
use axum::extract::{Multipart, Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Extension;
use axum::Json;
use business::domain::ai_provider::ProviderErrorKind;
use business::domain::body_analysis::BodyAnalysisResult;
use business::domain::user::User;
use business::use_cases::ai::analysis_job_use_case::{AnalysisJobUseCase, KIND_BODY, STATUS_COMPLETED, STATUS_FAILED};
use business::use_cases::body_analysis_use_case::BodyAnalysisUseCase;
use chrono::Utc;
use std::sync::Arc;
use uuid::Uuid;

fn status_code_for_error_code(code: &str) -> StatusCode {
    match code {
        "INVALID_IMAGE" => StatusCode::BAD_REQUEST,
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
        Json(BodyAnalysisErrorJson {
            error_code: error_code.to_string(),
            message: message.into(),
            request_id,
        }),
    )
        .into_response()
}

#[utoipa::path(
    post,
    tag = "BodyAnalysis",
    path = "/v1/body/analyze",
    responses(
        (status = 202, description = "Body analysis submitted; poll GET /v1/body/analyze/{analysis_id} for the result", body = BodyAnalysisStatusJson),
        (status = 400, description = "Invalid image file or parameters", body = BodyAnalysisErrorJson),
        (status = 401, description = "Unauthorized", body = BodyAnalysisErrorJson),
        (status = 429, description = "Quota exceeded", body = BodyAnalysisErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn analyze_body(
    State(state): State<AppState>,
    Extension(current_user): Extension<User>,
    mut multipart: Multipart,
) -> Response {
    let request_id = Uuid::new_v4().to_string();
    let mut image_bytes: Option<Vec<u8>> = None;
    let mut gender_hint: Option<String> = None;
    let mut goal_hint: Option<String> = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        if name == "image" || name == "file" {
            if let Ok(bytes) = field.bytes().await {
                image_bytes = Some(bytes.to_vec());
            }
        } else if name == "gender" || name == "gender_hint" {
            if let Ok(text) = field.text().await {
                if !text.trim().is_empty() {
                    gender_hint = Some(text.trim().to_string());
                }
            }
        } else if name == "goal" || name == "goal_hint" {
            if let Ok(text) = field.text().await {
                if !text.trim().is_empty() {
                    goal_hint = Some(text.trim().to_string());
                }
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
                "A valid body photograph image under field 'image' is required.",
            );
        }
    };

    let user_id = current_user.id.unwrap_or(0);
    let use_case = BodyAnalysisUseCase::new();

    let input = match use_case
        .prepare(&state.conn, user_id, &raw_bytes, gender_hint, goal_hint)
        .await
    {
        Ok(input) => input,
        Err(err) => {
            let status = status_code_for_error_code(err.kind.as_code());
            return error_response(request_id, status, err.kind.as_code(), err.message);
        }
    };

    let job_uuid = match AnalysisJobUseCase::create_pending(&state.conn, user_id, KIND_BODY).await {
        Ok(id) => id,
        Err(e) => {
            log::error!("Failed to create body analysis job: {}", e);
            return error_response(
                request_id,
                StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                "Failed to submit analysis job.",
            );
        }
    };

    use_case.spawn_analysis(Arc::clone(&state.conn), job_uuid, input);

    (
        StatusCode::ACCEPTED,
        Json(BodyAnalysisStatusJson {
            analysis_id: job_uuid.to_string(),
            status: "processing".to_string(),
        }),
    )
        .into_response()
}

#[utoipa::path(
    get,
    tag = "BodyAnalysis",
    path = "/v1/body/analyze/{analysis_id}",
    params(("analysis_id" = String, Path, description = "Job id returned by POST /v1/body/analyze")),
    responses(
        (status = 200, description = "Job status (processing) or completed body composition analysis", body = BodyAnalysisResponseV1),
        (status = 400, description = "Invalid analysis_id", body = BodyAnalysisErrorJson),
        (status = 401, description = "Unauthorized", body = BodyAnalysisErrorJson),
        (status = 404, description = "Analysis job not found", body = BodyAnalysisErrorJson),
        (status = 502, description = "AI provider or parse failure", body = BodyAnalysisErrorJson),
        (status = 504, description = "AI provider timeout", body = BodyAnalysisErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_body_analysis_status(
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
            log::error!("Failed to load body analysis job: {}", e);
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
            match serde_json::from_str::<BodyAnalysisResult>(&result_json) {
                Ok(result) => {
                    let response_v1 = BodyAnalysisResponseV1 {
                        schema_version: "1.0".to_string(),
                        provider: "internal".to_string(),
                        analysis_id,
                        status: "completed".to_string(),
                        body_fat: BodyFatEstimateJson {
                            estimated_percentage: result.body_fat.estimated_percentage,
                            category: result.body_fat.category,
                            confidence: result.body_fat.confidence,
                        },
                        muscle_mass: MuscleMassAnalysisJson {
                            development_level: result.muscle_mass.development_level,
                            key_strengths: result.muscle_mass.key_strengths,
                            areas_for_growth: result.muscle_mass.areas_for_growth,
                        },
                        body_metrics: BodyMetricsEstimateJson {
                            estimated_bmi: result.body_metrics.estimated_bmi,
                            somatotype: result.body_metrics.somatotype,
                            waist_to_hip_ratio_category: result.body_metrics.waist_to_hip_ratio_category,
                        },
                        measurements: BodyMeasurementsJson {
                            neck_cm: result.measurements.neck_cm,
                            waist_cm: result.measurements.waist_cm,
                            hip_cm: result.measurements.hip_cm,
                            confidence: result.measurements.confidence,
                        },
                        posture_and_symmetry: PostureAndSymmetryJson {
                            posture_observations: result.posture_and_symmetry.posture_observations,
                            symmetry_notes: result.posture_and_symmetry.symmetry_notes,
                        },
                        recommendations: BodyRecommendationsJson {
                            nutrition_tip: result.recommendations.nutrition_tip,
                            training_focus: result.recommendations.training_focus,
                        },
                        created_at: Utc::now().to_rfc3339(),
                    };
                    (StatusCode::OK, Json(response_v1)).into_response()
                }
                Err(e) => {
                    log::error!("Failed to deserialize stored body analysis result: {}", e);
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
            Json(BodyAnalysisStatusJson {
                analysis_id,
                status: other.to_string(),
            }),
        )
            .into_response(),
    }
}
