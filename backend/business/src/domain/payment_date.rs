use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::{bytes_para_string, string_to_bytes};
use crate::domain::payment_schedule::{BillingMode, SubscriptionStatus};
use chrono::{NaiveDate, NaiveDateTime};
use entity::payment_date_entity::{ActiveModel, Model};
use sea_orm::{NotSet, Set, TryIntoModel};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaymentDate {
    pub id: Option<i32>,
    pub uuid: Option<String>,
    pub tenant_id: Option<i32>,
    pub customer_id: Option<i32>,
    pub clinical_plan_id: Option<i32>,
    /// The date the tenant typed when the customer signed up. Never moves.
    pub first_due_date: NaiveDate,
    /// Where the renewal cycle has advanced to. `None` on a finished subscription.
    pub next_due_date: Option<NaiveDate>,
    pub status: String,
    /// How each cycle gets paid. See `BillingMode`.
    pub billing_mode: String,
    pub payment_token_id: Option<i32>,
    pub is_active: bool,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
}

pub struct PaymentDateEntityMapper {}

impl EntityMapper<PaymentDate, Model, ActiveModel> for PaymentDateEntityMapper {
    fn build_active_model(d: PaymentDate) -> ActiveModel {
        ActiveModel {
            id: match d.id {
                Some(id) => Set(id),
                None => NotSet,
            },
            uuid: match d.uuid {
                Some(uuid) => Set(string_to_bytes(&uuid)),
                None => NotSet,
            },
            tenant_id: Set(d.tenant_id),
            customer_id: Set(d.customer_id),
            clinical_plan_id: Set(d.clinical_plan_id),
            first_due_date: Set(d.first_due_date),
            next_due_date: Set(d.next_due_date),
            status: Set(d.status),
            billing_mode: Set(d.billing_mode),
            payment_token_id: Set(d.payment_token_id),
            is_active: Set(d.is_active),
            created_at: NotSet,
            created_by: match d.created_by {
                Some(cb) => Set(Some(cb)),
                None => NotSet,
            },
            updated_at: NotSet,
            updated_by: match d.updated_by {
                Some(ub) => Set(Some(ub)),
                None => NotSet,
            },
        }
    }

    fn from_model(e: Model) -> PaymentDate {
        PaymentDate {
            id: Some(e.id),
            uuid: Some(bytes_para_string(e.uuid)),
            tenant_id: e.tenant_id,
            customer_id: e.customer_id,
            clinical_plan_id: e.clinical_plan_id,
            first_due_date: e.first_due_date,
            next_due_date: e.next_due_date,
            status: e.status,
            billing_mode: e.billing_mode,
            payment_token_id: e.payment_token_id,
            is_active: e.is_active,
            created_by: e.created_by,
            updated_by: e.updated_by,
            created_at: Some(e.created_at.naive_utc()),
            updated_at: Some(e.updated_at.naive_utc()),
        }
    }

    fn from_active_model(mut e: ActiveModel) -> PaymentDate {
        let model: Result<Model, _> = e.clone().try_into_model();
        match model {
            Ok(m) => Self::from_model(m),
            Err(_) => PaymentDate {
                id: e.id.take(),
                uuid: e.uuid.take().map(bytes_para_string),
                tenant_id: e.tenant_id.take().flatten(),
                customer_id: e.customer_id.take().flatten(),
                clinical_plan_id: e.clinical_plan_id.take().flatten(),
                first_due_date: e.first_due_date.take().unwrap_or_default(),
                next_due_date: e.next_due_date.take().flatten(),
                status: e
                    .status
                    .take()
                    .unwrap_or_else(|| SubscriptionStatus::Active.as_str().to_owned()),
                billing_mode: e
                    .billing_mode
                    .take()
                    .unwrap_or_else(|| BillingMode::Manual.as_str().to_owned()),
                payment_token_id: e.payment_token_id.take().flatten(),
                is_active: e.is_active.take().unwrap_or(true),
                created_by: e.created_by.take().flatten(),
                updated_by: e.updated_by.take().flatten(),
                created_at: e.created_at.take().map(|dt| dt.naive_utc()),
                updated_at: e.updated_at.take().map(|dt| dt.naive_utc()),
            },
        }
    }
}
