use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TenantDashboardTotalsJson {
    pub customers: u64,
    pub doctors: u64,
    pub customers_with_goals: u64,
    pub meal_plans: u64,
    pub finished_meal_plans: u64,
    pub mobile_enabled_customers: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecentTenantCustomerJson {
    pub id: i32,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub date_of_birth: chrono::NaiveDate,
    pub gender: String,
    pub address_line1: Option<String>,
    pub address_line2: Option<String>,
    pub locality: Option<String>,
    pub administrative_area: Option<String>,
    pub postal_code: Option<String>,
    pub country_code: Option<String>,
    pub clinical_plan_id: Option<i32>,
    pub prepare_meal_id: Option<i32>,
    pub mobile_enabled: bool,
    pub photo: Option<String>,
    pub photo_url: Option<String>,
    pub photo_base64: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TenantDashboardJson {
    pub tenant_id: i32,
    pub generated_at: DateTime<Utc>,
    pub totals: TenantDashboardTotalsJson,
    pub recent_customers: Vec<RecentTenantCustomerJson>,
}
