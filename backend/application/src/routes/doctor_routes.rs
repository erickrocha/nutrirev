use axum::routing::{delete, get, post, put};
use axum::{middleware, Router};
use crate::AppState;
use crate::authentication::authentication_middleware::authentication;
use crate::http::doctor_controller::{add, delete as delete_doctor, get_by_id, get_by_uuid, list_all, update};

pub fn doctor_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", post(add))
        .route("/", get(list_all))
        .route("/{id}", get(get_by_id))
        .route("/uuid/{uuid}", get(get_by_uuid))
        .route("/{id}", put(update))
        .route("/{id}", delete(delete_doctor))
        .route_layer(middleware::from_fn_with_state(
            state,
            authentication,
        ))
}
