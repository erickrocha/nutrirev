use axum::extract::DefaultBodyLimit;
use axum::routing::{get, post};
use axum::{middleware, Router};
use crate::AppState;
use crate::authentication::authentication_middleware::authentication;
use crate::http::meal_analysis_controller::{
    analyze_meal, analyze_meal_manual, get_meal_analysis_status,
};

// Must stay in sync with ImageProcessor::MAX_UPLOAD_SIZE.
const MAX_UPLOAD_BODY_SIZE: usize = 10 * 1024 * 1024;

pub fn meal_analysis_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/analyze", post(analyze_meal))
        .route("/analyze/manual", post(analyze_meal_manual))
        .route("/analyze/{analysis_id}", get(get_meal_analysis_status))
        .layer(DefaultBodyLimit::max(MAX_UPLOAD_BODY_SIZE))
        .route_layer(middleware::from_fn_with_state(
            state,
            authentication,
        ))
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use axum::{
        body::Body,
        http::{Request, StatusCode},
        Router,
    };
    use business::sea_orm::DatabaseConnection;
    use tower::ServiceExt;

    use super::meal_analysis_routes;
    use crate::routes::meal_log_routes::meal_log_routes;
    use crate::AppState;

    #[tokio::test]
    async fn test_meal_analysis_and_log_routes_registered() {
        let state = AppState {
            conn: Arc::new(DatabaseConnection::default()),
        };

        let app = Router::new()
            .nest("/v1/meals", meal_analysis_routes(state.clone()))
            .nest("/v1/meals", meal_log_routes(state.clone()))
            .with_state(state);

        // Test POST /v1/meals/analyze/manual
        let res_manual = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/v1/meals/analyze/manual")
                    .header("content-type", "application/json")
                    .body(Body::from("{}"))
                    .unwrap(),
            )
            .await
            .unwrap();
        // Should hit authentication middleware (403 Forbidden), not 405 Method Not Allowed or 404 Not Found
        assert_eq!(res_manual.status(), StatusCode::FORBIDDEN);

        // Test GET /v1/meals/analyze/123
        let res_status = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/v1/meals/analyze/123")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res_status.status(), StatusCode::FORBIDDEN);

        // Test POST /v1/meals/log
        let res_log = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/v1/meals/log")
                    .header("content-type", "application/json")
                    .body(Body::from("{}"))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res_log.status(), StatusCode::FORBIDDEN);

        // Test GET /v1/meals/summary
        let res_summary = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/v1/meals/summary")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res_summary.status(), StatusCode::FORBIDDEN);
    }
}

