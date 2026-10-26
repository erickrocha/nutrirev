use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use super::ingredient_json::IngredientJson;

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MacrosTotalJson {
    pub kcal: f64,
    pub protein_g: f64,
    pub carbs_g: f64,
    pub fat_g: f64,
    pub fiber_g: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct EatDirectionJson {
    pub id: Option<i32>,
    pub step_number: i32,
    pub description: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct EatIngredientJson {
    pub id: Option<i32>,
    #[serde(default)]
    pub ingredient_id: Option<i32>,
    pub ingredient: Option<IngredientJson>,
    #[serde(default)]
    pub quantity: f64,
    #[serde(default)]
    pub unit: String,
    #[serde(default)]
    pub substitutes: Vec<IngredientJson>,
}

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct EatRestrictionJson {
    pub id: i32,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct EatTagJson {
    pub id: i32,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct EatMealJson {
    pub id: i32,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct EatBiotypeJson {
    pub id: i32,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct EatJson {
    pub id: Option<i32>,
    pub uuid: Option<String>,
    pub tenant_id: Option<i32>,
    pub name: String,
    pub photo: Option<String>,
    pub photo_base64: Option<String>,
    pub video_url: Option<String>,
    pub price: Option<f64>,
    pub time: Option<i32>,
    pub portion: Option<i32>,
    pub description: Option<String>,
    pub recommended_period: Option<String>,
    pub recommended_days: Option<String>,
    pub recommended_message: Option<String>,
    #[serde(default)]
    pub views: i32,
    #[serde(default)]
    pub additions: i32,
    #[serde(default)]
    pub is_highlight: bool,
    pub cycle_id: Option<i32>,
    #[serde(default)]
    pub directions: Vec<EatDirectionJson>,
    #[serde(default)]
    pub ingredients: Vec<EatIngredientJson>,
    #[serde(default)]
    pub restrictions: Vec<EatRestrictionJson>,
    #[serde(default)]
    pub tags: Vec<EatTagJson>,
    #[serde(default)]
    pub meals: Vec<EatMealJson>,
    #[serde(default)]
    pub biotypes: Vec<EatBiotypeJson>,
    #[serde(default)]
    #[schema(value_type = Vec<Object>)]
    pub side_dishes: Vec<EatJson>,
    pub total_macros: Option<MacrosTotalJson>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_by: Option<String>,
}
