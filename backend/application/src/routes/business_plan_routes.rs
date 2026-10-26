use crate::authentication::authentication_middleware::authentication;
use crate::http::business_plan_controller::{
    add, delete, get_by_id, get_by_uuid, list_all, update,
};
use crate::AppState;
use axum::routing::{get, post};
use axum::{middleware, Router};

pub fn business_plan_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", post(add).get(list_all))
        .route("/{id}", get(get_by_id).put(update).delete(delete))
        .route("/uuid/{uuid}", get(get_by_uuid))
        .route_layer(middleware::from_fn_with_state(state, authentication))
}
