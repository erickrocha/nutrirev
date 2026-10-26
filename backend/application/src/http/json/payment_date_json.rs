use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PaymentDateJson {
    pub id: Option<i32>,
    pub uuid: Option<String>,
    pub tenant_id: Option<i32>,
    pub customer_id: Option<i32>,
    pub clinical_plan_id: Option<i32>,
    /// The date the clinic set at signup. Never moves.
    pub first_due_date: Option<chrono::NaiveDate>,
    /// Where the renewal cycle has reached. Server-owned; ignored on write.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_due_date: Option<chrono::NaiveDate>,
    /// `active`, `cancelled` or `completed`. Server-owned; ignored on write.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    /// Read-only here. Changed through the patient's billing-mode route.
    pub billing_mode: Option<String>,
    pub is_active: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_by: Option<String>,
}
