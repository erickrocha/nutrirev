use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "meal_log")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub uuid: Vec<u8>,
    pub customer_id: i32,
    pub daily_meal_id: i32,
    pub analysis_job_id: Option<i32>,
    pub analysis_type: String,
    pub meal_date: Date,
    pub calories: f64,
    pub protein_g: f64,
    pub carbs_g: f64,
    pub fat_g: f64,
    pub items_json: Option<String>,
    pub photo: Option<String>,
    #[sea_orm(column_type = "Blob", nullable)]
    pub photo_base64: Option<Vec<u8>>,
    pub created_at: DateTimeUtc,
    pub created_by: Option<String>,
    pub updated_at: DateTimeUtc,
    pub updated_by: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

crate::impl_auditable_before_save!(ActiveModel);
