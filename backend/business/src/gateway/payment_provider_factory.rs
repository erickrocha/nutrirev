//! Builds the right provider client for a clinic, from its live connection.
//!
//! Before this, each payment path named its own acquirer in code: the card
//! checkout asked for Rede, Pix asked for the PSP. A clinic set up with only one
//! of them could not use the other half of the product. The acquirer is now the
//! clinic's choice, resolved here, once.

use crate::domain::business_error::BusinessError;
use crate::domain::card_payment::PaymentMethod;
use crate::domain::merchant_capabilities::{MerchantCapabilities, Provider};
use crate::gateway::asaas_processor::AsaasProcessor;
use crate::gateway::card_payment_gateway::CardPaymentGateway;
use crate::gateway::payment_secret_resolver::PaymentSecretResolver;
use crate::gateway::rede_card_processor::RedeSandboxProcessor;
use crate::gateway::stripe_processor::StripeProcessor;
use crate::domain::card_submission::{CardProcessorResult, SensitiveCardData};
use crate::domain::card_token::{CardToken, TokenChargeRequest, TokenHolder};
use crate::domain::pix_payment::{PixChargeRequest, PixChargeResult, PixChargeState};
use crate::gateway::card_processor::CardProcessorError;
use crate::gateway::card_tokenizer::CardTokenizer;
use crate::gateway::pix_processor::{PixProcessor, PixProcessorError};
use crate::gateway::provider_customer::ProviderCustomerRegistry;
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

/// Any acquirer, behind the card boundary.
///
/// An enum rather than a boxed trait object: the set is closed by a database
/// check constraint, and a match here is what makes adding another acquirer a
/// compile error instead of a silent gap.
pub enum CardClient {
    Rede(RedeSandboxProcessor),
    Asaas(AsaasProcessor),
    Stripe(StripeProcessor),
}

#[async_trait::async_trait]
impl crate::gateway::card_processor::CardProcessor for CardClient {
    async fn authorize(
        &self,
        submission: &crate::domain::card_submission::CardSubmission,
    ) -> Result<
        crate::domain::card_submission::CardProcessorResult,
        crate::gateway::card_processor::CardProcessorError,
    > {
        match self {
            Self::Rede(processor) => processor.authorize(submission).await,
            Self::Asaas(processor) => processor.authorize(submission).await,
            Self::Stripe(processor) => processor.authorize(submission).await,
        }
    }
}

/// The acquirers that can register payers, issue Pix and store cards.
///
/// One type for all three roles because they are always the same account:
/// the payer registered here is the one the Pix charge or stored card belongs
/// to. The card-only acquirer has no variant, so asking it for Pix or a stored
/// card fails when the client is built, not in front of a patient.
pub enum PspClient {
    Asaas(AsaasProcessor),
    Stripe(StripeProcessor),
}

impl PspClient {
    pub fn provider(&self) -> Provider {
        match self {
            Self::Asaas(_) => Provider::Asaas,
            Self::Stripe(_) => Provider::Stripe,
        }
    }
}

#[async_trait::async_trait]
impl ProviderCustomerRegistry for PspClient {
    async fn create_customer(&self, holder: &TokenHolder) -> Result<String, CardProcessorError> {
        match self {
            Self::Asaas(processor) => processor.create_customer(holder).await,
            Self::Stripe(processor) => processor.create_customer(holder).await,
        }
    }

    fn owns_customer_id(&self, provider_customer_id: &str) -> bool {
        match self {
            Self::Asaas(processor) => processor.owns_customer_id(provider_customer_id),
            Self::Stripe(processor) => processor.owns_customer_id(provider_customer_id),
        }
    }
}

#[async_trait::async_trait]
impl PixProcessor for PspClient {
    async fn create_charge(
        &self,
        request: &PixChargeRequest,
    ) -> Result<PixChargeResult, PixProcessorError> {
        match self {
            Self::Asaas(processor) => processor.create_charge(request).await,
            Self::Stripe(processor) => processor.create_charge(request).await,
        }
    }

