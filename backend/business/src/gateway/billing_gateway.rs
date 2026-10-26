//! Database access for the billing worker.
//!
//! Every function here is deliberately **not** tenant-scoped. The worker runs
//! outside a request, so `CURRENT_USER` is unset: `tenant_scope()` would report
//! `Unrestricted` and `PaymentScope::from_current_user()` would error. A system
//! job has to sweep every clinic, so these queries take an explicit `tenant_id`
//! or scan globally by design. Request-path reads keep going through
//! `tenant_select` / `PaymentScope` as before.

use chrono::NaiveDate;
use sea_orm::prelude::DateTimeUtc;
use entity::{
    clinical_plan_entity as plan, customer_entity as customer,
    payment_attempt_entity as attempt, payment_charge_entity as charge,
    payment_date_entity as subscription, payment_token_entity as token,
    tenant_entity as tenant, user_entity as user,
};
use sea_orm::sea_query::Expr;
use sea_orm::{
    ColumnTrait, Condition, ConnectionTrait, DbErr, EntityTrait, QueryFilter, QueryOrder,
    QuerySelect,
};

use crate::domain::card_payment::AttemptStatus;
use crate::domain::payment_schedule::{
    is_chargeable_today, BillingMode, ChargeStatus, SubscriptionStatus,
};

/// A customer who owes money, with everything the blocking decision needs.
#[derive(Clone, Debug)]
pub struct DelinquentCustomer {
    pub user_id: i32,
    pub oldest_unpaid_due_date: NaiveDate,
    pub grace_days: i32,
}

/// A payment that settled and then went back out, as the clinic needs to see it.
#[derive(Clone, Debug)]
pub struct ReversedPayment {
    pub attempt_id: i32,
    pub charge_id: i32,
    pub customer_id: i32,
    pub customer_name: String,
    pub amount_cents: i64,
    pub method: String,
    pub reversed_at: DateTimeUtc,
    pub charge_status: String,
    pub due_date: NaiveDate,
}

/// One charge the worker may attempt against a stored card.
#[derive(Clone, Debug)]
pub struct UnattendedCharge {
    pub tenant_id: i32,
    pub charge_id: i32,
    pub customer_id: i32,
    pub merchant_provider: String,
    pub provider_token: String,
    pub provider_customer_id: Option<String>,
}

pub struct BillingGateway;

impl BillingGateway {
    /// Active subscriptions whose next cycle lands on or before `horizon`,
    /// paired with the plan that prices them.
    ///
    /// Rows with a NULL customer, plan or tenant are legacy hand-entered dates
    /// that cannot be billed; the join drops them.
    pub async fn subscriptions_due<C: ConnectionTrait>(
        db: &C,
        horizon: NaiveDate,
    ) -> Result<Vec<(subscription::Model, plan::Model)>, DbErr> {
        let rows = subscription::Entity::find()
            .filter(subscription::Column::Status.eq(SubscriptionStatus::Active.as_str()))
            .filter(subscription::Column::IsActive.eq(true))
            .filter(subscription::Column::NextDueDate.is_not_null())
            .filter(subscription::Column::NextDueDate.lte(horizon))
            .filter(subscription::Column::CustomerId.is_not_null())
            .filter(subscription::Column::ClinicalPlanId.is_not_null())
            .filter(subscription::Column::TenantId.is_not_null())
            .order_by_asc(subscription::Column::Id)
            .all(db)
            .await?;

        let mut pairs = Vec::with_capacity(rows.len());
        for row in rows {
            let Some(plan_id) = row.clinical_plan_id else {
                continue;
            };
            if let Some(plan) = plan::Entity::find_by_id(plan_id)
                .filter(plan::Column::TenantId.eq(row.tenant_id))
                .one(db)
                .await?
            {
                pairs.push((row, plan));
            }
        }
        Ok(pairs)
    }

