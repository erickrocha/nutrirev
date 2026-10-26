use axum::routing::{delete, get, post, put};
use axum::{middleware, Router};
use crate::AppState;
use crate::authentication::authentication_middleware::authentication;
use crate::http::meal_plan_controller::{
    add, delete as delete_meal_plan, get_by_id, get_by_uuid, list_all, list_paginated, toggle_favorite, update,
};

pub fn meal_plan_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", post(add))
        .route("/", get(list_all))
        .route("/page", get(list_paginated))
        .route("/{id}", get(get_by_id))
        .route("/uuid/{uuid}", get(get_by_uuid))
        .route("/{id}", put(update))
        .route("/{id}", delete(delete_meal_plan))
        .route("/{id}/toggle-favorite", post(toggle_favorite))
        .route_layer(middleware::from_fn_with_state(
            state,
            authentication,
        ))
}
