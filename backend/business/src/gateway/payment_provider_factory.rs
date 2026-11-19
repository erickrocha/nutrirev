//! Builds the Stripe provider client for a clinic, from its live connection.

use crate::domain::business_error::BusinessError;
use crate::domain::card_payment::PaymentMethod;
use crate::domain::card_submission::{CardProcessorResult, SensitiveCardData};
use crate::domain::card_token::{CardToken, TokenChargeRequest, TokenHolder};
use crate::domain::merchant_capabilities::{MerchantCapabilities, Provider};
use crate::domain::pix_payment::{PixChargeRequest, PixChargeResult, PixChargeState};
use crate::gateway::card_payment_gateway::CardPaymentGateway;
use crate::gateway::card_processor::{CardProcessor, CardProcessorError};
use crate::gateway::card_tokenizer::CardTokenizer;
use crate::gateway::payment_secret_resolver::PaymentSecretResolver;
use crate::gateway::pix_processor::{PixProcessor, PixProcessorError};
use crate::gateway::provider_customer::ProviderCustomerRegistry;
use crate::gateway::stripe_processor::StripeProcessor;
use entity::payment_merchant_entity as merchant;
use sea_orm::ConnectionTrait;

/// A clinic's live connection plus what it is allowed to do.
pub struct ActiveConnection {
    pub merchant: merchant::Model,
    pub provider: Provider,
    pub capabilities: MerchantCapabilities,
}

impl ActiveConnection {
    pub fn supports(&self, method: PaymentMethod) -> bool {
        self.capabilities.supports(method)
    }
}

pub struct StripeClient {
    processor: StripeProcessor,
}

impl StripeClient {
    pub fn new(processor: StripeProcessor) -> Self {
        Self { processor }
    }
}

#[async_trait::async_trait]
impl CardProcessor for StripeClient {
    async fn authorize(
        &self,
        submission: &crate::domain::card_submission::CardSubmission,
    ) -> Result<CardProcessorResult, CardProcessorError> {
        self.processor.authorize(submission).await
    }
}

#[async_trait::async_trait]
impl ProviderCustomerRegistry for StripeClient {
    async fn create_customer(&self, holder: &TokenHolder) -> Result<String, CardProcessorError> {
        self.processor.create_customer(holder).await
    }

    fn owns_customer_id(&self, provider_customer_id: &str) -> bool {
        self.processor.owns_customer_id(provider_customer_id)
    }
}

#[async_trait::async_trait]
impl PixProcessor for StripeClient {
    async fn create_charge(
        &self,
        request: &PixChargeRequest,
    ) -> Result<PixChargeResult, PixProcessorError> {
        self.processor.create_charge(request).await
    }

    async fn charge_status(
        &self,
        provider_payment_id: &str,
    ) -> Result<PixChargeState, PixProcessorError> {
        self.processor.charge_status(provider_payment_id).await
    }
}

#[async_trait::async_trait]
impl CardTokenizer for StripeClient {
    async fn tokenize(
        &self,
        card: &SensitiveCardData,
        holder: &TokenHolder,
    ) -> Result<CardToken, CardProcessorError> {
        self.processor.tokenize(card, holder).await
    }

    async fn charge_token(
        &self,
        provider_token: &str,
        request: &TokenChargeRequest,
    ) -> Result<CardProcessorResult, CardProcessorError> {
        self.processor.charge_token(provider_token, request).await
    }

    fn provider_name(&self) -> &'static str {
        "stripe"
    }
}

// Aliases for polymorphic compatibility
pub type CardClient = StripeClient;
pub type PspClient = StripeClient;

/// The clinic's live connection, or an error naming what is missing.
pub async fn active_connection<C: ConnectionTrait>(
    db: &C,
    tenant_id: i32,
    environment: &str,
) -> Result<ActiveConnection, BusinessError> {
    let merchant = CardPaymentGateway::active_merchant(db, tenant_id, environment)
        .await
        .map_err(|_| BusinessError::new("Unable to read merchant connection".to_owned()))?
        .ok_or_else(|| {
            BusinessError::new("No payment connection is enabled for this clinic".to_owned())
        })?;
    let provider = Provider::parse(&merchant.provider).ok_or_else(|| {
        BusinessError::new("Payment connection uses an unknown provider".to_owned())
    })?;
    let capabilities = MerchantCapabilities {
        credit: merchant.credit_enabled,
        pix: merchant.pix_enabled,
        recurring: merchant.recurring_enabled,
    };
    Ok(ActiveConnection {
        merchant,
        provider,
        capabilities,
    })
}

/// A card client for this connection, using that clinic's own credentials.
pub fn card_client<R: PaymentSecretResolver>(
    connection: &ActiveConnection,
    secrets: &R,
) -> Result<CardClient, BusinessError> {
    psp_client(connection, secrets)
}

/// The PSP client, for payer registration, Pix and stored cards.
pub fn psp_client<R: PaymentSecretResolver>(
    connection: &ActiveConnection,
    secrets: &R,
) -> Result<PspClient, BusinessError> {
    psp_client_for(&connection.merchant, connection.provider, secrets)
}

/// Builds a client directly from a merchant row.
pub fn psp_client_for<R: PaymentSecretResolver>(
    merchant: &merchant::Model,
    provider: Provider,
    secrets: &R,
) -> Result<PspClient, BusinessError> {
    if provider != Provider::Stripe {
        return Err(BusinessError::new(
            "Only Stripe is supported as payment provider".to_owned(),
        ));
    }
    let credentials = secrets
        .stripe(merchant.id)
        .map_err(|_| BusinessError::new("Payment merchant credentials are unavailable".to_owned()))?;
    let processor = StripeProcessor::new(credentials.secret_key.to_string(), &merchant.environment)
        .map_err(|_| BusinessError::new("Payment processor is unavailable".to_owned()))?;
    Ok(StripeClient::new(processor))
}
