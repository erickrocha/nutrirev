use crate::authentication::authentication_middleware::authentication;
use crate::http::points_controller::get_my_balance;
use crate::AppState;
use axum::routing::get;
use axum::{middleware, Router};

pub fn points_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/me", get(get_my_balance))
        .route_layer(middleware::from_fn_with_state(state, authentication))
}
