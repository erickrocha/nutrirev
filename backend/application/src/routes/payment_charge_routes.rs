use crate::authentication::authentication_middleware::authentication;
use crate::http::payment_charge_controller::{list_charges, list_reversals, prepare_charge};
use crate::AppState;
use axum::routing::{get, post};
use axum::{middleware, Router};

pub fn payment_charge_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/charges", get(list_charges))
        .route("/reversals", get(list_reversals))
        .route("/charges/{charge_id}/prepare", post(prepare_charge))
        .route_layer(middleware::from_fn_with_state(state, authentication))
}
