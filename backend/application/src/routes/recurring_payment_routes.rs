use crate::authentication::authentication_middleware::authentication;
use crate::http::recurring_payment_controller::{
    billing_mode, disable_recurring, enable_recurring,
};
use crate::AppState;
use axum::routing::{delete, get, post};
use axum::{middleware, Router};

/// The patient's own billing-mode routes. Every handler resolves the
/// subscription through `customer.user_id`, so a patient reaches theirs and no
/// one else's — the clinic-wide `/payment-date` routes stay staff-only.
pub fn recurring_payment_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/subscriptions/{subscription_id}/card", post(enable_recurring))
        .route("/subscriptions/{subscription_id}/card", delete(disable_recurring))
        .route("/subscriptions/{subscription_id}/billing", get(billing_mode))
        .route_layer(middleware::from_fn_with_state(state, authentication))
}
