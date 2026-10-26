use crate::http::json::meal_analysis_json::MealAnalysisErrorJson;
use crate::http::json::points_json::PointsBalanceJson;
use crate::AppState;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Extension;
use axum::Json;
use business::domain::user::User;
use business::use_cases::ai::gamification_use_case::GamificationUseCase;
use uuid::Uuid;

#[utoipa::path(
    get,
    tag = "Points",
    path = "/v1/points/me",
    responses(
        (status = 200, description = "Current customer's points balance", body = PointsBalanceJson),
        (status = 401, description = "Unauthorized", body = MealAnalysisErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_my_balance(State(state): State<AppState>, Extension(current_user): Extension<User>) -> Response {
    let user_id = current_user.id.unwrap_or(0);

    match GamificationUseCase::get_balance(&state.conn, user_id).await {
        Ok(total_points) => Json(PointsBalanceJson { total_points }).into_response(),
        Err(e) => {
            log::error!("Failed to load points balance: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(MealAnalysisErrorJson {
                    error_code: "INTERNAL_ERROR".to_string(),
                    message: "Failed to load points balance.".to_string(),
                    request_id: Uuid::new_v4().to_string(),
                }),
            )
                .into_response()
        }
    }
}
