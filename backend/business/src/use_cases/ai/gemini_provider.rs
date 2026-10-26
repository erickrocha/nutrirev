use crate::domain::ai_provider::{AIProvider, MealAnalysisInput, MealAnalysisResult, ProviderError};
use crate::domain::body_analysis::{BodyAnalysisInput, BodyAnalysisResult};
use crate::use_cases::ai::body_prompt_utils::{build_body_system_prompt, build_body_user_message, parse_body_analysis_json};
use crate::use_cases::ai::prompt_utils::{build_system_prompt, build_user_message, parse_analysis_json};
use base64::Engine;
use reqwest::Client;
use serde_json::json;
use std::env;

pub struct GeminiProvider {
    client: Client,
    api_key: Option<String>,
    model: String,
}

impl Default for GeminiProvider {
    fn default() -> Self {
        Self::new()
    }
}

impl GeminiProvider {
    pub fn new() -> Self {
        let api_key = env::var("GEMINI_API_KEY").ok();
        let model = env::var("GEMINI_MODEL").unwrap_or_else(|_| "gemini-1.5-flash".to_string());
        Self {
            client: Client::new(),
            api_key,
            model,
        }
    }

    pub fn with_api_key(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key: Some(api_key),
            model: "gemini-1.5-flash".to_string(),
        }
    }
}

#[async_trait::async_trait]
impl AIProvider for GeminiProvider {
    fn name(&self) -> &'static str {
        "gemini"
    }

    async fn analyze(&self, input: MealAnalysisInput) -> Result<MealAnalysisResult, ProviderError> {
        let api_key = self.api_key.as_ref().ok_or_else(|| {
            ProviderError::with_provider_error("GEMINI_API_KEY environment variable is not configured")
        })?;

        let base64_image = base64::engine::general_purpose::STANDARD.encode(&input.image_bytes);
        let combined_prompt = format!("{}\n\n{}", build_system_prompt(), build_user_message(input.meal_type_hint.as_deref()));

        let payload = json!({
            "contents": [
                {
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": input.content_type,
                                "data": base64_image
                            }
                        },
                        {
                            "text": combined_prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        });

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            self.model, api_key
        );

        let res = self
            .client
            .post(&url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| ProviderError::with_provider_error(format!("Gemini HTTP request failed: {}", e)))?;

        let status = res.status();
        let body_text = res
            .text()
            .await
            .map_err(|e| ProviderError::with_provider_error(format!("Failed to read Gemini response body: {}", e)))?;

        if !status.is_success() {
            return Err(ProviderError::with_provider_error(format!(
                "Gemini API returned status {}: {}",
                status, body_text
            )));
        }

        let response_json: serde_json::Value = serde_json::from_str(&body_text).map_err(|e| {
            ProviderError::parse_failure(format!("Failed to parse Gemini JSON response: {}", e))
        })?;

        let text_content = response_json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or_else(|| ProviderError::parse_failure("Gemini response missing text candidate"))?;

        let mut parsed = parse_analysis_json(text_content)?;
        parsed.raw_provider_meta = Some(json!({ "provider": "gemini", "model": self.model }));
        Ok(parsed)
    }

    async fn analyze_body(&self, input: BodyAnalysisInput) -> Result<BodyAnalysisResult, ProviderError> {
        let api_key = self.api_key.as_ref().ok_or_else(|| {
            ProviderError::with_provider_error("GEMINI_API_KEY environment variable is not configured")
        })?;

        let base64_image = base64::engine::general_purpose::STANDARD.encode(&input.image_bytes);
        let combined_prompt = format!(
            "{}\n\n{}",
            build_body_system_prompt(),
            build_body_user_message(input.gender_hint.as_deref(), input.goal_hint.as_deref())
        );

        let payload = json!({
            "contents": [
                {
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": input.content_type,
                                "data": base64_image
                            }
                        },
                        {
                            "text": combined_prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        });

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            self.model, api_key
        );

        let res = self
            .client
            .post(&url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| ProviderError::with_provider_error(format!("Gemini HTTP request failed: {}", e)))?;

        let status = res.status();
        let body_text = res
            .text()
            .await
            .map_err(|e| ProviderError::with_provider_error(format!("Failed to read Gemini response body: {}", e)))?;

        if !status.is_success() {
            return Err(ProviderError::with_provider_error(format!(
                "Gemini API returned status {}: {}",
                status, body_text
            )));
        }

        let response_json: serde_json::Value = serde_json::from_str(&body_text).map_err(|e| {
            ProviderError::parse_failure(format!("Failed to parse Gemini JSON response: {}", e))
        })?;

        let text_content = response_json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or_else(|| ProviderError::parse_failure("Gemini response missing text candidate"))?;

        let mut parsed = parse_body_analysis_json(text_content)?;
        parsed.raw_provider_meta = Some(json!({ "provider": "gemini", "model": self.model }));
        Ok(parsed)
    }
}
