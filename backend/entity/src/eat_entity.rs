use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "eat")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub uuid: Vec<u8>,
    pub tenant_id: Option<i32>,
    pub name: String,
    pub photo: Option<String>,
    #[sea_orm(column_type = "Blob", nullable)]
    pub photo_base64: Option<Vec<u8>>,
    pub video_url: Option<String>,
    pub price: Option<f64>,
    pub time: Option<i32>,
    pub portion: Option<i32>,
    pub description: Option<String>,
    pub recommended_period: Option<String>,
    pub recommended_days: Option<String>,
    pub recommended_message: Option<String>,
    pub views: i32,
    pub additions: i32,
    pub is_highlight: bool,
    pub cycle_id: Option<i32>,
    pub created_at: DateTimeUtc,
    pub created_by: Option<String>,
    pub updated_at: DateTimeUtc,
    pub updated_by: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

crate::impl_tenant_auditable_before_save!(ActiveModel);
