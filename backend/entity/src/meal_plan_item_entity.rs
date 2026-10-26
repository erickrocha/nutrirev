use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "meal_plan_item")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub meal_plan_option_id: i32,
    pub ingredient_id: i32,
    pub quantity: f64,
    pub unit: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
