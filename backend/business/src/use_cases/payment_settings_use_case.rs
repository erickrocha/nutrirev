//! Which acquirer a clinic uses, and which methods it offers.
//!
//! Two audiences, deliberately separated. The platform operator provisions a
//! *connection* — the acquirer and the reference to its credentials, which are
//! resolved from the secret manager and never travel through a request. The
//! clinic then chooses among the connections it has and toggles methods on the
//! live one.
//!
//! That split is not bureaucracy: `credentials_secret_ref` is a pointer, and
//! letting a clinic set it would let one clinic's row name another clinic's
//! secret. The reference alphabet is validated for the same reason.

use chrono::Utc;
use entity::{payment_attempt_entity as attempt, payment_merchant_entity as merchant};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbConn, EntityTrait, IntoActiveModel, ModelTrait, PaginatorTrait,
    QueryFilter, QueryOrder, Set, TransactionTrait,
};

use crate::domain::business_error::BusinessError;
use crate::domain::enums::Role;
use crate::domain::merchant_capabilities::{MerchantCapabilities, Provider};
use crate::domain::user::User;

/// Fields of a connection the operator may correct after provisioning.
///
/// `provider` is absent on purpose: an attempt records which acquirer processed
/// it, and rewriting that on an existing row would falsify history. A different
/// acquirer is a different connection.
pub struct ConnectionEdit {
    pub merchant_reference: String,
    pub credentials_secret_ref: String,
    pub environment: String,
}

/// A connection the operator provisions for a clinic.
pub struct NewConnection {
    pub tenant_id: i32,
    pub provider: Provider,
    pub environment: String,
    pub merchant_reference: String,
    pub credentials_secret_ref: String,
}

pub struct PaymentSettingsUseCase;

impl PaymentSettingsUseCase {
    /// Provisions a connection. Platform operator only.
    ///
    /// Created disabled: a connection is not usable until the clinic chooses it,
    /// and creating it live would silently switch the clinic's acquirer out from
    /// under whatever it is using today.
    pub async fn provision(
        db: &DbConn,
        user: &User,
        input: NewConnection,
    ) -> Result<merchant::Model, BusinessError> {
        if user.role != Role::SysAdmin {
            return Err(BusinessError::new("Forbidden".to_owned()));
        }
        validate_reference(&input.merchant_reference, &input.credentials_secret_ref)?;
        if !matches!(input.environment.as_str(), "sandbox" | "production") {
            return Err(BusinessError::new("Unknown environment".to_owned()));
        }

        merchant::ActiveModel {
            tenant_id: Set(input.tenant_id),
            provider: Set(input.provider.as_str().to_owned()),
            environment: Set(input.environment),
            merchant_reference: Set(input.merchant_reference),
            credentials_secret_ref: Set(input.credentials_secret_ref),
            status: Set("disabled".into()),
            // Sensible starting point: every acquirer here does cards, and the
            // clinic turns on what it actually wants.
            credit_enabled: Set(true),
            pix_enabled: Set(false),
            recurring_enabled: Set(false),
            created_at: Set(Utc::now()),
            ..Default::default()
        }
        .insert(db)
        .await
        .map_err(|_| BusinessError::new("Unable to provision the connection".to_owned()))
    }

    /// Every connection across every clinic. Platform operator only.
    pub async fn all_connections(
        db: &DbConn,
        user: &User,
        tenant_id: Option<i32>,
    ) -> Result<Vec<merchant::Model>, BusinessError> {
        if user.role != Role::SysAdmin {
            return Err(BusinessError::new("Forbidden".to_owned()));
        }
        let mut query = merchant::Entity::find().order_by_asc(merchant::Column::TenantId);
        if let Some(tenant_id) = tenant_id {
            query = query.filter(merchant::Column::TenantId.eq(tenant_id));
        }
        query
            .all(db)
            .await
            .map_err(|_| BusinessError::new("Unable to read connections".to_owned()))
    }

    /// Corrects a provisioned connection. Platform operator only.
    pub async fn update_connection(
        db: &DbConn,
        user: &User,
        id: i32,
        input: ConnectionEdit,
    ) -> Result<merchant::Model, BusinessError> {
        if user.role != Role::SysAdmin {
            return Err(BusinessError::new("Forbidden".to_owned()));
        }
        validate_reference(&input.merchant_reference, &input.credentials_secret_ref)?;
        if !matches!(input.environment.as_str(), "sandbox" | "production") {
            return Err(BusinessError::new("Unknown environment".to_owned()));
        }

        let existing = merchant::Entity::find_by_id(id)
            .one(db)
            .await
            .map_err(|_| BusinessError::new("Unable to read connections".to_owned()))?
            .ok_or_else(|| BusinessError::new("Connection not found".to_owned()))?;

        // Moving a live connection between environments would silently point a
        // clinic's payments at the other one. Retire it first.
        if existing.status == "enabled" && existing.environment != input.environment {
            return Err(BusinessError::new(
                "Disable the connection before changing its environment".to_owned(),
            ));
        }

        let mut active = existing.into_active_model();
        active.merchant_reference = Set(input.merchant_reference);
        active.credentials_secret_ref = Set(input.credentials_secret_ref);
        active.environment = Set(input.environment);
        active
            .update(db)
            .await
            .map_err(|_| BusinessError::new("Unable to update the connection".to_owned()))
    }

