use crate::http::payment_webhook_controller::stripe;
use crate::AppState;
use axum::routing::post;
use axum::Router;

/// Provider callbacks. Deliberately built **without** `route_layer(authentication)`.
///
/// The handler authenticates each callback itself, against the clinic's own
/// Stripe webhook secret (decrypted from the database using the tenant's key).
pub fn payment_webhook_routes() -> Router<AppState> {
    Router::new().route("/stripe", post(stripe))
}
