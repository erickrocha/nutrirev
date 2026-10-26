use crate::domain::pix_payment::{PixChargeRequest, PixChargeResult, PixChargeState};

/// Why a Pix operation did not produce a usable charge.
///
/// `Unknown` exists for the same reason it does on the card boundary: a request
/// that may or may not have reached the provider must never be retried blindly.
/// A Pix charge created twice is two QR codes against one invoice, and the
/// customer can pay both.
#[derive(Debug, PartialEq, Eq)]
pub enum PixProcessorError {
    Rejected(String),
    Unknown,
    Configuration,
}

#[async_trait::async_trait]
pub trait PixProcessor: Send + Sync {
    async fn create_charge(
        &self,
        request: &PixChargeRequest,
    ) -> Result<PixChargeResult, PixProcessorError>;

    /// Reconciliation read, used when the webhook has not arrived and the
    /// customer is still looking at the QR. The provider is authoritative here;
    /// our row is not.
    async fn charge_status(
        &self,
        provider_payment_id: &str,
    ) -> Result<PixChargeState, PixProcessorError>;
}
