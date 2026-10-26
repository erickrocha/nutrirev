use axum::routing::{delete, get, post};
use axum::{middleware, Router};
use crate::AppState;
use crate::authentication::authentication_middleware::authentication;
use crate::http::customer_bowel_function_controller::{add, delete as del, get_by_customer_id, list_all};

pub fn customer_bowel_function_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", post(add))
        .route("/", get(list_all))
        .route("/customer/{customer_id}", get(get_by_customer_id))
        .route("/customer/{customer_id}/function/{bowel_function_id}", delete(del))
        .route_layer(middleware::from_fn_with_state(
            state,
            authentication,
        ))
}
