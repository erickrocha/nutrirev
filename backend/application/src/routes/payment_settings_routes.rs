use crate::authentication::authentication_middleware::authentication;
use crate::http::payment_settings_controller::{get_settings, offered_methods, save_settings};
use crate::AppState;
use axum::routing::get;
use axum::{middleware, Router};

pub fn payment_settings_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/settings", get(get_settings).put(save_settings))
        .route("/methods", get(offered_methods))
        .route_layer(middleware::from_fn_with_state(state, authentication))
}
