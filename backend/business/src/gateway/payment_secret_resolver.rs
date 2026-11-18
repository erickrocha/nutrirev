use crate::gateway::card_processor::CardProcessorError;
use zeroize::Zeroizing;

pub struct StripeCredentials {
    pub secret_key: Zeroizing<String>,
}

/// Resolves payment secrets for an attempt or merchant.
///
/// In this architecture, each tenant has their own encrypted Stripe credentials in the database,
/// which are decrypted via `PaymentKeyRing` in `application`.
pub trait PaymentSecretResolver: Send + Sync {
    /// The clinic's own Stripe secret key (`sk_test_...` / `sk_live_...`).
    fn stripe(&self, merchant_id: i32) -> Result<StripeCredentials, CardProcessorError>;

    /// The signing secret (`whsec_...`) of this clinic's Stripe webhook endpoint.
    fn stripe_webhook_secret(&self, merchant_id: i32) -> Result<Zeroizing<String>, CardProcessorError>;
}

/// Compares two secrets without leaking their contents through timing.
pub fn secrets_match(a: &str, b: &str) -> bool {
    let (a, b) = (a.as_bytes(), b.as_bytes());
    if a.len() != b.len() {
        return false;
    }
    a.iter()
        .zip(b)
        .fold(0u8, |acc, (x, y)| acc | (x ^ y))
        == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn secret_comparison_accepts_only_an_exact_match() {
        assert!(secrets_match("s3cret-token", "s3cret-token"));
        assert!(!secrets_match("s3cret-token", "s3cret-tokeN"));
        assert!(!secrets_match("s3cret-token", "s3cret-toke"));
        assert!(!secrets_match("", "x"));
        assert!(secrets_match("", ""));
    }
}