    /// Retires a connection without deleting it. Platform operator only.
    ///
    /// The path for revoked credentials. Enabling is deliberately not offered
    /// here: choosing the live acquirer belongs to the clinic, and goes through
    /// `select`, which validates what the acquirer can actually do.
    pub async fn disable_connection(
        db: &DbConn,
        user: &User,
        id: i32,
    ) -> Result<merchant::Model, BusinessError> {
        if user.role != Role::SysAdmin {
            return Err(BusinessError::new("Forbidden".to_owned()));
        }
        let existing = merchant::Entity::find_by_id(id)
            .one(db)
            .await
            .map_err(|_| BusinessError::new("Unable to read connections".to_owned()))?
            .ok_or_else(|| BusinessError::new("Connection not found".to_owned()))?;
        let mut active = existing.into_active_model();
        active.status = Set("disabled".into());
        active
            .update(db)
            .await
            .map_err(|_| BusinessError::new("Unable to disable the connection".to_owned()))
    }

    /// Deletes a connection that was never used. Platform operator only.
    ///
    /// Refuses once any attempt references it. An attempt records which acquirer
    /// processed the money, and deleting the row would leave payments pointing at
    /// nothing — the audit trail matters more than a tidy table. Disable it
    /// instead.
    pub async fn delete_connection(db: &DbConn, user: &User, id: i32) -> Result<(), BusinessError> {
        if user.role != Role::SysAdmin {
            return Err(BusinessError::new("Forbidden".to_owned()));
        }
        let existing = merchant::Entity::find_by_id(id)
            .one(db)
            .await
            .map_err(|_| BusinessError::new("Unable to read connections".to_owned()))?
            .ok_or_else(|| BusinessError::new("Connection not found".to_owned()))?;

        let used = attempt::Entity::find()
            .filter(attempt::Column::MerchantId.eq(id))
            .count(db)
            .await
            .map_err(|_| BusinessError::new("Unable to read payment attempts".to_owned()))?;
        if used > 0 {
            return Err(BusinessError::new(
                "This connection has processed payments and cannot be deleted; disable it instead"
                    .to_owned(),
            ));
        }

        existing
            .delete(db)
            .await
            .map_err(|_| BusinessError::new("Unable to delete the connection".to_owned()))?;
        Ok(())
    }

    /// The connections a clinic can choose between.
    pub async fn connections(
        db: &DbConn,
        tenant_id: i32,
    ) -> Result<Vec<merchant::Model>, BusinessError> {
        merchant::Entity::find()
            .filter(merchant::Column::TenantId.eq(tenant_id))
            .all(db)
            .await
            .map_err(|_| BusinessError::new("Unable to read connections".to_owned()))
    }

    /// Selects the clinic's acquirer and the methods it offers.
    ///
    /// Switching acquirer and disabling the previous one happen in one
    /// transaction. `uq_pm_one_active` would refuse the second enabled row
    /// anyway; doing it in order means the clinic is never momentarily left with
    /// no way to take a payment.
    pub async fn select(
        db: &DbConn,
        tenant_id: i32,
        merchant_id: i32,
        capabilities: MerchantCapabilities,
    ) -> Result<merchant::Model, BusinessError> {
        let tx = db
            .begin()
            .await
            .map_err(|_| BusinessError::new("Unable to save payment settings".to_owned()))?;

        let chosen = merchant::Entity::find_by_id(merchant_id)
            .filter(merchant::Column::TenantId.eq(tenant_id))
            .one(&tx)
            .await
            .map_err(|_| BusinessError::new("Unable to read connections".to_owned()))?
            .ok_or_else(|| BusinessError::new("Connection not found".to_owned()))?;

        let provider = Provider::parse(&chosen.provider).ok_or_else(|| {
            BusinessError::new("Connection uses an unknown provider".to_owned())
        })?;
        // Mirrors the table's own checks, so the clinic gets told *why* rather
        // than seeing a constraint violation.
        capabilities.validate_for(provider)?;

        let environment = chosen.environment.clone();
        for other in merchant::Entity::find()
            .filter(merchant::Column::TenantId.eq(tenant_id))
            .filter(merchant::Column::Environment.eq(environment))
            .filter(merchant::Column::Id.ne(merchant_id))
            .all(&tx)
            .await
            .map_err(|_| BusinessError::new("Unable to read connections".to_owned()))?
        {
            if other.status == "enabled" {
                let mut disabled = other.into_active_model();
                disabled.status = Set("disabled".into());
                disabled.update(&tx).await.map_err(|_| {
                    BusinessError::new("Unable to switch acquirer".to_owned())
                })?;
            }
        }

        let mut active = chosen.into_active_model();
        active.status = Set("enabled".into());
        active.credit_enabled = Set(capabilities.credit);
        active.pix_enabled = Set(capabilities.pix);
        active.recurring_enabled = Set(capabilities.recurring);
        let saved = active
            .update(&tx)
            .await
            .map_err(|_| BusinessError::new("Unable to save payment settings".to_owned()))?;

        tx.commit()
            .await
            .map_err(|_| BusinessError::new("Unable to save payment settings".to_owned()))?;
        Ok(saved)
    }
}

/// Shared by provisioning and editing, so the two cannot drift apart.
///
/// The secret reference is checked against the same alphabet the resolver
/// enforces. Rejecting it here gives a usable message instead of a credential
/// lookup that mysteriously fails the first time someone takes a payment.
fn validate_reference(
    merchant_reference: &str,
    credentials_secret_ref: &str,
) -> Result<(), BusinessError> {
    if merchant_reference.trim().is_empty() {
        return Err(BusinessError::new(
            "A merchant reference is required".to_owned(),
        ));
    }
    if credentials_secret_ref.is_empty()
        || !credentials_secret_ref
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'/' | b'-' | b'_'))
    {
        return Err(BusinessError::new(
            "The credentials reference may only contain letters, digits, '/', '-' and '_'"
                .to_owned(),
        ));
    }
    Ok(())
}