    async fn charge_status(
        &self,
        provider_payment_id: &str,
    ) -> Result<PixChargeState, PixProcessorError> {
        match self {
            Self::Asaas(processor) => processor.charge_status(provider_payment_id).await,
            Self::Stripe(processor) => processor.charge_status(provider_payment_id).await,
        }
    }
}

#[async_trait::async_trait]
impl CardTokenizer for PspClient {
    async fn tokenize(
        &self,
        card: &SensitiveCardData,
        holder: &TokenHolder,
    ) -> Result<CardToken, CardProcessorError> {
        match self {
            Self::Asaas(processor) => processor.tokenize(card, holder).await,
            Self::Stripe(processor) => processor.tokenize(card, holder).await,
        }
    }

    async fn charge_token(
        &self,
        provider_token: &str,
        request: &TokenChargeRequest,
    ) -> Result<CardProcessorResult, CardProcessorError> {
        match self {
            Self::Asaas(processor) => processor.charge_token(provider_token, request).await,
            Self::Stripe(processor) => processor.charge_token(provider_token, request).await,
        }
    }

    fn provider_name(&self) -> &'static str {
        self.provider().as_str()
    }
}

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
    let secret_ref = &connection.merchant.credentials_secret_ref;
    match connection.provider {
        Provider::Rede => {
            let credentials = secrets.rede_sandbox(secret_ref).map_err(|_| {
                BusinessError::new("Payment merchant credentials are unavailable".to_owned())
            })?;
            RedeSandboxProcessor::new(
                credentials.client_id.to_string(),
                credentials.client_secret.to_string(),
            )
            .map(CardClient::Rede)
            .map_err(|_| BusinessError::new("Payment processor is unavailable".to_owned()))
        }
        Provider::Asaas | Provider::Stripe => {
            psp_client(connection, secrets).map(|client| match client {
                PspClient::Asaas(processor) => CardClient::Asaas(processor),
                PspClient::Stripe(processor) => CardClient::Stripe(processor),
            })
        }
    }
}

/// The PSP client, for the paths only a PSP can serve: payer registration, Pix
/// and stored cards.
pub fn psp_client<R: PaymentSecretResolver>(
    connection: &ActiveConnection,
    secrets: &R,
) -> Result<PspClient, BusinessError> {
    psp_client_for(&connection.merchant, connection.provider, secrets)
}

/// Same as `psp_client`, from a merchant row alone.
///
/// The webhook path has a merchant row (the one the attempt was made with) but
/// no live connection: the clinic may have switched acquirer since, and the
/// read-back must still go to the provider that took the payment.
pub fn psp_client_for<R: PaymentSecretResolver>(
    merchant: &merchant::Model,
    provider: Provider,
    secrets: &R,
) -> Result<PspClient, BusinessError> {
    let unavailable = || BusinessError::new("Payment merchant credentials are unavailable".to_owned());
    let secret_ref = &merchant.credentials_secret_ref;
    match provider {
        Provider::Asaas => {
            let credentials = secrets.asaas(secret_ref).map_err(|_| unavailable())?;
            AsaasProcessor::new(credentials.api_key.to_string(), &merchant.environment)
                .map(PspClient::Asaas)
                .map_err(|_| BusinessError::new("Payment processor is unavailable".to_owned()))
        }
        Provider::Stripe => {
            let credentials = secrets.stripe(secret_ref).map_err(|_| unavailable())?;
            StripeProcessor::new(credentials.secret_key.to_string(), &merchant.environment)
                .map(PspClient::Stripe)
                .map_err(|_| BusinessError::new("Payment processor is unavailable".to_owned()))
        }
        Provider::Rede => Err(BusinessError::new(
            "This payment method is not available for the clinic's acquirer".to_owned(),
        )),
    }
}
