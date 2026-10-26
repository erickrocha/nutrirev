use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "payment_merchant")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub tenant_id: i32,
    pub provider: String,
    pub environment: String,
    pub merchant_reference: String,
    pub credentials_secret_ref: String,
    pub status: String,
    /// Which methods this clinic offers through this connection. `active_flag`
    /// exists in the table too but is deliberately absent here: it is a
    /// generated column, and naming it would make SeaORM try to write it.
    pub credit_enabled: bool,
    pub pix_enabled: bool,
    pub recurring_enabled: bool,
    pub created_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
