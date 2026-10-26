use crate::http::json::meal_analysis_json::{FoodItemJson, MacrosJson};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SaveMealLogRequestJson {
    pub daily_meal_id: i32,
    pub meal_date: String,
    pub analysis_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MealLogResponseJson {
    pub log_id: String,
    pub daily_meal_id: i32,
    pub meal_date: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub analysis_id: Option<String>,
    pub analysis_type: String,
    pub items: Vec<FoodItemJson>,
    pub totals: MacrosJson,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub photo: Option<String>,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub points_awarded: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MealLogEntryJson {
    pub log_id: String,
    pub daily_meal_id: i32,
    pub meal_date: String,
    pub analysis_type: String,
    pub items: Vec<FoodItemJson>,
    pub totals: MacrosJson,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub photo: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DailyNutritionSummaryJson {
    pub date: String,
    pub calories_consumed: f64,
    pub protein_g: f64,
    pub carbs_g: f64,
    pub fat_g: f64,
    pub meals_logged: u64,
}
