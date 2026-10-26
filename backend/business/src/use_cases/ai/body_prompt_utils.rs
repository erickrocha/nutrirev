use crate::domain::ai_provider::ProviderError;
use crate::domain::body_analysis::BodyAnalysisResult;
use crate::use_cases::ai::prompts::VISION_PROMPTS;

pub fn build_body_system_prompt() -> &'static str {
    VISION_PROMPTS["body_analysis"]["system_prompt"]
        .as_str()
        .expect("body_analysis.system_prompt missing in vision_prompts.json")
}

pub fn build_body_user_message(gender_hint: Option<&str>, goal_hint: Option<&str>) -> String {
    let mut message = VISION_PROMPTS["body_analysis"]["user_message_base"]
        .as_str()
        .expect("body_analysis.user_message_base missing in vision_prompts.json")
        .to_string();

    if let Some(gender) = gender_hint {
        if !gender.trim().is_empty() {
            let template = VISION_PROMPTS["body_analysis"]["gender_hint_suffix"]
                .as_str()
                .expect("body_analysis.gender_hint_suffix missing in vision_prompts.json");
            message.push_str(&template.replace("{gender}", gender.trim()));
        }
    }
    if let Some(goal) = goal_hint {
        if !goal.trim().is_empty() {
            let template = VISION_PROMPTS["body_analysis"]["goal_hint_suffix"]
                .as_str()
                .expect("body_analysis.goal_hint_suffix missing in vision_prompts.json");
            message.push_str(&template.replace("{goal}", goal.trim()));
        }
    }

    message.push_str(
        VISION_PROMPTS["body_analysis"]["user_message_closing"]
            .as_str()
            .expect("body_analysis.user_message_closing missing in vision_prompts.json"),
    );
    message
}

pub fn parse_body_analysis_json(raw_text: &str) -> Result<BodyAnalysisResult, ProviderError> {
    let clean_text = raw_text
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```JSON")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    let result: BodyAnalysisResult = serde_json::from_str(clean_text).map_err(|e| {
        ProviderError::parse_failure(format!(
            "Failed to parse body analysis AI provider JSON output: {} (Raw snippet: {})",
            e,
            &clean_text[..clean_text.len().min(200)]
        ))
    })?;

    Ok(result)
}
