use crate::authentication::authentication_middleware::authentication;
use crate::http::catalog_csv_import_controller::import_ingredients;
use crate::http::ingredient_controller::{
    add, delete as delete_ingredient, get_by_id, get_by_uuid, list_all, update,
};
use crate::AppState;
use axum::extract::DefaultBodyLimit;
use axum::routing::{delete, get, post, put};
use axum::{middleware, Router};

const MAX_CSV_UPLOAD_SIZE: usize = 5 * 1024 * 1024;

pub fn ingredient_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", post(add))
        .route("/import", post(import_ingredients))
        .route("/", get(list_all))
        .route("/{id}", get(get_by_id))
        .route("/uuid/{uuid}", get(get_by_uuid))
        .route("/{id}", put(update))
        .route("/{id}", delete(delete_ingredient))
        .layer(DefaultBodyLimit::max(MAX_CSV_UPLOAD_SIZE))
        .route_layer(middleware::from_fn_with_state(state, authentication))
}
