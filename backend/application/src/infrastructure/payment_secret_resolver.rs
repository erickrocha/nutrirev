use crate::infrastructure::payment_credentials::{PaymentKeyRing, StripeTenantCredentials};
use business::gateway::card_processor::CardProcessorError;
use business::gateway::payment_secret_resolver::{PaymentSecretResolver, StripeCredentials};
use entity::payment_merchant_entity as merchant;
use sea_orm::{DatabaseConnection, EntityTrait};
use std::sync::Arc;
use zeroize::Zeroizing;

/// Resolves Stripe credentials by fetching the tenant's encrypted row in `payment_merchant`
/// and decrypting it with `PaymentKeyRing`.
pub struct DatabasePaymentSecretResolver {
    db: Arc<DatabaseConnection>,
    keys: Arc<PaymentKeyRing>,
}

impl DatabasePaymentSecretResolver {
    pub fn new(db: Arc<DatabaseConnection>, keys: Arc<PaymentKeyRing>) -> Self {
        Self { db, keys }
    }

    async fn fetch_credentials(
        &self,
        merchant_id: i32,
    ) -> Result<StripeTenantCredentials, CardProcessorError> {
        let merchant = merchant::Entity::find_by_id(merchant_id)
            .one(self.db.as_ref())
            .await
            .map_err(|_| CardProcessorError::Configuration)?
            .ok_or(CardProcessorError::Configuration)?;

        let bytes = merchant.credentials.ok_or(CardProcessorError::Configuration)?;
        let key_version = merchant.key_version.ok_or(CardProcessorError::Configuration)?;

        self.keys
            .decrypt(merchant.tenant_id, &key_version, &bytes)
            .map_err(|_| CardProcessorError::Configuration)
    }
}

impl PaymentSecretResolver for DatabasePaymentSecretResolver {
    fn stripe(&self, merchant_id: i32) -> Result<StripeCredentials, CardProcessorError> {
        tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async {
                let creds = self.fetch_credentials(merchant_id).await?;
                Ok(StripeCredentials {
                    secret_key: Zeroizing::new(creds.secret_key),
                })
            })
        })
    }

    fn stripe_webhook_secret(
        &self,
        merchant_id: i32,
    ) -> Result<Zeroizing<String>, CardProcessorError> {
        tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async {
                let creds = self.fetch_credentials(merchant_id).await?;
                Ok(Zeroizing::new(creds.webhook_secret))
            })
        })
    }
}
