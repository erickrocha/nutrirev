use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SaveMealPointTierRequestJson {
    pub daily_meal_id: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tenant_id: Option<i32>,
    // "HH:MM" or "HH:MM:SS", compared against meal_log.created_at's UTC
    // time-of-day (no per-tenant timezone system exists in this codebase).
    pub deadline_time: String,
    pub points: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MealPointTierResponseJson {
    pub id: i32,
    pub uuid: String,
    pub daily_meal_id: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tenant_id: Option<i32>,
    pub deadline_time: String,
    pub points: i32,
    pub created_at: String,
    pub updated_at: String,
}
