use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "payment_attempt")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub tenant_id: i32,
    pub charge_id: i32,
    pub merchant_id: i32,
    pub idempotency_key: String,
    pub reference: String,
    pub method: String,
    pub installments: i32,
    pub amount_cents: i64,
    pub currency: String,
    pub status: String,
    pub active_charge_id: Option<i32>,
    pub submitted_by_user_id: Option<i32>,
    /// `cit` when the cardholder submitted it, `mit` when the billing worker did.
    pub initiator: String,
    /// Pix BR Code ("copia e cola"). The QR image is never stored here.
    pub pix_payload: Option<String>,
    pub pix_expires_at: Option<DateTimeUtc>,
    pub provider_transaction_id: Option<String>,
    pub return_code: Option<String>,
    pub return_message: Option<String>,
    pub last4: Option<String>,
    pub brand: Option<String>,
    pub submitted_at: Option<DateTimeUtc>,
    pub completed_at: Option<DateTimeUtc>,
    /// When the money went back out. Set once, so a redelivered refund
    /// notification cannot reverse the same charge twice.
    pub reversed_at: Option<DateTimeUtc>,
    pub created_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
