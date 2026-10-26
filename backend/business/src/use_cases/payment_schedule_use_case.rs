//! Recurring billing: subscriptions in, charges out, access enforced.
//!
//! The three worker entry points (`generate_due_charges`, `mark_overdue`,
//! `enforce_access`) are safe to run concurrently on more than one instance.
//! That safety comes from the database — the `uq_pc_cycle` unique index and
//! set-based conditional updates — not from any lock the caller holds.

use chrono::{Duration, NaiveDate, Utc};
use entity::{
    clinical_plan_entity as plan, customer_entity, payment_charge_entity as charge,
    payment_date_entity as subscription,
};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbConn, DbErr, EntityTrait, IntoActiveModel, QueryFilter,
    RuntimeErr, Set,
};

use crate::commons::entity_mapper::EntityMapper;
use crate::domain::business_error::BusinessError;
use crate::domain::card_payment::PaymentScope;
use crate::domain::enums::Role;
use crate::domain::payment_date::{PaymentDate, PaymentDateEntityMapper};
use crate::domain::payment_records::{PaymentCharge, PaymentChargeMapper};
use crate::domain::payment_schedule::{
    advance_after, cycles_until, ChargeStatus, SubscriptionStatus,
};
use crate::domain::user::User;
use crate::gateway::billing_gateway::BillingGateway;

/// How far ahead a charge is created. A customer needs to see the next payment
/// coming with enough runway to act on it; a clinic does not need to configure
/// that, so it stays a constant.
pub const CHARGE_LOOKAHEAD_DAYS: i64 = 30;

/// What one worker tick did, for the log line.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct BillingTickReport {
    pub charges_created: usize,
    pub charges_marked_overdue: u64,
    pub users_blocked: u64,
    pub users_unblocked: u64,
    pub attempts_expired: u64,
}

pub struct PaymentScheduleUseCase;

impl PaymentScheduleUseCase {
    /// Opens a subscription for a customer on a clinical plan.
    ///
    /// Runs in the caller's tenant scope — the `before_save` hook stamps
    /// `tenant_id` — so it is only valid on the request path, not in the worker.
    pub async fn start_subscription(
        db: &DbConn,
        customer_id: i32,
        clinical_plan_id: i32,
        first_due_date: NaiveDate,
    ) -> Result<PaymentDate, BusinessError> {
        let scope = PaymentScope::from_current_user()?;

        let customer = customer_entity::Entity::find_by_id(customer_id)
            .filter(customer_entity::Column::TenantId.eq(scope.tenant_id()))
            .one(db)
            .await
            .map_err(|e| BusinessError::new(format!("Unable to validate customer: {}", e)))?;
        if customer.is_none() {
            return Err(BusinessError::new("Customer not found".to_owned()));
        }

        let plan = plan::Entity::find_by_id(clinical_plan_id)
            .filter(plan::Column::TenantId.eq(scope.tenant_id()))
            .one(db)
            .await
            .map_err(|e| BusinessError::new(format!("Unable to validate clinical plan: {}", e)))?
            .ok_or_else(|| BusinessError::new("Clinical plan not found".to_owned()))?;
        // Both are validated up front: a plan missing either one produces a
        // subscription that can never emit a payable charge.
        require_billable(&plan)?;

        // At most one live subscription per customer + plan, the invariant the
        // manual payment-date screen has always enforced.
        let previous = subscription::Entity::find()
            .filter(subscription::Column::TenantId.eq(scope.tenant_id()))
            .filter(subscription::Column::CustomerId.eq(customer_id))
            .filter(subscription::Column::ClinicalPlanId.eq(clinical_plan_id))
            .filter(subscription::Column::IsActive.eq(true))
            .all(db)
            .await
            .map_err(|e| BusinessError::new(format!("Unable to read subscriptions: {}", e)))?;
        for row in previous {
            let mut active = row.into_active_model();
            active.is_active = Set(false);
            active.status = Set(SubscriptionStatus::Cancelled.as_str().to_owned());
            active
                .update(db)
                .await
                .map_err(|e| BusinessError::new(format!("Unable to close subscription: {}", e)))?;
        }

        let created = subscription::ActiveModel {
            customer_id: Set(Some(customer_id)),
            clinical_plan_id: Set(Some(clinical_plan_id)),
            first_due_date: Set(first_due_date),
            next_due_date: Set(Some(first_due_date)),
            status: Set(SubscriptionStatus::Active.as_str().to_owned()),
            is_active: Set(true),
            ..Default::default()
        }
        .insert(db)
        .await
        .map_err(|e| BusinessError::new(format!("Failed to open subscription: {}", e)))?;

        Ok(PaymentDateEntityMapper::from_model(created))
    }

