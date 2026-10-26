use crate::authentication::authentication_middleware::authentication;
use crate::http::catalog_csv_import_controller::import_pre_existing_conditions;
use crate::http::pre_existing_conditions_controller::{
    add, get_by_id, get_by_uuid, list_all, update,
};
use crate::AppState;
use axum::extract::DefaultBodyLimit;
use axum::routing::{get, post, put};
use axum::{middleware, Router};

const MAX_CSV_UPLOAD_SIZE: usize = 5 * 1024 * 1024;

pub fn pre_existing_conditions_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", post(add))
        .route("/import", post(import_pre_existing_conditions))
        .route("/", get(list_all))
        .route("/{id}", get(get_by_id))
        .route("/uuid/{uuid}", get(get_by_uuid))
        .route("/{id}", put(update))
        .layer(DefaultBodyLimit::max(MAX_CSV_UPLOAD_SIZE))
        .route_layer(middleware::from_fn_with_state(state, authentication))
}
