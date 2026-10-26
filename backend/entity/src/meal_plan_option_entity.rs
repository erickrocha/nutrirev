use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "meal_plan_option")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub meal_plan_meal_id: i32,
    pub label: String,
    pub position: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
