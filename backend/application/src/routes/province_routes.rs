use axum::routing::get;
use axum::{middleware, Router};
use crate::AppState;
use crate::authentication::authentication_middleware::authentication;
use crate::http::province_controller::{get_by_id, list_all};

pub fn province_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", get(list_all))
        .route("/{id}", get(get_by_id))
        .route_layer(middleware::from_fn_with_state(
            state,
            authentication,
        ))
}
