use axum::routing::{delete, get, post, put};
use axum::{middleware, Router};
use crate::AppState;
use crate::authentication::authentication_middleware::authentication;
use crate::http::eat_controller::{
    add, confirm_photo_upload, delete as delete_eat, get_by_id, get_by_uuid, get_photo_presigned_url, increment_additions, increment_views, list_all, list_paginated, update, upload_photo,
};

pub fn eat_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", post(add))
        .route("/", get(list_all))
        .route("/page", get(list_paginated))
        .route("/{id}", get(get_by_id))
        .route("/uuid/{uuid}", get(get_by_uuid))
        .route("/{id}", put(update))
        .route("/{id}", delete(delete_eat))
        .route("/{id}/photo", post(upload_photo))
        .route("/{id}/photo/presigned-url", post(get_photo_presigned_url))
        .route("/{id}/photo/confirm", post(confirm_photo_upload))
        .route("/{id}/view", post(increment_views))
        .route("/{id}/add", post(increment_additions))
        .route_layer(middleware::from_fn_with_state(
            state,
            authentication,
        ))
}
