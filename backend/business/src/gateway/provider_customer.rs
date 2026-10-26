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
}
