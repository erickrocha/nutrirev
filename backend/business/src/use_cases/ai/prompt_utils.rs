use crate::domain::ai_provider::{Macros, MealAnalysisResult, ProviderError};
use crate::use_cases::ai::prompts::VISION_PROMPTS;

pub fn build_system_prompt() -> &'static str {
    VISION_PROMPTS["meal_analysis"]["system_prompt"]
        .as_str()
        .expect("meal_analysis.system_prompt missing in vision_prompts.json")
}

pub fn build_user_message(meal_type_hint: Option<&str>) -> String {
    if let Some(hint) = meal_type_hint {
        let template = VISION_PROMPTS["meal_analysis"]["user_message_with_hint_template"]
            .as_str()
            .expect("meal_analysis.user_message_with_hint_template missing in vision_prompts.json");
        template.replace("{hint}", hint)
    } else {
        VISION_PROMPTS["meal_analysis"]["user_message"]
            .as_str()
            .expect("meal_analysis.user_message missing in vision_prompts.json")
            .to_string()
    }
}

pub fn parse_analysis_json(raw_text: &str) -> Result<MealAnalysisResult, ProviderError> {
    let clean_text = raw_text
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```JSON")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    let mut result: MealAnalysisResult = serde_json::from_str(clean_text).map_err(|e| {
        ProviderError::parse_failure(format!("Failed to parse AI provider JSON output: {} (Raw text snippet: {})", e, &clean_text[..clean_text.len().min(200)]))
    })?;

    if result.items.is_empty() {
        return Err(ProviderError::parse_failure("AI provider returned empty food items list"));
    }

    // Sanitize totals by recalculating from items if needed
    let mut calc_calories = 0.0;
    let mut calc_protein = 0.0;
    let mut calc_carbs = 0.0;
    let mut calc_fat = 0.0;

    for item in &result.items {
        calc_calories += item.calories;
        calc_protein += item.protein_g;
        calc_carbs += item.carbs_g;
        calc_fat += item.fat_g;
    }

    if result.totals.calories == 0.0 && calc_calories > 0.0 {
        result.totals = Macros {
            calories: (calc_calories * 10.0).round() / 10.0,
            protein_g: (calc_protein * 10.0).round() / 10.0,
            carbs_g: (calc_carbs * 10.0).round() / 10.0,
            fat_g: (calc_fat * 10.0).round() / 10.0,
        };
    }

    Ok(result)
}
