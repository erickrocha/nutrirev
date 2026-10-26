use axum::extract::DefaultBodyLimit;
use axum::routing::{get, post};
use axum::{middleware, Router};
use crate::AppState;
use crate::authentication::authentication_middleware::authentication;
use crate::http::body_analysis_controller::{analyze_body, get_body_analysis_status};

// Must stay in sync with ImageProcessor::MAX_UPLOAD_SIZE.
const MAX_UPLOAD_BODY_SIZE: usize = 10 * 1024 * 1024;

pub fn body_analysis_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/analyze", post(analyze_body))
        .route("/analyze/{analysis_id}", get(get_body_analysis_status))
        .layer(DefaultBodyLimit::max(MAX_UPLOAD_BODY_SIZE))
        .route_layer(middleware::from_fn_with_state(
            state,
            authentication,
        ))
}
