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

/// Either acquirer, behind the card boundary.
///
/// An enum rather than a boxed trait object: there are exactly two, the set is
/// closed by a database check constraint, and a match here is what makes adding
/// a third a compile error instead of a silent gap.
pub enum CardClient {
    Rede(RedeSandboxProcessor),
    Asaas(AsaasProcessor),
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
        }
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
        Provider::Asaas => asaas_client(connection, secrets).map(CardClient::Asaas),
    }
}

/// The PSP client, for the paths only it can serve: Pix and stored cards.
pub fn asaas_client<R: PaymentSecretResolver>(
    connection: &ActiveConnection,
    secrets: &R,
) -> Result<AsaasProcessor, BusinessError> {
    if connection.provider != Provider::Asaas {
        return Err(BusinessError::new(
            "This payment method is not available for the clinic's acquirer".to_owned(),
        ));
    }
    let credentials = secrets
        .asaas(&connection.merchant.credentials_secret_ref)
        .map_err(|_| {
            BusinessError::new("Payment merchant credentials are unavailable".to_owned())
        })?;
    AsaasProcessor::new(
        credentials.api_key.to_string(),
        &connection.merchant.environment,
    )
    .map_err(|_| BusinessError::new("Payment processor is unavailable".to_owned()))
}
