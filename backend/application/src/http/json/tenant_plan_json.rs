use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, ToSchema, Debug, Clone)]
// Every other payload in this API is camelCase; this one was not, so the screen
// read `businessPlanId` off a body that said `business_plan_id` and rendered
// "Plan #undefined".
#[serde(rename_all = "camelCase")]
pub struct TenantPlanJson {
    pub id: Option<i32>,
    pub uuid: Option<String>,
    pub tenant_id: i32,
    pub business_plan_id: i32,
    #[schema(value_type = String, format = Date)]
    pub payment_date: NaiveDate,
    pub active: bool,
}
