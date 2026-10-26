use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Request-only card data for storing a card. Never log, persist, echo, or
/// derive `Debug` for this type — only the provider's token is ever kept.
#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SaveCardJson {
    /// CPF/CNPJ, needed only the first time. See `CreatePixChargeJson`.
    #[serde(default)]
    pub tax_id: Option<String>,
    pub cardholder_name: String,
    pub card_number: String,
    pub expiration_month: u8,
    pub expiration_year: u16,
    pub security_code: String,
}

/// What the customer is shown about the card on file: enough to recognise it,
/// and nothing that could be used to pay with it elsewhere.
#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SavedCardJson {
    pub brand: Option<String>,
    pub last4: Option<String>,
    /// When they agreed to have it charged again.
    pub consented_at: String,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionBillingJson {
    pub subscription_id: i32,
    pub billing_mode: String,
    pub card: Option<SavedCardJson>,
}
