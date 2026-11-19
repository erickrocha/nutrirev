use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TenantSubscriptionStatusJson {
    /// "ok" = em dia, "warning" = vencido porém dentro da tolerância, "blocked" = bloqueado por inadimplência
    pub status: String,
    pub days_overdue: i64,
    pub payment_date: String,
    pub grace_period_days: i64,
    pub plan_name: String,
    pub amount_cents: i64,
    pub formatted_amount: String,
    pub business_plan_id: i32,
    pub publishable_key: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TenantSubscriptionPixResponseJson {
    pub payment_intent_id: String,
    pub payload: String,
    pub encoded_image: Option<String>,
    pub expires_at: Option<String>,
    pub amount_cents: i64,
}

#[derive(Clone, Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PayTenantSubscriptionCardJson {
    pub cardholder_name: String,
    pub card_number: String,
    pub expiration_month: u32,
    pub expiration_year: u32,
    pub security_code: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TenantSubscriptionPaymentSuccessJson {
    pub success: bool,
    pub message: String,
    pub new_payment_date: String,
}

#[derive(Clone, Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct VerifyPaymentIntentJson {
    pub payment_intent_id: String,
}
