use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "customer_goal_setting")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub uuid: Vec<u8>,
    pub tenant_id: Option<i32>,
    pub customer_id: Option<i32>,
    pub name: String,
    pub formula_id: Option<i32>,
    pub activity_factor_id: Option<i32>,
    pub objective_id: Option<i32>,
    pub physical_activity_level_id: Option<i32>,
    pub height: Option<f64>,
    pub actual_weight: Option<f64>,
    pub desired_weight: Option<f64>,
    pub carbohydrate: Option<f64>,
    pub lipids: Option<f64>,
    pub protein: Option<f64>,
    pub customer_caloric_goal: Option<f64>,
    pub created_at: DateTimeUtc,
    pub created_by: Option<String>,
    pub updated_at: DateTimeUtc,
    pub updated_by: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

crate::impl_tenant_auditable_before_save!(ActiveModel);