    /// The highest cycle number already emitted for a subscription, so a restart
    /// or a partially applied tick resumes instead of colliding on `uq_pc_cycle`.
    pub async fn last_cycle_number<C: ConnectionTrait>(
        db: &C,
        payment_date_id: i32,
    ) -> Result<i32, DbErr> {
        Ok(charge::Entity::find()
            .filter(charge::Column::PaymentDateId.eq(payment_date_id))
            .order_by_desc(charge::Column::Sequence)
            .one(db)
            .await?
            .map(|row| row.sequence)
            .unwrap_or(0))
    }

    /// Flips every past-due open charge to `overdue` in one statement. Set-based
    /// and idempotent, so concurrent workers cannot double-apply it.
    pub async fn mark_charges_overdue<C: ConnectionTrait>(
        db: &C,
        today: NaiveDate,
    ) -> Result<u64, DbErr> {
        let result = charge::Entity::update_many()
            .col_expr(
                charge::Column::Status,
                Expr::value(ChargeStatus::Overdue.as_str()),
            )
            .filter(charge::Column::Status.eq(ChargeStatus::Open.as_str()))
            .filter(charge::Column::DueDate.lt(today))
            .exec(db)
            .await?;
        Ok(result.rows_affected)
    }

/// Releases attempts that are still holding a charge but can no longer be paid.
    ///
    /// The clients cancel an abandoned attempt themselves, but that is
    /// best-effort — a force-quit, a dead battery or a lost connection leaves the
    /// attempt live. Because `uq_pa_active` permits exactly one live attempt per
    /// charge, such a leftover locks that charge against *every* payment method,
    /// so this sweep is what guarantees the lockout is temporary rather than
    /// permanent.
    ///
    /// Set-based and conditional, so running it on several instances at once
    /// converges on the same result.
    pub async fn expire_stale_attempts<C: ConnectionTrait>(
        db: &C,
        now: DateTimeUtc,
        fallback_cutoff: DateTimeUtc,
    ) -> Result<u64, DbErr> {
        let result = attempt::Entity::update_many()
            .col_expr(
                attempt::Column::Status,
                Expr::value(AttemptStatus::Cancelled.as_str()),
            )
            // Required by ck_pa_active, and the entire point of the sweep: this
            // is what frees the charge.
            .col_expr(
                attempt::Column::ActiveChargeId,
                Expr::value(Option::<i32>::None),
            )
            .col_expr(attempt::Column::CompletedAt, Expr::value(Some(now)))
            .filter(
                attempt::Column::Status.is_in([
                    AttemptStatus::Prepared.as_str(),
                    AttemptStatus::RequiresAction.as_str(),
                ]),
            )
            .filter(attempt::Column::ActiveChargeId.is_not_null())
            .filter(
                // A Pix attempt carries the provider's own expiry. Anything else
                // falls back to age, which is why the cutoff is generous: this
                // must never cancel an attempt a customer is still working on.
                Condition::any()
                    .add(attempt::Column::PixExpiresAt.lt(now))
                    .add(
                        Condition::all()
                            .add(attempt::Column::PixExpiresAt.is_null())
                            .add(attempt::Column::CreatedAt.lt(fallback_cutoff)),
                    ),
            )
            .exec(db)
            .await?;
        Ok(result.rows_affected)
    }

/// Charges owed today by subscriptions that pay themselves.
    ///
    /// Assembled from separate reads rather than a join, matching
    /// `delinquent_customers`: the payment entities declare no SeaORM relations,
    /// and the audit columns on `payment_date` are nullable in the schema but
    /// non-null in the model, so a relation-driven scan trips over legacy rows.
    ///
    /// Filters on `due_date <= today` through `is_chargeable_today`. Charges are
    /// generated a month ahead, so charging every open one would bill every
    /// patient thirty days early.
    pub async fn card_on_file_due<C: ConnectionTrait>(
        db: &C,
        today: NaiveDate,
    ) -> Result<Vec<UnattendedCharge>, DbErr> {
        let candidates: Vec<charge::Model> = charge::Entity::find()
            .filter(charge::Column::PaymentDateId.is_not_null())
            .filter(
                charge::Column::Status
                    .is_in([ChargeStatus::Open.as_str(), ChargeStatus::Overdue.as_str()]),
            )
            .filter(charge::Column::DueDate.lte(today))
            .all(db)
            .await?;
        if candidates.is_empty() {
            return Ok(Vec::new());
        }

        let subscription_ids: Vec<i32> =
            candidates.iter().filter_map(|c| c.payment_date_id).collect();
        let subscriptions: std::collections::HashMap<i32, (i32, i32)> = subscription::Entity::find()
            .filter(subscription::Column::Id.is_in(subscription_ids))
            .filter(subscription::Column::IsActive.eq(true))
            .filter(subscription::Column::BillingMode.eq(BillingMode::CardOnFile.as_str()))
            .filter(subscription::Column::PaymentTokenId.is_not_null())
            .select_only()
            .column(subscription::Column::Id)
            .column(subscription::Column::PaymentTokenId)
            .column(subscription::Column::CustomerId)
            .into_tuple::<(i32, Option<i32>, Option<i32>)>()
            .all(db)
            .await?
            .into_iter()
            .filter_map(|(id, token_id, customer_id)| {
                Some((id, (token_id?, customer_id?)))
            })
            .collect();
        if subscriptions.is_empty() {
            return Ok(Vec::new());
        }

        let token_ids: Vec<i32> = subscriptions.values().map(|(token, _)| *token).collect();
        let tokens: std::collections::HashMap<i32, (String, String)> = token::Entity::find()
            .filter(token::Column::Id.is_in(token_ids))
            .filter(token::Column::Status.eq("active"))
            .select_only()
            .column(token::Column::Id)
            .column(token::Column::Provider)
            .column(token::Column::ProviderToken)
            .into_tuple::<(i32, String, String)>()
            .all(db)
            .await?
            .into_iter()
            .map(|(id, provider, value)| (id, (provider, value)))
            .collect();

        let customer_ids: Vec<i32> = subscriptions.values().map(|(_, c)| *c).collect();
        let provider_customers: std::collections::HashMap<i32, Option<String>> =
            customer::Entity::find()
                .filter(customer::Column::Id.is_in(customer_ids))
                .select_only()
                .column(customer::Column::Id)
                .column(customer::Column::ProviderCustomerId)
                .into_tuple::<(i32, Option<String>)>()
                .all(db)
                .await?
                .into_iter()
                .collect();

        let mut due = Vec::new();
        for row in candidates {
            let Some(status) = ChargeStatus::parse(&row.status) else {
                continue;
            };
            if !is_chargeable_today(status, row.due_date, today) {
                continue;
            }
            let Some(subscription_id) = row.payment_date_id else {
                continue;
            };
            let Some(&(token_id, customer_id)) = subscriptions.get(&subscription_id) else {
                continue;
            };
            // The subscription's customer and the charge's must agree. The
            // composite foreign key already enforces card ownership, but it is
            // MATCH SIMPLE and skips rows with a NULL tenant or customer.
            if customer_id != row.customer_id {
                continue;
            }
            let Some((provider, provider_token)) = tokens.get(&token_id) else {
                continue;
            };
            due.push(UnattendedCharge {
                tenant_id: row.tenant_id,
                charge_id: row.id,
                customer_id: row.customer_id,
                merchant_provider: provider.clone(),
                provider_token: provider_token.clone(),
                provider_customer_id: provider_customers
                    .get(&row.customer_id)
                    .cloned()
                    .flatten(),
            });
        }
        Ok(due)
    }

/// Payments this clinic collected and then lost again, newest first.
    ///
    /// Reversals are the one billing event nobody is told about: the charge
    /// quietly goes back to being owed, and without this it is indistinguishable
    /// from a patient who simply never paid. Tenant-scoped, unlike most of this
    /// module, because it is read on the request path by clinic staff.
    pub async fn recent_reversals<C: ConnectionTrait>(
        db: &C,
        tenant_id: i32,
        limit: u64,
    ) -> Result<Vec<ReversedPayment>, DbErr> {
        let reversed: Vec<attempt::Model> = attempt::Entity::find()
            .filter(attempt::Column::TenantId.eq(tenant_id))
            .filter(attempt::Column::Status.eq(AttemptStatus::Refunded.as_str()))
            .order_by_desc(attempt::Column::ReversedAt)
            .limit(limit)
            .all(db)
            .await?;
        if reversed.is_empty() {
            return Ok(Vec::new());
        }

        let charge_ids: Vec<i32> = reversed.iter().map(|row| row.charge_id).collect();
        let charges: std::collections::HashMap<i32, (i32, String, NaiveDate)> =
            charge::Entity::find()
                .filter(charge::Column::TenantId.eq(tenant_id))
                .filter(charge::Column::Id.is_in(charge_ids))
                .select_only()
                .column(charge::Column::Id)
                .column(charge::Column::CustomerId)
                .column(charge::Column::Status)
                .column(charge::Column::DueDate)
                .into_tuple::<(i32, i32, String, NaiveDate)>()
                .all(db)
                .await?
                .into_iter()
                .map(|(id, customer_id, status, due)| (id, (customer_id, status, due)))
                .collect();

        let customer_ids: Vec<i32> = charges.values().map(|(id, _, _)| *id).collect();
        // Only the two columns: the audit columns on `customer` are nullable in
        // the schema but non-null in the model, so a full entity scan trips over
        // any legacy row that never had them stamped.
        let names: std::collections::HashMap<i32, String> = customer::Entity::find()
            .filter(customer::Column::Id.is_in(customer_ids))
            .select_only()
            .column(customer::Column::Id)
            .column(customer::Column::Name)
            .into_tuple::<(i32, String)>()
            .all(db)
            .await?
            .into_iter()
            .collect();

        Ok(reversed
            .into_iter()
            .filter_map(|row| {
                let reversed_at = row.reversed_at?;
                let (customer_id, charge_status, due_date) =
                    charges.get(&row.charge_id)?.clone();
                Some(ReversedPayment {
                    attempt_id: row.id,
                    charge_id: row.charge_id,
                    customer_id,
                    customer_name: names.get(&customer_id).cloned().unwrap_or_default(),
                    amount_cents: row.amount_cents,
                    method: row.method,
                    reversed_at,
                    charge_status,
                    due_date,
                })
            })
            .collect())
    }

