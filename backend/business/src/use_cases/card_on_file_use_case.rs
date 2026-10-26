//! Stored cards: saving one with consent, and charging it when nobody is present.
//!
//! The two halves have very different trust stories. Saving happens with the
//! cardholder in front of the screen, typing their own card. Charging happens in
//! a background worker, days or weeks later, against a token — no card, no user,
//! no request. That is why the worker path never touches `PaymentScope`, which
//! exists precisely to refuse to run without an authenticated user.

use chrono::{NaiveDate, Utc};
use entity::{
    payment_date_entity as subscription, payment_token_entity as token,
};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbConn, DbErr, EntityTrait, IntoActiveModel, QueryFilter, Set,
    TransactionTrait,
};

use crate::domain::business_error::BusinessError;
use crate::domain::card_payment::{error, AttemptStatus};
use crate::domain::card_submission::SensitiveCardData;
use crate::domain::card_token::{TokenChargeRequest, TokenHolder};
use crate::domain::payment_schedule::{unattended_idempotency_key, BillingMode};
use crate::gateway::billing_gateway::{BillingGateway, UnattendedCharge};
use crate::gateway::card_processor::CardProcessorError;
use crate::gateway::card_tokenizer::CardTokenizer;
use crate::use_cases::card_payment_use_case::CardPaymentUseCase;

/// What one unattended pass did, for the tick log.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct UnattendedReport {
    pub charged: u64,
    pub declined: u64,
    /// Attempts whose outcome is genuinely unknown. These are left holding the
    /// charge on purpose and need reconciliation, never a blind retry.
    pub uncertain: u64,
}

pub struct CardOnFileUseCase;

impl CardOnFileUseCase {
    /// Stores a card against a customer and points their subscription at it.
    ///
    /// Both halves land in one transaction: a token saved without the
    /// subscription switching over is a card the customer agreed to be charged
    /// on that nothing will ever charge, and the reverse is a subscription
    /// promising automatic payment with no card behind it.
    pub async fn enable_for_subscription<T: CardTokenizer>(
        db: &DbConn,
        tenant_id: i32,
        subscription_id: i32,
        card: &SensitiveCardData,
        holder: &TokenHolder,
        tokenizer: &T,
    ) -> Result<token::Model, BusinessError> {
        let row = subscription::Entity::find_by_id(subscription_id)
            .filter(subscription::Column::TenantId.eq(tenant_id))
            .one(db)
            .await
            .map_err(|_| error("Unable to read subscription"))?
            .ok_or_else(|| error("Subscription not found"))?;
        let customer_id = row
            .customer_id
            .ok_or_else(|| error("Subscription has no customer"))?;

        let stored = tokenizer
            .tokenize(card, holder)
            .await
            .map_err(|failure| match failure {
                CardProcessorError::Declined(_) => error("Card was declined"),
                _ => error("Payment provider is unavailable"),
            })?;

        let now = Utc::now();
        let tx = db
            .begin()
            .await
            .map_err(|_| error("Unable to store the card"))?;

        // Any card already on this subscription stops being chargeable. Leaving
        // it active would keep a card the customer believes they replaced.
        if let Some(previous) = row.payment_token_id {
            Self::revoke_token(&tx, tenant_id, previous).await?;
        }

        let saved = token::ActiveModel {
            tenant_id: Set(tenant_id),
            customer_id: Set(customer_id),
            provider: Set("asaas".into()),
            provider_token: Set(stored.provider_token),
            brand: Set(stored.brand),
            last4: Set(stored.last4),
            expiry_month: Set(stored.expiry_month.map(i32::from)),
            expiry_year: Set(stored.expiry_year.map(i32::from)),
            status: Set("active".into()),
            consent_at: Set(now),
            consent_ip: Set(Some(holder.remote_ip.clone())),
            created_at: Set(now),
            ..Default::default()
        }
        .insert(&tx)
        .await
        .map_err(|_| error("Unable to store the card"))?;

        let mut active = row.into_active_model();
        active.billing_mode = Set(BillingMode::CardOnFile.as_str().to_owned());
        active.payment_token_id = Set(Some(saved.id));
        active
            .update(&tx)
            .await
            .map_err(|_| error("Unable to enable automatic billing"))?;

        tx.commit()
            .await
            .map_err(|_| error("Unable to store the card"))?;
        Ok(saved)
    }

    /// Turns automatic billing off and revokes the stored card.
    ///
    /// A customer must be able to stop a stored-credential arrangement on their
    /// own; that is a card scheme requirement, not a nicety. Revoking and
    /// switching back to `manual` happen together — `ck_pd_token_requires_mode`
    /// would reject a subscription still naming a card in manual mode anyway.
    pub async fn disable_for_subscription(
        db: &DbConn,
        tenant_id: i32,
        subscription_id: i32,
    ) -> Result<(), BusinessError> {
        let tx = db
            .begin()
            .await
            .map_err(|_| error("Unable to change billing mode"))?;
        let row = subscription::Entity::find_by_id(subscription_id)
            .filter(subscription::Column::TenantId.eq(tenant_id))
            .one(&tx)
            .await
            .map_err(|_| error("Unable to read subscription"))?
            .ok_or_else(|| error("Subscription not found"))?;

        let previous = row.payment_token_id;
        let mut active = row.into_active_model();
        active.billing_mode = Set(BillingMode::Manual.as_str().to_owned());
        active.payment_token_id = Set(None);
        active
            .update(&tx)
            .await
            .map_err(|_| error("Unable to change billing mode"))?;
        if let Some(previous) = previous {
            Self::revoke_token(&tx, tenant_id, previous).await?;
        }
        tx.commit()
            .await
            .map_err(|_| error("Unable to change billing mode"))?;
        Ok(())
    }

