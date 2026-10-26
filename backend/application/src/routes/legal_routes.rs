use crate::authentication::authentication_middleware::authentication;
use crate::http::legal_controller::{accept, list_documents, list_pending, publish};
use crate::AppState;
use axum::routing::{get, post};
use axum::{middleware, Router};

/// `/legal/documents` (GET) é público — a política precisa ser legível sem conta,
/// exigência das duas lojas. As demais exigem autenticação.
pub fn legal_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/legal/documents", get(list_documents).post(publish))
        .route("/legal/pending", get(list_pending))
        .route("/legal/accept", post(accept))
        .route_layer(middleware::from_fn_with_state(state, authentication))
}
