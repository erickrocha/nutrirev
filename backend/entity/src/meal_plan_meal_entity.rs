use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "meal_plan_meal")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub meal_plan_id: i32,
    pub meal_type: String,
    pub is_pre_workout: bool,
    pub is_post_workout: bool,
    pub nutritionist_note: Option<String>,
    pub position: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
