use sea_orm::entity::prelude::*;

/// Pedido de contratação feito na landing. `status`: `pending`, `converted` ou `cancelled`.
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "plan_order")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub uuid: Vec<u8>,
    pub business_plan_id: i32,
    pub plan_name: String,
    pub price_in_cents: i64,
    pub status: String,
    pub tax_id: String,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub address_line1: String,
    pub address_line2: Option<String>,
    pub locality: String,
    pub administrative_area: String,
    pub postal_code: String,
    pub tenant_id: Option<i32>,
    pub created_at: DateTimeUtc,
    pub created_by: Option<String>,
    pub updated_at: DateTimeUtc,
    pub updated_by: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}


crate::impl_auditable_before_save!(ActiveModel);