    /// Customers with at least one unpaid charge, keyed by the app user they own.
    ///
    /// Only customers wired to a real user account matter — a customer without
    /// `user_id` has no app access to lose.
    pub async fn delinquent_customers<C: ConnectionTrait>(
        db: &C,
    ) -> Result<Vec<DelinquentCustomer>, DbErr> {
        let unpaid = charge::Entity::find()
            .filter(charge::Column::Status.eq(ChargeStatus::Overdue.as_str()))
            .order_by_asc(charge::Column::DueDate)
            .all(db)
            .await?;
        if unpaid.is_empty() {
            return Ok(Vec::new());
        }

        // Only the two columns, not the whole entity: audit columns on these
        // tables are nullable in the schema but non-null in the model, so a full
        // entity scan fails on any legacy row that never had them stamped.
        let grace_by_tenant: std::collections::HashMap<i32, i32> = tenant::Entity::find()
            .select_only()
            .column(tenant::Column::Id)
            .column(tenant::Column::PaymentGraceDays)
            .into_tuple::<(i32, i32)>()
            .all(db)
            .await?
            .into_iter()
            .collect();

        let customer_ids: Vec<i32> = unpaid.iter().map(|row| row.customer_id).collect();
        let user_by_customer: std::collections::HashMap<i32, i32> = customer::Entity::find()
            .filter(customer::Column::Id.is_in(customer_ids))
            .filter(customer::Column::UserId.is_not_null())
            .select_only()
            .column(customer::Column::Id)
            .column(customer::Column::UserId)
            .into_tuple::<(i32, Option<i32>)>()
            .all(db)
            .await?
            .into_iter()
            .filter_map(|(id, user_id)| user_id.map(|user_id| (id, user_id)))
            .collect();

        // Charges arrive due-date ascending, so the first sighting of a user is
        // their oldest unpaid charge.
        let mut oldest: std::collections::HashMap<i32, DelinquentCustomer> =
            std::collections::HashMap::new();
        for row in unpaid {
            let Some(&user_id) = user_by_customer.get(&row.customer_id) else {
                continue;
            };
            oldest.entry(user_id).or_insert(DelinquentCustomer {
                user_id,
                oldest_unpaid_due_date: row.due_date,
                grace_days: grace_by_tenant
                    .get(&row.tenant_id)
                    .copied()
                    .unwrap_or(DEFAULT_GRACE_DAYS),
            });
        }
        Ok(oldest.into_values().collect())
    }

