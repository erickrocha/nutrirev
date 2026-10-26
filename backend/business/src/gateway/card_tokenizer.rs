use crate::domain::card_submission::{CardProcessorResult, SensitiveCardData};
use crate::domain::card_token::{CardToken, TokenChargeRequest, TokenHolder};
use crate::gateway::card_processor::CardProcessorError;

/// Registering a card for later use, and charging it when nobody is present.
///
/// Split from `CardProcessor` because the two have different trust stories: that
/// one always runs with the cardholder in front of it, this one runs from a
/// background worker hours or weeks later.
#[async_trait::async_trait]
pub trait CardTokenizer: Send + Sync {
    /// Exchanges card data for an opaque token. The card is borrowed and dropped
    /// here; it must not be stored, logged, or returned in any form.
    async fn tokenize(
        &self,
        card: &SensitiveCardData,
        holder: &TokenHolder,
    ) -> Result<CardToken, CardProcessorError>;

    /// A merchant-initiated charge against a stored token.
    ///
    /// Shares `CardProcessorResult` with the customer-present path on purpose:
    /// downstream, a settled charge is a settled charge, and giving the worker
    /// its own outcome type would mean two settlement paths to keep in step.
    async fn charge_token(
        &self,
        provider_token: &str,
        request: &TokenChargeRequest,
    ) -> Result<CardProcessorResult, CardProcessorError>;
}

/// Lets a shared handle stand in for the tokenizer itself.
///
/// The billing worker resolves one provider client per clinic and reuses it
/// across that clinic's charges, so what it has to hand out is an `Arc`, not an
/// owned processor.
#[async_trait::async_trait]
impl<T: CardTokenizer + ?Sized> CardTokenizer for std::sync::Arc<T> {
    async fn tokenize(
        &self,
        card: &SensitiveCardData,
        holder: &TokenHolder,
    ) -> Result<CardToken, CardProcessorError> {
        (**self).tokenize(card, holder).await
    }

    async fn charge_token(
        &self,
        provider_token: &str,
        request: &TokenChargeRequest,
    ) -> Result<CardProcessorResult, CardProcessorError> {
        (**self).charge_token(provider_token, request).await
    }
}
