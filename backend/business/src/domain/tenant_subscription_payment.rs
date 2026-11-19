use crate::commons::entity_mapper::EntityMapper;
use chrono::{DateTime, Utc};
use sea_orm::{NotSet, Set};

use entity::tenant_subscription_payment_entity as payment_entity;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TenantSubscriptionPayment {
    pub id: i32,
    pub uuid: Vec<u8>,
    pub tenant_id: i32,
    pub business_plan_id: i32,
    pub plan_name: String,
    pub amount_cents: i64,
    pub currency: String,
    pub payment_method: String,
    pub payment_intent_id: Option<String>,
    pub status: String,
    pub paid_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<String>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<String>,
}

pub struct TenantSubscriptionPaymentEntityMapper;

impl EntityMapper<TenantSubscriptionPayment, payment_entity::Model, payment_entity::ActiveModel>
    for TenantSubscriptionPaymentEntityMapper
{
    fn build_active_model(d: TenantSubscriptionPayment) -> payment_entity::ActiveModel {
        payment_entity::ActiveModel {
            id: if d.id == 0 { NotSet } else { Set(d.id) },
            uuid: if d.uuid.is_empty() { NotSet } else { Set(d.uuid) },
            tenant_id: Set(d.tenant_id),
            business_plan_id: Set(d.business_plan_id),
            plan_name: Set(d.plan_name),
            amount_cents: Set(d.amount_cents),
            currency: Set(d.currency),
            payment_method: Set(d.payment_method),
            payment_intent_id: Set(d.payment_intent_id),
            status: Set(d.status),
            paid_at: Set(d.paid_at),
            created_at: Set(d.created_at),
            created_by: Set(d.created_by),
            updated_at: Set(d.updated_at),
            updated_by: Set(d.updated_by),
        }
    }

    fn from_model(m: payment_entity::Model) -> TenantSubscriptionPayment {
        TenantSubscriptionPayment {
            id: m.id,
            uuid: m.uuid,
            tenant_id: m.tenant_id,
            business_plan_id: m.business_plan_id,
            plan_name: m.plan_name,
            amount_cents: m.amount_cents,
            currency: m.currency,
            payment_method: m.payment_method,
            payment_intent_id: m.payment_intent_id,
            status: m.status,
            paid_at: m.paid_at,
            created_at: m.created_at,
            created_by: m.created_by,
            updated_at: m.updated_at,
            updated_by: m.updated_by,
        }
    }

    fn from_active_model(mut m: payment_entity::ActiveModel) -> TenantSubscriptionPayment {
        TenantSubscriptionPayment {
            id: m.id.take().unwrap_or_default(),
            uuid: m.uuid.take().unwrap_or_default(),
            tenant_id: m.tenant_id.take().unwrap_or_default(),
            business_plan_id: m.business_plan_id.take().unwrap_or_default(),
            plan_name: m.plan_name.take().unwrap_or_default(),
            amount_cents: m.amount_cents.take().unwrap_or_default(),
            currency: m.currency.take().unwrap_or_default(),
            payment_method: m.payment_method.take().unwrap_or_default(),
            payment_intent_id: m.payment_intent_id.take().unwrap_or(None),
            status: m.status.take().unwrap_or_default(),
            paid_at: m.paid_at.take().unwrap_or_else(Utc::now),
            created_at: m.created_at.take().unwrap_or_else(Utc::now),
            created_by: m.created_by.take().unwrap_or(None),
            updated_at: m.updated_at.take().unwrap_or_else(Utc::now),
            updated_by: m.updated_by.take().unwrap_or(None),
        }
    }
}