    /// Users the billing worker itself blocked. A hand-disabled account has a
    /// NULL reason and never appears here.
    pub async fn payment_blocked_user_ids<C: ConnectionTrait>(db: &C) -> Result<Vec<i32>, DbErr> {
        user::Entity::find()
            .filter(user::Column::BlockedReason.eq(BLOCK_REASON_PAYMENT))
            .select_only()
            .column(user::Column::Id)
            .into_tuple::<i32>()
            .all(db)
            .await
    }

    /// Blocks a user, but only while nobody else owns the block.
    pub async fn block_for_payment<C: ConnectionTrait>(db: &C, user_id: i32) -> Result<u64, DbErr> {
        let result = user::Entity::update_many()
            .col_expr(user::Column::Enabled, Expr::value(false))
            .col_expr(
                user::Column::BlockedReason,
                Expr::value(BLOCK_REASON_PAYMENT),
            )
            .filter(user::Column::Id.eq(user_id))
            .filter(user::Column::BlockedReason.is_null())
            .filter(user::Column::Enabled.eq(true))
            .exec(db)
            .await?;
        Ok(result.rows_affected)
    }

    /// Restores access, but only to accounts this worker blocked.
    pub async fn unblock_for_payment<C: ConnectionTrait>(
        db: &C,
        user_id: i32,
    ) -> Result<u64, DbErr> {
        let result = user::Entity::update_many()
            .col_expr(user::Column::Enabled, Expr::value(true))
            .col_expr(
                user::Column::BlockedReason,
                Expr::value(Option::<String>::None),
            )
            .filter(user::Column::Id.eq(user_id))
            .filter(user::Column::BlockedReason.eq(BLOCK_REASON_PAYMENT))
            .exec(db)
            .await?;
        Ok(result.rows_affected)
    }

    /// Charges for one customer, newest due date first.
    pub async fn charges_for_customer<C: ConnectionTrait>(
        db: &C,
        tenant_id: i32,
        customer_id: i32,
    ) -> Result<Vec<charge::Model>, DbErr> {
        charge::Entity::find()
            .filter(charge::Column::TenantId.eq(tenant_id))
            .filter(charge::Column::CustomerId.eq(customer_id))
            .order_by_desc(charge::Column::DueDate)
            .all(db)
            .await
    }
}

/// Mirrors the column default in `m20260903_000001_payment_schedule`; used only
/// when a charge somehow outlives its tenant row.
const DEFAULT_GRACE_DAYS: i32 = 5;

pub const BLOCK_REASON_PAYMENT: &str = "payment";