    async fn revoke_token<C: sea_orm::ConnectionTrait>(
        tx: &C,
        tenant_id: i32,
        token_id: i32,
    ) -> Result<(), BusinessError> {
        let Some(existing) = token::Entity::find_by_id(token_id)
            .filter(token::Column::TenantId.eq(tenant_id))
            .one(tx)
            .await
            .map_err(|_| error("Unable to read the stored card"))?
        else {
            return Ok(());
        };
        let mut active = existing.into_active_model();
        active.status = Set("revoked".into());
        active
            .update(tx)
            .await
            .map_err(|_| error("Unable to revoke the stored card"))?;
        Ok(())
    }

    /// Charges every subscription that pays itself, for the cycles owed today.
    ///
    /// Safe to run on more than one instance. That safety is the database's:
    /// `unattended_idempotency_key` is deterministic per charge and day, and
    /// `uq_pa_key` makes the second instance's reservation collide and give up.
    pub async fn charge_due_subscriptions<T, F>(
        db: &DbConn,
        today: NaiveDate,
        tokenizer_for: F,
    ) -> Result<UnattendedReport, DbErr>
    where
        T: CardTokenizer,
        F: Fn(&UnattendedCharge) -> Option<T>,
    {
        let mut report = UnattendedReport::default();
        for due in BillingGateway::card_on_file_due(db, today).await? {
            let Some(tokenizer) = tokenizer_for(&due) else {
                // No usable provider connection for this clinic. Left alone: the
                // charge stays open and the existing grace period decides access.
                continue;
            };
            match Self::charge_one(db, &due, today, &tokenizer).await {
                Ok(AttemptStatus::Captured) => report.charged += 1,
                Ok(AttemptStatus::Declined) => report.declined += 1,
                Ok(_) => report.uncertain += 1,
                Err(error) => {
                    log::warn!(
                        "Unattended charge for charge {} could not run: {}",
                        due.charge_id,
                        error.message
                    );
                    report.uncertain += 1;
                }
            }
        }
        Ok(report)
    }

    async fn charge_one<T: CardTokenizer>(
        db: &DbConn,
        due: &UnattendedCharge,
        today: NaiveDate,
        tokenizer: &T,
    ) -> Result<AttemptStatus, BusinessError> {
        let provider_customer_id = due
            .provider_customer_id
            .clone()
            .ok_or_else(|| error("Customer is not registered with the provider"))?;
        let connection = crate::gateway::payment_provider_factory::active_connection(
            db,
            due.tenant_id,
            &crate::use_cases::pix_payment_use_case::provider_environment(),
        )
        .await?;
        if !connection.capabilities.recurring {
            // The clinic switched recurring off, or moved to an acquirer that
            // cannot store cards. Either way the worker stops charging: the
            // charge stays open and the patient pays it by hand.
            return Err(error("Recurring billing is not enabled for this clinic"));
        }

        let attempt = CardPaymentUseCase::prepare_unattended(
            db,
            due.tenant_id,
            due.charge_id,
            connection.merchant.id,
            unattended_idempotency_key(due.charge_id, today),
        )
        .await?;

        // A reservation that already ran today is not retried: its outcome is
        // whatever it was, and re-running it is how one cycle gets charged twice.
        if attempt.status != AttemptStatus::Prepared.as_str() {
            return AttemptStatus::parse(&attempt.status)
                .ok_or_else(|| error("Payment attempt is in an unknown state"));
        }

        CardPaymentUseCase::submit_unattended(
            db,
            due.tenant_id,
            attempt.id,
            TokenChargeRequest {
                reference: attempt.reference.clone(),
                amount_cents: attempt.amount_cents,
                provider_customer_id,
                description: format!("Charge {}", attempt.reference),
                installments: 1,
                consent_ip: None,
                consented_at: None,
            },
            &due.provider_token,
            tokenizer,
        )
        .await
    }
}

/// Reads a subscription only if it belongs to the calling patient.
///
/// The clinic-facing `/payment-date` routes are staff-only, so this is the one
/// door a patient has onto their own subscription. It resolves through
/// `customer.user_id` rather than trusting an id in the path: a clinic scope is
/// not proof of access to a given patient's billing.
pub async fn subscription_owned_by_user(
    db: &DbConn,
    tenant_id: i32,
    user_id: i32,
    subscription_id: i32,
) -> Result<Option<subscription::Model>, BusinessError> {
    let Some(row) = subscription::Entity::find_by_id(subscription_id)
        .filter(subscription::Column::TenantId.eq(tenant_id))
        .one(db)
        .await
        .map_err(|_| error("Unable to read subscription"))?
    else {
        return Ok(None);
    };
    let Some(customer_id) = row.customer_id else {
        return Ok(None);
    };
    let owns = entity::customer_entity::Entity::find_by_id(customer_id)
        .filter(entity::customer_entity::Column::TenantId.eq(tenant_id))
        .filter(entity::customer_entity::Column::UserId.eq(user_id))
        .one(db)
        .await
        .map_err(|_| error("Unable to validate subscription access"))?
        .is_some();
    Ok(owns.then_some(row))
}
