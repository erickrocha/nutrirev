use sea_orm::entity::prelude::*;
use sea_orm::prelude::async_trait::async_trait;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "customer_pre_existing_conditions")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub customer_id: i32,
    #[sea_orm(primary_key, auto_increment = false)]
    pub pre_existing_conditions_id: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {}
