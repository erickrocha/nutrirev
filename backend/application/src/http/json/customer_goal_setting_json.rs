use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CustomerGoalSettingJson {
    pub id: Option<i32>,
    pub uuid: Option<String>,
    pub tenant_id: Option<i32>,
    pub customer_id: Option<i32>,
    pub name: String,
    pub formula_id: Option<i32>,
    pub activity_factor_id: Option<i32>,
    pub objective_id: Option<i32>,
    pub physical_activity_level_id: Option<i32>,
    pub height: Option<f64>,
    pub actual_weight: Option<f64>,
    pub desired_weight: Option<f64>,
    pub carbohydrate: Option<f64>,
    pub lipids: Option<f64>,
    pub protein: Option<f64>,
    pub customer_caloric_goal: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_by: Option<String>,
}
