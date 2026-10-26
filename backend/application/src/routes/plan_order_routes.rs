use crate::authentication::authentication_middleware::authentication;
use crate::http::plan_order_controller::{
    cancel_order, convert_order, create_order, get_order, get_public_plan, list_orders,
};
use crate::AppState;
use axum::routing::{get, post};
use axum::{middleware, Router};

/// Tela de contratação da landing: sem login. O middleware roda só para injetar o locale
/// e libera o prefixo `/public/` (ver `authentication_middleware`).
pub fn public_plan_order_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/public/business-plans/{uuid}", get(get_public_plan))
        .route("/public/orders", post(create_order))
        .route_layer(middleware::from_fn_with_state(state, authentication))
}

/// Gestão dos pedidos pelo SysAdmin.
pub fn plan_order_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", get(list_orders))
        .route("/{uuid}", get(get_order))
        .route("/{uuid}/convert", post(convert_order))
        .route("/{uuid}/cancel", post(cancel_order))
        .route_layer(middleware::from_fn_with_state(state, authentication))
}
