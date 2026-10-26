use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "meal_plan_item_substitute")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub meal_plan_item_id: i32,
    #[sea_orm(primary_key, auto_increment = false)]
    pub substitute_ingredient_id: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
