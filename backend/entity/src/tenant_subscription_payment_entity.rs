use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "tenant_subscription_payment")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub uuid: Vec<u8>,
    pub tenant_id: i32,
    pub business_plan_id: i32,
    pub plan_name: String,
    pub amount_cents: i64,
    pub currency: String,
    pub payment_method: String,
    pub payment_intent_id: Option<String>,
    pub status: String,
    pub paid_at: DateTimeUtc,
    pub created_at: DateTimeUtc,
    pub created_by: Option<String>,
    pub updated_at: DateTimeUtc,
    pub updated_by: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::tenant_entity::Entity",
        from = "Column::TenantId",
        to = "super::tenant_entity::Column::Id"
    )]
    Tenant,
    #[sea_orm(
        belongs_to = "super::business_plan_entity::Entity",
        from = "Column::BusinessPlanId",
        to = "super::business_plan_entity::Column::Id"
    )]
    BusinessPlan,
}

impl Related<super::tenant_entity::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Tenant.def()
    }
}

impl Related<super::business_plan_entity::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::BusinessPlan.def()
    }
}

crate::impl_auditable_before_save!(ActiveModel);
