use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Request-only card data. Never log, persist, echo, or derive `Debug` for this type.
#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AuthorizeCardPaymentJson {
    /// CPF/CNPJ, needed only the first time and only by acquirers that register
    /// a payer. Optional at registration precisely so a patient who never pays
    /// through the app is never asked.
    #[serde(default)]
    pub tax_id: Option<String>,
    pub cardholder_name: String,
    pub card_number: String,
    pub expiration_month: u8,
    pub expiration_year: u16,
    pub security_code: String,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CardPaymentResultJson {
    pub attempt_id: i32,
    pub status: String,
    pub reference: String,
    pub amount_cents: i64,
    pub currency: String,
    pub last4: Option<String>,
    pub brand: Option<String>,
}
