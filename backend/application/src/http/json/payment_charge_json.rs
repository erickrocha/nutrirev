use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// One billing cycle of a customer's clinical plan.
#[derive(Serialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PaymentChargeJson {
    pub id: i32,
    pub customer_id: i32,
    pub clinical_plan_id: Option<i32>,
    pub payment_date_id: Option<i32>,
    pub sequence: i32,
    pub amount_cents: i64,
    pub currency: String,
    pub due_date: chrono::NaiveDate,
    /// `open`, `overdue`, `paid` or `cancelled`.
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub paid_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// Reserves an attempt against a charge. Carries no card data and no amount —
/// the amount is always the server's.
#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PrepareChargePaymentJson {
    /// 16-64 ASCII characters. Retrying with the same key returns the same
    /// attempt instead of reserving a second one.
    pub idempotency_key: String,
    /// `credit` or `debit`.
    pub method: String,
    /// 1-12 for credit; debit must be 1.
    pub installments: i32,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PreparedAttemptJson {
    pub attempt_id: i32,
    pub charge_id: i32,
    pub status: String,
    pub reference: String,
    pub method: String,
    pub installments: i32,
    pub amount_cents: i64,
    pub currency: String,
}
