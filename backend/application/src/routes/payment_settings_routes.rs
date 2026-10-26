use crate::authentication::authentication_middleware::authentication;
use crate::http::payment_settings_controller::{
    admin_delete, admin_disable, admin_list, admin_update, list_connections, offered_methods,
    provision, select,
};
use crate::AppState;
use axum::routing::{delete, get, post, put};
use axum::{middleware, Router};

/// Provisioning is the platform operator's; choosing is the clinic's. The split
/// exists because `credentials_secret_ref` points at a deployment secret, and a
/// clinic-set pointer could name another clinic's credentials.
pub fn payment_settings_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/connections", post(provision))
        .route("/connections", get(list_connections))
        .route("/connections/selected", put(select))
        .route("/methods", get(offered_methods))
        // Platform operator: the full lifecycle of a connection.
        .route("/admin/connections", get(admin_list))
        .route("/admin/connections/{id}", put(admin_update))
        .route("/admin/connections/{id}", delete(admin_delete))
        .route("/admin/connections/{id}/disable", post(admin_disable))
        .route_layer(middleware::from_fn_with_state(state, authentication))
}
