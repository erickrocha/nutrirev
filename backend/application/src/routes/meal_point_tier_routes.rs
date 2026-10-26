use crate::authentication::authentication_middleware::authentication;
use crate::http::meal_point_tier_controller::{add, get_by_id, list_all, update};
use crate::AppState;
use axum::routing::{get, post, put};
use axum::{middleware, Router};

pub fn meal_point_tier_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", post(add))
        .route("/", get(list_all))
        .route("/{id}", get(get_by_id))
        .route("/{id}", put(update))
        .route_layer(middleware::from_fn_with_state(state, authentication))
}
