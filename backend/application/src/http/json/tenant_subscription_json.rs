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
pub struct TenantSubscriptionIntentResponseJson {
    pub client_secret: String,
    pub payment_intent_id: String,
    pub publishable_key: String,
    pub amount_cents: i64,
    pub formatted_amount: String,
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

#[derive(Clone, Debug, Deserialize, utoipa::IntoParams)]
#[serde(rename_all = "camelCase")]
pub struct TenantSubscriptionPaymentsQuery {
    pub tenant_id: Option<i32>,
    pub payment_method: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TenantSubscriptionPaymentItemJson {
    pub id: i32,
    pub uuid: String,
    pub tenant_id: i32,
    pub tenant_name: Option<String>,
    pub business_plan_id: i32,
    pub plan_name: String,
    pub amount_cents: i64,
    pub formatted_amount: String,
    pub currency: String,
    pub payment_method: String,
    pub payment_intent_id: Option<String>,
    pub status: String,
    pub paid_at: String,
    pub created_at: String,
}
