use crate::authentication::authentication_middleware::authentication;
use crate::http::tenant_subscription_controller::{
    create_payment_intent, get_status, list_payments, pay_card, pay_pix, platform_stripe_webhook,
    verify_payment,
};
use crate::AppState;
use axum::routing::{get, post};
use axum::{middleware, Router};

pub fn tenant_subscription_routes(state: AppState) -> Router<AppState> {
    let protected = Router::new()
        .route("/status", get(get_status))
        .route("/intent", post(create_payment_intent))
        .route("/pay/pix", post(pay_pix))
        .route("/pay/card", post(pay_card))
        .route("/verify", post(verify_payment))
        .route("/payments", get(list_payments))
        .route_layer(middleware::from_fn_with_state(state.clone(), authentication));

    let public_webhook = Router::new().route("/webhook", post(platform_stripe_webhook));

    Router::new().merge(protected).merge(public_webhook)
}
