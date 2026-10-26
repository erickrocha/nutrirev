use crate::domain::card_submission::{CardProcessorResult, CardSubmission};

#[derive(Debug, PartialEq, Eq)]
pub enum CardProcessorError {
    Declined(CardProcessorResult),
    Unknown,
    Configuration,
}

#[async_trait::async_trait]
pub trait CardProcessor: Send + Sync {
    async fn authorize(
        &self,
        submission: &CardSubmission,
    ) -> Result<CardProcessorResult, CardProcessorError>;
}
