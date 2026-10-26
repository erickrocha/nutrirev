use sea_orm::entity::prelude::*;

/// A card stored at the provider. Holds the provider's opaque token and the
/// crumbs needed to show the customer which card is on file — never a PAN.
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "payment_token")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub tenant_id: i32,
    pub customer_id: i32,
    pub provider: String,
    pub provider_token: String,
    pub brand: Option<String>,
    pub last4: Option<String>,
    pub expiry_month: Option<i32>,
    pub expiry_year: Option<i32>,
    pub status: String,
    /// When the customer agreed to have this card charged again.
    pub consent_at: DateTimeUtc,
    pub consent_ip: Option<String>,
    pub created_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
