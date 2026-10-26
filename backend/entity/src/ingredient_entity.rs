use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "ingredient")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub uuid: Vec<u8>,
    pub tenant_id: Option<i32>,
    pub name: String,
    pub kcal: f64,
    pub protein: f64,
    pub carbs: f64,
    pub fat: f64,
    pub fiber: f64,
    pub taco_id: Option<i32>,
    pub moisture: Option<f64>,
    pub kj: Option<f64>,
    pub cholesterol: Option<f64>,
    pub ash: Option<f64>,
    pub calcium: Option<f64>,
    pub magnesium: Option<f64>,
    pub manganese: Option<f64>,
    pub phosphorus: Option<f64>,
    pub iron: Option<f64>,
    pub sodium: Option<f64>,
    pub potassium: Option<f64>,
    pub copper: Option<f64>,
    pub zinc: Option<f64>,
    pub retinol: Option<f64>,
    pub re: Option<f64>,
    pub rae: Option<f64>,
    pub thiamine: Option<f64>,
    pub riboflavin: Option<f64>,
    pub pyridoxine: Option<f64>,
    pub niacin: Option<f64>,
    pub vitamin_c: Option<f64>,
    pub saturated_fat: Option<f64>,
    pub monounsaturated_fat: Option<f64>,
    pub polyunsaturated_fat: Option<f64>,
    pub created_at: DateTimeUtc,
    pub created_by: Option<String>,
    pub updated_at: DateTimeUtc,
    pub updated_by: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

crate::impl_tenant_auditable_before_save!(ActiveModel);
