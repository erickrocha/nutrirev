use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FoodItemJson {
    pub name: String,
    pub estimated_grams: f64,
    pub calories: f64,
    pub protein_g: f64,
    pub carbs_g: f64,
    pub fat_g: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MacrosJson {
    pub calories: f64,
    pub protein_g: f64,
    pub carbs_g: f64,
    pub fat_g: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MealAnalysisResponseV1 {
    pub schema_version: String,
    pub provider: String,
    pub analysis_id: String,
    pub status: String,
    pub items: Vec<FoodItemJson>,
    pub totals: MacrosJson,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MealAnalysisStatusJson {
    pub analysis_id: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MealAnalysisErrorJson {
    pub error_code: String,
    pub message: String,
    pub request_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ManualMealIngredientItemJson {
    pub ingredient_id: i32,
    pub quantity: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ManualMealAnalysisRequestJson {
    pub daily_meal_id: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meal_date: Option<String>,
    pub items: Vec<ManualMealIngredientItemJson>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ManualMealAnalysisResponseJson {
    pub log_id: String,
    pub daily_meal_id: i32,
    pub meal_date: String,
    pub analysis_type: String,
    pub items: Vec<FoodItemJson>,
    pub totals: MacrosJson,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub points_awarded: Option<i32>,
}

