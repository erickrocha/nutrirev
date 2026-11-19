use crate::authentication::authentication_middleware::authentication;
use crate::http::tenant_subscription_controller::{
    get_status, pay_card, pay_pix, platform_stripe_webhook, verify_payment,
};
use crate::AppState;
use axum::routing::{get, post};
use axum::{middleware, Router};

pub fn tenant_subscription_routes(state: AppState) -> Router<AppState> {
    let protected = Router::new()
        .route("/status", get(get_status))
        .route("/pay/pix", post(pay_pix))
        .route("/pay/card", post(pay_card))
        .route("/verify", post(verify_payment))
        .route_layer(middleware::from_fn_with_state(state.clone(), authentication));

    let public_webhook = Router::new().route("/webhook", post(platform_stripe_webhook));

    Router::new().merge(protected).merge(public_webhook)
}
