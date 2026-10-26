use crate::authentication::authentication_middleware::authentication;
use crate::http::meal_log_controller::{get_daily_summary, list_meal_logs, save_meal_log};
use crate::AppState;
use axum::routing::{get, post};
use axum::{middleware, Router};

pub fn meal_log_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/log", post(save_meal_log).get(list_meal_logs))
        .route("/summary", get(get_daily_summary))
        .route_layer(middleware::from_fn_with_state(state, authentication))
}
