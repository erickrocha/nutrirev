use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "payment_date")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub uuid: Vec<u8>,
    pub tenant_id: Option<i32>,
    pub customer_id: Option<i32>,
    pub clinical_plan_id: Option<i32>,
    pub first_due_date: Date,
    pub next_due_date: Option<Date>,
    pub status: String,
    /// How each cycle gets paid: `manual` (the patient pays each charge by
    /// hand), `card_on_file` (the worker charges a stored card), or
    /// `pix_automatico`.
    pub billing_mode: String,
    pub payment_token_id: Option<i32>,
    pub is_active: bool,
    pub created_at: DateTimeUtc,
    pub created_by: Option<String>,
    pub updated_at: DateTimeUtc,
    pub updated_by: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

crate::impl_tenant_auditable_before_save!(ActiveModel);
