use crate::authentication::authentication_middleware::authentication;
use crate::http::pix_payment_controller::{attempt_status, cancel, create_pix_charge};
use crate::AppState;
use axum::routing::{get, post};
use axum::{middleware, Router};

pub fn pix_payment_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/charges/{charge_id}/pix", post(create_pix_charge))
        .route("/attempts/{attempt_id}", get(attempt_status))
        .route("/attempts/{attempt_id}/cancel", post(cancel))
        .route_layer(middleware::from_fn_with_state(state, authentication))
}