    /// Emits every charge that falls inside the lookahead window and advances
    /// each subscription past what it emitted.
    pub async fn generate_due_charges(db: &DbConn, today: NaiveDate) -> Result<usize, DbErr> {
        let horizon = today + Duration::days(CHARGE_LOOKAHEAD_DAYS);
        let due = BillingGateway::subscriptions_due(db, horizon).await?;
        let mut created = 0usize;

        for (row, plan) in due {
            match Self::generate_for_subscription(db, &row, &plan, horizon).await {
                Ok(count) => created += count,
                Err(e) => {
                    // One misconfigured plan must not stop billing every other
                    // clinic, so the tick logs and moves on.
                    log::warn!(
                        "[PaymentScheduleUseCase::generate_due_charges] Skipping subscription {}: {}",
                        row.id,
                        e.message
                    );
                }
            }
        }
        Ok(created)
    }

    async fn generate_for_subscription(
        db: &DbConn,
        row: &subscription::Model,
        plan: &plan::Model,
        horizon: NaiveDate,
    ) -> Result<usize, BusinessError> {
        require_billable(plan)?;
        let amount_cents = i64::from(plan.price_in_cents.unwrap_or_default());
        let renew_period_days = plan.renew_period_days.unwrap_or_default();
        let (Some(next_due), Some(customer_id), Some(tenant_id)) =
            (row.next_due_date, row.customer_id, row.tenant_id)
        else {
            return Ok(0);
        };

        let last_cycle = BillingGateway::last_cycle_number(db, row.id)
            .await
            .map_err(|e| BusinessError::new(format!("Unable to read emitted cycles: {}", e)))?;
        let cycles = cycles_until(next_due, renew_period_days, last_cycle + 1, horizon)?;
        let Some(&(_, last_emitted)) = cycles.last() else {
            return Ok(0);
        };

        let mut created = 0usize;
        for (cycle_number, due_date) in &cycles {
            let insert = charge::ActiveModel {
                tenant_id: Set(tenant_id),
                customer_id: Set(customer_id),
                clinical_plan_id: Set(row.clinical_plan_id),
                payment_date_id: Set(Some(row.id)),
                sequence: Set(*cycle_number),
                amount_cents: Set(amount_cents),
                currency: Set("BRL".to_owned()),
                due_date: Set(*due_date),
                status: Set(ChargeStatus::Open.as_str().to_owned()),
                paid_at: Set(None),
                created_at: Set(Utc::now()),
                ..Default::default()
            }
            .insert(db)
            .await;

            match insert {
                Ok(_) => created += 1,
                // `uq_pc_cycle` rejecting the row means another instance already
                // emitted this cycle. That is the mechanism working, not a fault.
                Err(e) if is_duplicate_key(&e) => {
                    log::debug!(
                        "[PaymentScheduleUseCase] Cycle {} of subscription {} already exists",
                        cycle_number,
                        row.id
                    );
                }
                Err(e) => {
                    return Err(BusinessError::new(format!("Unable to create charge: {}", e)))
                }
            }
        }

        // Advance regardless of how many inserts we personally won: the cycles
        // through `last_emitted` exist either way.
        let advanced = advance_after(last_emitted, renew_period_days)?;
        let mut active = row.clone().into_active_model();
        active.next_due_date = Set(Some(advanced));
        active
            .update(db)
            .await
            .map_err(|e| BusinessError::new(format!("Unable to advance subscription: {}", e)))?;

        Ok(created)
    }

    pub async fn mark_overdue(db: &DbConn, today: NaiveDate) -> Result<u64, DbErr> {
        BillingGateway::mark_charges_overdue(db, today).await
    }

