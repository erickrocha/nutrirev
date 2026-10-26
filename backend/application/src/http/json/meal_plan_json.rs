use super::ingredient_json::IngredientJson;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MealPlanMacrosJson {
    pub kcal: f64,
    pub protein_g: f64,
    pub carbs_g: f64,
    pub carbs_pct: f64,
    pub lipids_g: f64,
    pub lipids_pct: f64,
    pub fiber_g: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MealPlanItemJson {
    pub id: Option<i32>,
    pub ingredient_id: i32,
    pub ingredient: Option<IngredientJson>,
    pub quantity: f64,
    pub unit: String,
    #[serde(default)]
    pub substitutes: Vec<IngredientJson>,
    pub item_macros: Option<MealPlanMacrosJson>,
}

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MealPlanOptionJson {
    pub id: Option<i32>,
    pub label: String,
    pub position: i32,
    #[serde(default)]
    pub items: Vec<MealPlanItemJson>,
    pub option_macros: Option<MealPlanMacrosJson>,
}

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MealPlanMealJson {
    pub id: Option<i32>,
    pub meal_type: String,
    pub is_pre_workout: bool,
    pub is_post_workout: bool,
    pub nutritionist_note: Option<String>,
    pub position: i32,
    #[serde(default)]
    pub options: Vec<MealPlanOptionJson>,
    pub meal_macros: Option<MealPlanMacrosJson>,
}

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MealPlanJson {
    pub id: Option<i32>,
    pub uuid: Option<String>,
    pub tenant_id: Option<i32>,
    pub name: String,
    pub category: String,
    pub generation_status: String,
    pub viewed: bool,
    pub is_favorite: bool,
    pub generated_at: Option<chrono::NaiveDateTime>,
    pub nutritionist_id: Option<i32>,
    pub patient_id: Option<i32>,
    #[serde(default)]
    pub meals: Vec<MealPlanMealJson>,
    pub total_macros: Option<MealPlanMacrosJson>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_by: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::MealPlanJson;

    #[test]
    fn uses_camel_case_and_preserves_optional_association_ids() {
        let payload = serde_json::json!({
            "name": "Performance plan",
            "category": "Performance",
            "generationStatus": "finished",
            "viewed": false,
            "isFavorite": true,
            "nutritionistId": 12,
            "patientId": 34,
            "meals": []
        });

        let dto: MealPlanJson = serde_json::from_value(payload).expect("valid meal-plan DTO");
        assert_eq!(dto.generation_status, "finished");
        assert_eq!(dto.nutritionist_id, Some(12));
        assert_eq!(dto.patient_id, Some(34));

        let serialized = serde_json::to_value(dto).expect("serializable meal-plan DTO");
        assert_eq!(serialized["generationStatus"], "finished");
        assert_eq!(serialized["nutritionistId"], 12);
        assert_eq!(serialized["patientId"], 34);
        assert!(serialized.get("generation_status").is_none());
    }

    #[test]
    fn accepts_null_optional_association_ids() {
        let payload = serde_json::json!({
            "name": "Draft plan",
            "category": "General",
            "generationStatus": "draft",
            "viewed": false,
            "isFavorite": false,
            "nutritionistId": null,
            "patientId": null,
            "meals": []
        });

        let dto: MealPlanJson = serde_json::from_value(payload).expect("valid nullable IDs");
        assert_eq!(dto.nutritionist_id, None);
        assert_eq!(dto.patient_id, None);
    }
}
