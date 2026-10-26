use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "payment_charge")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub tenant_id: i32,
    pub customer_id: i32,
    pub clinical_plan_id: Option<i32>,
    pub payment_date_id: Option<i32>,
    pub sequence: i32,
    pub amount_cents: i64,
    pub currency: String,
    pub due_date: Date,
    pub status: String,
    pub paid_at: Option<DateTimeUtc>,
    pub created_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