    /// Blocks customers past their clinic's grace period and restores the ones
    /// who have settled up.
    ///
    /// Both directions are conditional on `blocked_reason`: the worker blocks
    /// only accounts nobody else disabled, and unblocks only accounts it
    /// disabled itself. A clinic that switched someone off by hand keeps them
    /// off.
    pub async fn enforce_access(db: &DbConn, today: NaiveDate) -> Result<(u64, u64), DbErr> {
        use crate::domain::payment_schedule::should_block;

        let delinquent = BillingGateway::delinquent_customers(db).await?;
        let mut blocked = 0u64;
        for row in &delinquent {
            if should_block(row.oldest_unpaid_due_date, row.grace_days, today) {
                blocked += BillingGateway::block_for_payment(db, row.user_id).await?;
            }
        }

        let mut unblocked = 0u64;
        for user_id in BillingGateway::payment_blocked_user_ids(db).await? {
            // Anyone the worker blocked who no longer owes anything, or who owes
            // something still inside its grace window, gets access back.
            let owes_past_grace = delinquent.iter().any(|row| {
                row.user_id == user_id
                    && should_block(row.oldest_unpaid_due_date, row.grace_days, today)
            });
            if !owes_past_grace {
                unblocked += BillingGateway::unblock_for_payment(db, user_id).await?;
            }
        }

        Ok((blocked, unblocked))
    }

    /// How long a non-Pix attempt may hold a charge before the sweep releases it.
    ///
    /// Generous on purpose: this must never cancel an attempt someone is still
    /// working through. A Pix attempt carries the provider's own expiry and is
    /// released on that instead.
    pub const ABANDONED_ATTEMPT_HOURS: i64 = 2;

    /// Releases attempts that are still reserving a charge they can no longer pay.
    pub async fn expire_abandoned_attempts(db: &DbConn) -> Result<u64, DbErr> {
        let now = Utc::now();
        BillingGateway::expire_stale_attempts(
            db,
            now,
            now - Duration::hours(Self::ABANDONED_ATTEMPT_HOURS),
        )
        .await
    }

    /// One worker tick, in the order the states depend on each other: create the
    /// charges, age them, then act on what is still unpaid.
    pub async fn run_tick(db: &DbConn, today: NaiveDate) -> Result<BillingTickReport, DbErr> {
        // First: a leftover attempt holds its charge against every payment
        // method, so releasing those before anything else means a customer who
        // abandoned a checkout can pay again on this tick rather than the next.
        let attempts_expired = Self::expire_abandoned_attempts(db).await?;
        let charges_created = Self::generate_due_charges(db, today).await?;
        let charges_marked_overdue = Self::mark_overdue(db, today).await?;
        let (users_blocked, users_unblocked) = Self::enforce_access(db, today).await?;
        Ok(BillingTickReport {
            charges_created,
            charges_marked_overdue,
            users_blocked,
            users_unblocked,
            attempts_expired,
        })
    }

/// Payments this clinic collected and then lost again.
    ///
    /// Clinic staff only. A patient has no use for a clinic-wide list, and a
    /// tenant scope alone is not proof of access to other patients' billing —
    /// the same rule `list_charges` applies per charge, applied here to the
    /// whole clinic.
    pub async fn list_reversals(
        db: &DbConn,
        user: &User,
        limit: u64,
    ) -> Result<Vec<crate::gateway::billing_gateway::ReversedPayment>, BusinessError> {
        let scope = PaymentScope::from_current_user()?;
        if !matches!(user.role, Role::TenantOwner | Role::TenantUser) {
            return Err(BusinessError::new("Forbidden".to_owned()));
        }
        BillingGateway::recent_reversals(db, scope.tenant_id(), limit.clamp(1, 200))
            .await
            .map_err(|_| BusinessError::new("Unable to read reversals".to_owned()))
    }

