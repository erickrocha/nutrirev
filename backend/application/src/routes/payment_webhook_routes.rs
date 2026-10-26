use crate::http::payment_webhook_controller::asaas;
use crate::AppState;
use axum::routing::post;
use axum::Router;

/// Provider callbacks. Deliberately built **without** `route_layer(authentication)`.
///
/// There is no global auth layer in this application — every other router
/// attaches its own — so leaving it off here is all it takes, and the
/// authentication middleware's public-path allow-list stays untouched. That
/// matters: the allow-list matches by prefix, and anyone widening
/// `/v1/payments/webhooks` to `/v1/payments` there would silently unauthenticate
/// the charge listing and the prepare endpoint sitting on the same prefix.
///
/// The handler authenticates each callback itself, against the clinic's own
/// per-merchant secret.
pub fn payment_webhook_routes() -> Router<AppState> {
    Router::new().route("/asaas", post(asaas))
}
