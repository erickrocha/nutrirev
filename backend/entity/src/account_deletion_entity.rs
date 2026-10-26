use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "account_deletion")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub customer_id: i32,
    pub tenant_id: Option<i32>,
    pub requested_at: DateTimeUtc,
    pub retention_until: Date,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::customer_entity::Entity",
        from = "Column::CustomerId",
        to = "super::customer_entity::Column::Id"
    )]
    Customer,
}

impl Related<super::customer_entity::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Customer.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