    /// Charges visible to the caller.
    ///
    /// A customer sees only their own, whatever `customer_id` they ask for.
    /// Clinic staff may name any customer in their tenant. Nobody else gets in —
    /// a tenant scope alone is not proof of access to a patient's billing.
    pub async fn list_charges(
        db: &DbConn,
        user: &User,
        customer_id: Option<i32>,
    ) -> Result<Vec<PaymentCharge>, BusinessError> {
        let scope = PaymentScope::from_current_user()?;
        let user_id = user
            .id
            .filter(|id| *id > 0)
            .ok_or_else(|| BusinessError::new("Forbidden".to_owned()))?;

        let target = match user.role {
            Role::User => customer_entity::Entity::find()
                .filter(customer_entity::Column::TenantId.eq(scope.tenant_id()))
                .filter(customer_entity::Column::UserId.eq(user_id))
                .one(db)
                .await
                .map_err(|_| BusinessError::new("Unable to load charges".to_owned()))?
                .ok_or_else(|| BusinessError::new("Forbidden".to_owned()))?,
            Role::TenantOwner | Role::TenantUser => {
                let requested = customer_id
                    .ok_or_else(|| BusinessError::new("customerId is required".to_owned()))?;
                customer_entity::Entity::find_by_id(requested)
                    .filter(customer_entity::Column::TenantId.eq(scope.tenant_id()))
                    .one(db)
                    .await
                    .map_err(|_| BusinessError::new("Unable to load charges".to_owned()))?
                    .ok_or_else(|| BusinessError::new("Customer not found".to_owned()))?
            }
            _ => return Err(BusinessError::new("Forbidden".to_owned())),
        };

        let rows = BillingGateway::charges_for_customer(db, scope.tenant_id(), target.id)
            .await
            .map_err(|_| BusinessError::new("Unable to load charges".to_owned()))?;
        Ok(rows.into_iter().map(PaymentChargeMapper::from_model).collect())
    }

    /// Verifies that the caller may act on one charge.
    ///
    /// Staff access is tenant-wide, while customers must own the charge through
    /// their customer record. Keeping this beside `list_charges` prevents the
    /// prepare endpoint from accidentally applying different authorization
    /// rules than the list endpoint.
    pub async fn can_access_charge(
        db: &DbConn,
        user: &User,
        charge_id: i32,
    ) -> Result<bool, BusinessError> {
        let scope = PaymentScope::from_current_user()?;
        let charge = charge::Entity::find_by_id(charge_id)
            .filter(charge::Column::TenantId.eq(scope.tenant_id()))
            .one(db)
            .await
            .map_err(|_| BusinessError::new("Unable to validate charge access".to_owned()))?;
        let Some(charge) = charge else {
            return Ok(false);
        };

        match user.role {
            Role::TenantOwner | Role::TenantUser => Ok(true),
            Role::User => {
                let Some(user_id) = user.id.filter(|id| *id > 0) else {
                    return Ok(false);
                };
                customer_entity::Entity::find_by_id(charge.customer_id)
                    .filter(customer_entity::Column::TenantId.eq(scope.tenant_id()))
                    .filter(customer_entity::Column::UserId.eq(user_id))
                    .one(db)
                    .await
                    .map(|customer| customer.is_some())
                    .map_err(|_| BusinessError::new("Unable to validate charge access".to_owned()))
            }
            _ => Ok(false),
        }
    }
}

fn require_billable(plan: &plan::Model) -> Result<(), BusinessError> {
    if plan.price_in_cents.unwrap_or_default() <= 0 {
        return Err(BusinessError::new(
            "Clinical plan price_in_cents must be greater than zero".to_owned(),
        ));
    }
    if plan.renew_period_days.unwrap_or_default() <= 0 {
        return Err(BusinessError::new(
            "Clinical plan renew_period_days must be greater than zero".to_owned(),
        ));
    }
    Ok(())
}

/// MariaDB reports a unique-index conflict as error 1062.
fn is_duplicate_key(error: &DbErr) -> bool {
    match error {
        DbErr::Exec(RuntimeErr::SqlxError(e)) | DbErr::Query(RuntimeErr::SqlxError(e)) => e
            .as_database_error()
            .and_then(|db| db.code())
            .is_some_and(|code| code == "23000" || code == "1062"),
        _ => error.to_string().contains("1062"),
    }
}
