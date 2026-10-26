use crate::authentication::authentication_middleware::authentication;
use crate::http::card_payment_controller::authorize;
use crate::AppState;
use axum::routing::post;
use axum::{middleware, Router};

pub fn card_payment_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/{attempt_id}/authorize", post(authorize))
        .route_layer(middleware::from_fn_with_state(state, authentication))
}
