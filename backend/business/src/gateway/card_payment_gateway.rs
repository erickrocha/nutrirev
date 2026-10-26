//! Payment reads and row locks, scoped to one clinic by an explicit tenant id.
//!
//! These take `tenant_id: i32` rather than a `PaymentScope` on purpose. The scope
//! type is the *request-path* gate — it refuses to exist without an authenticated
//! user, which is exactly what makes it useless to the billing worker and to the
//! provider webhook, neither of which has one. Passing the id keeps those callers
//! working without inventing a `PaymentScope::system(..)` escape hatch, which
//! would turn the type's one safety property ("missing context never means
//! unrestricted") into a lie the next caller would reach for.
//!
//! Request-path callers pass `scope.tenant_id()`, so the gate stays where it was.
//! Same reasoning as `billing_gateway`.

use entity::{
    payment_attempt_entity as attempt, payment_charge_entity as charge,
    payment_merchant_entity as merchant,
};
use sea_orm::{ColumnTrait, ConnectionTrait, DbErr, EntityTrait, QueryFilter, QuerySelect};

pub struct CardPaymentGateway;

impl CardPaymentGateway {
    pub async fn attempt_for_update<C: ConnectionTrait>(
        db: &C,
        tenant_id: i32,
        id: i32,
    ) -> Result<Option<attempt::Model>, DbErr> {
        attempt::Entity::find_by_id(id)
            .filter(attempt::Column::TenantId.eq(tenant_id))
            .lock_exclusive()
            .one(db)
            .await
    }

    /// Plain read, no row lock. For the polling and cancel paths, which must not
    /// take an exclusive lock on the hot payment table just to look.
    pub async fn attempt_for_read<C: ConnectionTrait>(
        db: &C,
        tenant_id: i32,
        id: i32,
    ) -> Result<Option<attempt::Model>, DbErr> {
        attempt::Entity::find_by_id(id)
            .filter(attempt::Column::TenantId.eq(tenant_id))
            .one(db)
            .await
    }

    /// The merchant a specific attempt was reserved against.
    ///
    /// Deliberately does not filter on provider or environment: the id already
    /// names one row, and filtering would silently return `None` for a merchant
    /// belonging to the other acquirer. `enabled` still applies — a disabled
    /// connection must not process anything.
    pub async fn merchant_by_id<C: ConnectionTrait>(
        db: &C,
        tenant_id: i32,
        id: i32,
    ) -> Result<Option<merchant::Model>, DbErr> {
        merchant::Entity::find_by_id(id)
            .filter(merchant::Column::TenantId.eq(tenant_id))
            .filter(merchant::Column::Status.eq("enabled"))
            .one(db)
            .await
    }

    pub async fn charge_for_update<C: ConnectionTrait>(
        db: &C,
        tenant_id: i32,
        id: i32,
    ) -> Result<Option<charge::Model>, DbErr> {
        charge::Entity::find_by_id(id)
            .filter(charge::Column::TenantId.eq(tenant_id))
            .lock_exclusive()
            .one(db)
            .await
    }

    pub async fn attempt_by_key<C: ConnectionTrait>(
        db: &C,
        tenant_id: i32,
        key: &str,
    ) -> Result<Option<attempt::Model>, DbErr> {
        attempt::Entity::find()
            .filter(attempt::Column::TenantId.eq(tenant_id))
            .filter(attempt::Column::IdempotencyKey.eq(key))
            .one(db)
            .await
    }

    pub async fn active_attempt<C: ConnectionTrait>(
        db: &C,
        tenant_id: i32,
        charge_id: i32,
    ) -> Result<Option<attempt::Model>, DbErr> {
        attempt::Entity::find()
            .filter(attempt::Column::TenantId.eq(tenant_id))
            .filter(attempt::Column::ActiveChargeId.eq(charge_id))
            .one(db)
            .await
    }

    /// The attempt carrying this reference, across every tenant.
    ///
    /// The one lookup here that is deliberately not tenant-scoped, because it is
    /// what *establishes* the tenant: a provider callback arrives with no
    /// authenticated context, and `uq_pa_reference` is globally unique, so the
    /// reference we generated identifies exactly one clinic's attempt. The
    /// caller must then verify that clinic's own webhook secret before acting —
    /// finding the row proves whose it is, not that the caller may touch it.
    pub async fn attempt_by_reference<C: ConnectionTrait>(
        db: &C,
        reference: &str,
    ) -> Result<Option<attempt::Model>, DbErr> {
        if reference.is_empty() {
            return Ok(None);
        }
        attempt::Entity::find()
            .filter(attempt::Column::Reference.eq(reference))
            .one(db)
            .await
    }

/// The clinic's live acquirer connection, whichever provider that is.
    ///
    /// One per clinic and environment, guaranteed by `uq_pm_one_active` rather
    /// than by anyone remembering to disable the old one. This replaces asking
    /// for a named provider: the clinic chooses its acquirer, and every payment
    /// path resolves it here instead of hardcoding one.
    pub async fn active_merchant<C: ConnectionTrait>(
        db: &C,
        tenant_id: i32,
        environment: &str,
    ) -> Result<Option<merchant::Model>, DbErr> {
        merchant::Entity::find()
            .filter(merchant::Column::TenantId.eq(tenant_id))
            .filter(merchant::Column::Environment.eq(environment))
            .filter(merchant::Column::Status.eq("enabled"))
            .one(db)
            .await
    }

    /// The clinic's enabled connection to one acquirer in one environment.
    ///
    /// `uq_pm_provider` makes that at most one row, so this never has to choose.
    pub async fn enabled_merchant<C: ConnectionTrait>(
        db: &C,
        tenant_id: i32,
        provider: &str,
        environment: &str,
    ) -> Result<Option<merchant::Model>, DbErr> {
        merchant::Entity::find()
            .filter(merchant::Column::TenantId.eq(tenant_id))
            .filter(merchant::Column::Provider.eq(provider))
            .filter(merchant::Column::Environment.eq(environment))
            .filter(merchant::Column::Status.eq("enabled"))
            .one(db)
            .await
    }
}
