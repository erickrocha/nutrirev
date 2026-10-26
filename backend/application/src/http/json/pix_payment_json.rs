use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CreatePixChargeJson {
    /// CPF/CNPJ, needed only the first time. The provider requires a registered
    /// payer, and the document is optional at registration precisely so that a
    /// patient who never pays through the app is never asked for one.
    #[serde(default)]
    pub tax_id: Option<String>,
    /// 16-64 ASCII characters. Must be stable across retries of the same
    /// checkout: a fresh key on a retry reserves nothing new, it collides with
    /// the reservation the first call already made.
    pub idempotency_key: String,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PixChargeJson {
    pub attempt_id: i32,
    pub charge_id: i32,
    pub status: String,
    pub amount_cents: i64,
    pub currency: String,
    /// The BR Code, for copy and paste. This is the field that always works.
    pub payload: String,
    /// Base64 PNG of the QR, present only on the response that created it.
    /// It is passed through from the provider and never stored, so a later
    /// status read returns `null` here and the client falls back to the code.
    pub encoded_image: Option<String>,
    pub expires_at: Option<String>,
}

/// Polled while the QR is on screen, because a webhook can be late or
/// misconfigured and the customer must not be left staring at a paid QR.
#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AttemptStatusJson {
    pub attempt_id: i32,
    pub charge_id: i32,
    pub status: String,
    pub method: String,
    pub amount_cents: i64,
    pub currency: String,
    pub payload: Option<String>,
    pub expires_at: Option<String>,
    /// Whether the charge behind this attempt is settled. The client watches
    /// this rather than interpreting attempt statuses itself.
    pub charge_paid: bool,
}
