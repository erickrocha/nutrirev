use crate::commons::entity_mapper::EntityMapper;
use chrono::{DateTime, NaiveDate, Utc};
use sea_orm::{NotSet, Set};

use entity::payment_charge_entity as payment_charge;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PaymentCharge {
    pub id: i32,
    pub tenant_id: i32,
    pub customer_id: i32,
    pub clinical_plan_id: Option<i32>,
    /// The subscription that generated this charge; `None` for an ad-hoc one.
    pub payment_date_id: Option<i32>,
    pub sequence: i32,
    pub amount_cents: i64,
    pub currency: String,
    pub due_date: NaiveDate,
    pub status: String,
    pub paid_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

pub struct PaymentChargeMapper;
impl EntityMapper<PaymentCharge, payment_charge::Model, payment_charge::ActiveModel>
    for PaymentChargeMapper
{
    fn build_active_model(d: PaymentCharge) -> payment_charge::ActiveModel {
        payment_charge::ActiveModel {
            id: if d.id == 0 { NotSet } else { Set(d.id) },
            tenant_id: Set(d.tenant_id),
            customer_id: Set(d.customer_id),
            clinical_plan_id: Set(d.clinical_plan_id),
            payment_date_id: Set(d.payment_date_id),
            sequence: Set(d.sequence),
            amount_cents: Set(d.amount_cents),
            currency: Set(d.currency),
            due_date: Set(d.due_date),
            status: Set(d.status),
            paid_at: Set(d.paid_at),
            created_at: Set(d.created_at),
        }
    }
    fn from_model(m: payment_charge::Model) -> PaymentCharge {
        PaymentCharge {
            id: m.id,
            tenant_id: m.tenant_id,
            customer_id: m.customer_id,
            clinical_plan_id: m.clinical_plan_id,
            payment_date_id: m.payment_date_id,
            sequence: m.sequence,
            amount_cents: m.amount_cents,
            currency: m.currency,
            due_date: m.due_date,
            status: m.status,
            paid_at: m.paid_at,
            created_at: m.created_at,
        }
    }
    fn from_active_model(mut m: payment_charge::ActiveModel) -> PaymentCharge {
        PaymentCharge {
            id: m.id.take().unwrap_or_default(),
            tenant_id: m.tenant_id.take().unwrap_or_default(),
            customer_id: m.customer_id.take().unwrap_or_default(),
            clinical_plan_id: m.clinical_plan_id.take().unwrap_or_default(),
            payment_date_id: m.payment_date_id.take().unwrap_or_default(),
            sequence: m.sequence.take().unwrap_or_default(),
            amount_cents: m.amount_cents.take().unwrap_or_default(),
            currency: m.currency.take().unwrap_or_default(),
            due_date: m.due_date.take().unwrap_or_default(),
            status: m.status.take().unwrap_or_default(),
            paid_at: m.paid_at.take().unwrap_or_default(),
            created_at: m.created_at.take().unwrap_or_default(),
        }
    }
}

use entity::payment_attempt_entity as payment_attempt;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CardPaymentAttempt {
    pub id: i32,
    pub tenant_id: i32,
    pub charge_id: i32,
    pub merchant_id: i32,
    pub idempotency_key: String,
    pub reference: String,
    pub method: String,
    pub installments: i32,
    pub amount_cents: i64,
    pub currency: String,
    pub status: String,
    pub active_charge_id: Option<i32>,
    pub submitted_by_user_id: Option<i32>,
    /// `cit` when the cardholder submitted it, `mit` when the worker did.
    pub initiator: String,
    pub pix_payload: Option<String>,
    pub pix_expires_at: Option<DateTime<Utc>>,
    pub provider_transaction_id: Option<String>,
    pub return_code: Option<String>,
    pub return_message: Option<String>,
    pub last4: Option<String>,
    pub brand: Option<String>,
    pub submitted_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub reversed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

pub struct CardPaymentAttemptMapper;
impl EntityMapper<CardPaymentAttempt, payment_attempt::Model, payment_attempt::ActiveModel>
    for CardPaymentAttemptMapper
{
    fn build_active_model(d: CardPaymentAttempt) -> payment_attempt::ActiveModel {
        payment_attempt::ActiveModel {
            id: if d.id == 0 { NotSet } else { Set(d.id) },
            tenant_id: Set(d.tenant_id),
            charge_id: Set(d.charge_id),
            merchant_id: Set(d.merchant_id),
            idempotency_key: Set(d.idempotency_key),
            reference: Set(d.reference),
            method: Set(d.method),
            installments: Set(d.installments),
            amount_cents: Set(d.amount_cents),
            currency: Set(d.currency),
            status: Set(d.status),
            active_charge_id: Set(d.active_charge_id),
            submitted_by_user_id: Set(d.submitted_by_user_id),
            initiator: Set(d.initiator),
            pix_payload: Set(d.pix_payload),
            pix_expires_at: Set(d.pix_expires_at),
            provider_transaction_id: Set(d.provider_transaction_id),
            return_code: Set(d.return_code),
            return_message: Set(d.return_message),
            last4: Set(d.last4),
            brand: Set(d.brand),
            submitted_at: Set(d.submitted_at),
            completed_at: Set(d.completed_at),
            reversed_at: Set(d.reversed_at),
            created_at: Set(d.created_at),
        }
    }
    fn from_model(m: payment_attempt::Model) -> CardPaymentAttempt {
        CardPaymentAttempt {
            id: m.id,
            tenant_id: m.tenant_id,
            charge_id: m.charge_id,
            merchant_id: m.merchant_id,
            idempotency_key: m.idempotency_key,
            reference: m.reference,
            method: m.method,
            installments: m.installments,
            amount_cents: m.amount_cents,
            currency: m.currency,
            status: m.status,
            active_charge_id: m.active_charge_id,
            submitted_by_user_id: m.submitted_by_user_id,
            initiator: m.initiator,
            pix_payload: m.pix_payload,
            pix_expires_at: m.pix_expires_at,
            provider_transaction_id: m.provider_transaction_id,
            return_code: m.return_code,
            return_message: m.return_message,
            last4: m.last4,
            brand: m.brand,
            submitted_at: m.submitted_at,
            completed_at: m.completed_at,
            reversed_at: m.reversed_at,
            created_at: m.created_at,
        }
    }
    fn from_active_model(mut m: payment_attempt::ActiveModel) -> CardPaymentAttempt {
        CardPaymentAttempt {
            id: m.id.take().unwrap_or_default(),
            tenant_id: m.tenant_id.take().unwrap_or_default(),
            charge_id: m.charge_id.take().unwrap_or_default(),
            merchant_id: m.merchant_id.take().unwrap_or_default(),
            idempotency_key: m.idempotency_key.take().unwrap_or_default(),
            reference: m.reference.take().unwrap_or_default(),
            method: m.method.take().unwrap_or_default(),
            installments: m.installments.take().unwrap_or_default(),
            amount_cents: m.amount_cents.take().unwrap_or_default(),
            currency: m.currency.take().unwrap_or_default(),
            status: m.status.take().unwrap_or_default(),
            active_charge_id: m.active_charge_id.take().unwrap_or_default(),
            submitted_by_user_id: m.submitted_by_user_id.take().unwrap_or_default(),
            initiator: m.initiator.take().unwrap_or_default(),
            pix_payload: m.pix_payload.take().unwrap_or_default(),
            pix_expires_at: m.pix_expires_at.take().unwrap_or_default(),
            provider_transaction_id: m.provider_transaction_id.take().unwrap_or_default(),
            return_code: m.return_code.take().unwrap_or_default(),
            return_message: m.return_message.take().unwrap_or_default(),
            last4: m.last4.take().unwrap_or_default(),
            brand: m.brand.take().unwrap_or_default(),
            submitted_at: m.submitted_at.take().unwrap_or_default(),
            completed_at: m.completed_at.take().unwrap_or_default(),
            reversed_at: m.reversed_at.take().unwrap_or_default(),
            created_at: m.created_at.take().unwrap_or_default(),
        }
    }
}
