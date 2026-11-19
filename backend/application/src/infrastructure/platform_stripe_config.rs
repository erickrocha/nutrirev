#[derive(Clone, Debug)]
pub struct PlatformStripeConfig {
    pub secret_key: String,
    pub publishable_key: String,
    pub webhook_secret: String,
    pub environment: String,
    pub grace_period_days: i64,
}

impl PlatformStripeConfig {
    pub fn from_env() -> Self {
        let secret_key = std::env::var("PLATFORM_STRIPE_SECRET_KEY")
            .unwrap_or_else(|_| "sk_test_placeholder_platform_secret_key_nutrirev".to_string());
        let publishable_key = std::env::var("PLATFORM_STRIPE_PUBLISHABLE_KEY")
            .unwrap_or_else(|_| "pk_test_placeholder_platform_pub_key_nutrirev".to_string());
        let webhook_secret = std::env::var("PLATFORM_STRIPE_WEBHOOK_SECRET")
            .unwrap_or_else(|_| "whsec_placeholder_platform_webhook_secret".to_string());
        let environment = std::env::var("PLATFORM_STRIPE_ENVIRONMENT")
            .unwrap_or_else(|_| "sandbox".to_string());
        let grace_period_days = std::env::var("TENANT_SUBSCRIPTION_GRACE_PERIOD_DAYS")
            .ok()
            .and_then(|v| v.parse::<i64>().ok())
            .unwrap_or(5);

        Self {
            secret_key,
            publishable_key,
            webhook_secret,
            environment,
            grace_period_days,
        }
    }
}
