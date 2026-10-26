use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CustomerDailyMealJson {
    pub customer_id: i32,
    pub daily_meal_id: i32,
}
