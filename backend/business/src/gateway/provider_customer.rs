use crate::domain::card_token::TokenHolder;
use crate::gateway::card_processor::CardProcessorError;

/// Registering the payer at the provider.
///
/// Separate from the payment boundaries because it is the one provider call whose
/// result has to be written back to our own `customer` row, and because both the
/// Pix and the stored-card paths need it before they can charge anything.
#[async_trait::async_trait]
pub trait ProviderCustomerRegistry: Send + Sync {
    async fn create_customer(&self, holder: &TokenHolder) -> Result<String, CardProcessorError>;

    /// Whether a stored payer id was issued by this provider.
    ///
    /// The customer row holds one provider id. When a clinic switches acquirer,
    /// the id on file belongs to the previous one, and sending it to the new
    /// provider fails every payment for that patient. Returning `false` makes
    /// the caller register the payer again instead.
    fn owns_customer_id(&self, _provider_customer_id: &str) -> bool {
        true
    }
}
