use axum::routing::{get, post, put};
use axum::{middleware, Router};
use crate::AppState;
use crate::authentication::authentication_middleware::authentication;
use crate::http::customer_controller::{
    add, confirm_photo_upload, delete_me, enable_mobile, get_by_id, get_by_user_id, get_by_uuid, get_me, get_photo_presigned_url, issue_invite, list_all, update, upload_photo,
};

pub fn customer_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", post(add))
        .route("/", get(list_all))
        .route("/me", get(get_me).delete(delete_me))
        .route("/{id}", get(get_by_id))
        .route("/uuid/{uuid}", get(get_by_uuid))
        .route("/user/{user_id}", get(get_by_user_id))
        .route("/{id}", put(update))
        .route("/{id}/enable-mobile", post(enable_mobile))
        .route("/{id}/invite", post(issue_invite))
        .route("/{id}/photo", post(upload_photo))
        .route("/{id}/photo/presigned-url", post(get_photo_presigned_url))
        .route("/{id}/photo/confirm", post(confirm_photo_upload))
        .route_layer(middleware::from_fn_with_state(
            state,
            authentication,
        ))
}
