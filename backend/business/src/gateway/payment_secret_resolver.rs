use crate::gateway::card_processor::CardProcessorError;
use zeroize::Zeroizing;

pub struct RedeCredentials {
    pub client_id: Zeroizing<String>,
    pub client_secret: Zeroizing<String>,
}

pub struct AsaasCredentials {
    pub api_key: Zeroizing<String>,
}

pub trait PaymentSecretResolver: Send + Sync {
    fn rede_sandbox(&self, secret_ref: &str) -> Result<RedeCredentials, CardProcessorError>;

    /// The clinic's own Asaas API key.
    fn asaas(&self, secret_ref: &str) -> Result<AsaasCredentials, CardProcessorError>;

    /// The shared secret this clinic's Asaas account sends back on a webhook.
    ///
    /// Per merchant, never one global value. A single shared token would be
    /// configured in every clinic's Asaas panel, so anyone holding it could post
    /// a forged "payment received" naming another clinic's payment and settle a
    /// charge that was never paid. Resolving the tenant from our own row does not
    /// help — the forger picks the row.
    fn asaas_webhook_token(&self, secret_ref: &str) -> Result<Zeroizing<String>, CardProcessorError>;
}

/// Environment-variable resolver. A reference such as `rede/clinic-a` maps to
/// `PAYMENT_SECRET_REDE_CLINIC_A_*`, and `asaas/clinic-a` to
/// `PAYMENT_SECRET_ASAAS_CLINIC_A_API_KEY` / `_WEBHOOK_TOKEN`.
///
/// Replace with the deployment secret manager before production; nothing outside
/// this file knows where a credential comes from.
pub struct EnvironmentPaymentSecretResolver;

/// `rede/clinic-a` -> `PAYMENT_SECRET_REDE_CLINIC_A`.
///
/// Rejects anything outside the reference alphabet rather than sanitising it: a
/// reference is read from the database, and letting it shape an arbitrary
/// environment-variable name is how a merchant row reaches another clinic's
/// credentials.
fn env_prefix(secret_ref: &str) -> Result<String, CardProcessorError> {
    if secret_ref.is_empty()
        || !secret_ref
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'/' | b'-' | b'_'))
    {
        return Err(CardProcessorError::Configuration);
    }
    let key = secret_ref
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() {
                c.to_ascii_uppercase()
            } else {
                '_'
            }
        })
        .collect::<String>();
    Ok(format!("PAYMENT_SECRET_{key}"))
}

fn required(name: &str) -> Result<Zeroizing<String>, CardProcessorError> {
    let value = std::env::var(name).map_err(|_| CardProcessorError::Configuration)?;
    if value.is_empty() {
        return Err(CardProcessorError::Configuration);
    }
    Ok(Zeroizing::new(value))
}

impl PaymentSecretResolver for EnvironmentPaymentSecretResolver {
    fn rede_sandbox(&self, secret_ref: &str) -> Result<RedeCredentials, CardProcessorError> {
        let prefix = env_prefix(secret_ref)?;
        Ok(RedeCredentials {
            client_id: required(&format!("{prefix}_CLIENT_ID"))?,
            client_secret: required(&format!("{prefix}_CLIENT_SECRET"))?,
        })
    }

    fn asaas(&self, secret_ref: &str) -> Result<AsaasCredentials, CardProcessorError> {
        let prefix = env_prefix(secret_ref)?;
        Ok(AsaasCredentials {
            api_key: required(&format!("{prefix}_API_KEY"))?,
        })
    }

    fn asaas_webhook_token(
        &self,
        secret_ref: &str,
    ) -> Result<Zeroizing<String>, CardProcessorError> {
        let prefix = env_prefix(secret_ref)?;
        required(&format!("{prefix}_WEBHOOK_TOKEN"))
    }
}

/// Compares two secrets without leaking their contents through timing.
///
/// A webhook token is checked on every callback, by an unauthenticated caller who
/// controls one side of the comparison. `==` on `str` short-circuits at the first
/// differing byte, which is enough to recover a token one character at a time.
/// Length is not secret here — the tokens are fixed-length — but the contents are.
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
    fn derives_the_variable_prefix_from_a_reference() {
        assert_eq!(env_prefix("rede/clinic-a").unwrap(), "PAYMENT_SECRET_REDE_CLINIC_A");
        assert_eq!(env_prefix("asaas/clinic-a").unwrap(), "PAYMENT_SECRET_ASAAS_CLINIC_A");
    }

    #[test]
    fn secret_comparison_accepts_only_an_exact_match() {
        assert!(secrets_match("s3cret-token", "s3cret-token"));
        assert!(!secrets_match("s3cret-token", "s3cret-tokeN"));
        assert!(!secrets_match("s3cret-token", "s3cret-toke"));
        assert!(!secrets_match("", "x"));
        assert!(secrets_match("", ""));
    }

    #[test]
    fn rejects_a_reference_that_could_reshape_the_variable_name() {
        // The reference comes out of the merchant row. If it could carry these,
        // one clinic's row could name another clinic's environment variable.
        assert!(env_prefix("").is_err());
        assert!(env_prefix("rede/clinic a").is_err());
        assert!(env_prefix("rede/../other").is_err());
        assert!(env_prefix("rede/clinic$a").is_err());
    }
}
