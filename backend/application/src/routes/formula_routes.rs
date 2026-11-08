use axum::extract::DefaultBodyLimit;
use axum::routing::{get, post, put};
use axum::{middleware, Router};
use crate::AppState;
use crate::authentication::authentication_middleware::authentication;
use crate::http::catalog_csv_import_controller::import_formulas;
use crate::http::formula_controller::{add, get_by_id, get_by_uuid, list_all, update};

const MAX_CSV_UPLOAD_SIZE: usize = 5 * 1024 * 1024;

pub fn formula_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", post(add))
        .route("/import", post(import_formulas))
        .route("/", get(list_all))
        .route("/{id}", get(get_by_id))
        .route("/uuid/{uuid}", get(get_by_uuid))
        .route("/{id}", put(update))
        .layer(DefaultBodyLimit::max(MAX_CSV_UPLOAD_SIZE))
        .route_layer(middleware::from_fn_with_state(
            state,
            authentication,
        ))
}
