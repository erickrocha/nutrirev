use serde::Serialize;
use utoipa::ToSchema;

/// A payment the clinic collected and then lost again.
///
/// Carries the customer's name because this is read as a list of things to act
/// on, and a row that only had ids would send staff on a second lookup.
#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PaymentReversalJson {
    pub attempt_id: i32,
    pub charge_id: i32,
    pub customer_id: i32,
    pub customer_name: String,
    pub amount_cents: i64,
    pub method: String,
    pub reversed_at: String,
    /// Where the charge stands now. A reversal puts it back on the bill with its
    /// original due date, so this is usually `open` or `overdue`.
    pub charge_status: String,
    pub due_date: String,
}
