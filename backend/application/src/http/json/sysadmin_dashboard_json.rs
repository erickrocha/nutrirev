use chrono::{DateTime, NaiveDate, Utc};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SysAdminDashboardTotalsJson {
    pub tenants: u64,
    pub users: u64,
    pub active_plans: u64,
    pub tenants_without_active_plan: u64,
    pub monthly_recurring_revenue_in_cents: i64,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecentSysAdminTenantJson {
    pub id: i32,
    pub uuid: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub created_at: DateTime<Utc>,
    pub active_plan_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BillingAttentionItemJson {
    pub business_plan_id: i32,
    pub business_plan_uuid: String,
    pub tenant_id: i32,
    pub tenant_name: Option<String>,
    pub plan_name: String,
    pub payment_date: NaiveDate,
    pub contract_value_in_cents: i64,
    pub overdue: bool,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SysAdminDashboardJson {
    pub generated_at: DateTime<Utc>,
    pub totals: SysAdminDashboardTotalsJson,
    pub recent_tenants: Vec<RecentSysAdminTenantJson>,
    pub billing_attention: Vec<BillingAttentionItemJson>,
}
