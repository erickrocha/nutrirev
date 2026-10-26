use crate::domain::ai_provider::{AIProvider, MealAnalysisInput, MealAnalysisResult, ProviderError};
use crate::domain::body_analysis::{BodyAnalysisInput, BodyAnalysisResult};
use crate::use_cases::ai::body_prompt_utils::{build_body_system_prompt, build_body_user_message, parse_body_analysis_json};
use crate::use_cases::ai::prompt_utils::{build_system_prompt, build_user_message, parse_analysis_json};
use base64::Engine;
use reqwest::Client;
use serde_json::json;
use std::env;

pub struct OpenAIProvider {
    client: Client,
    api_key: Option<String>,
    model: String,
}

impl Default for OpenAIProvider {
    fn default() -> Self {
        Self::new()
    }
}

impl OpenAIProvider {
    pub fn new() -> Self {
        let api_key = env::var("OPENAI_API_KEY").ok();
        let model = env::var("OPENAI_MODEL").unwrap_or_else(|_| "gpt-4o-mini".to_string());
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
            model: "gpt-4o-mini".to_string(),
        }
    }
}

#[async_trait::async_trait]
impl AIProvider for OpenAIProvider {
    fn name(&self) -> &'static str {
        "openai"
    }

    async fn analyze(&self, input: MealAnalysisInput) -> Result<MealAnalysisResult, ProviderError> {
        let api_key = self.api_key.as_ref().ok_or_else(|| {
            ProviderError::with_provider_error("OPENAI_API_KEY environment variable is not configured")
        })?;

        let base64_image = base64::engine::general_purpose::STANDARD.encode(&input.image_bytes);
        let image_data_url = format!("data:{};base64,{}", input.content_type, base64_image);
        let user_prompt = build_user_message(input.meal_type_hint.as_deref());

        let payload = json!({
            "model": self.model,
            "response_format": { "type": "json_object" },
            "max_tokens": 1024,
            "messages": [
                {
                    "role": "system",
                    "content": build_system_prompt()
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_data_url
                            }
                        },
                        {
                            "type": "text",
                            "text": user_prompt
                        }
                    ]
                }
            ]
        });

        let res = self
            .client
            .post("https://api.openai.com/v1/chat/completions")
            .bearer_auth(api_key)
            .json(&payload)
            .send()
            .await
            .map_err(|e| ProviderError::with_provider_error(format!("OpenAI HTTP request failed: {}", e)))?;

        let status = res.status();
        let body_text = res
            .text()
            .await
            .map_err(|e| ProviderError::with_provider_error(format!("Failed to read OpenAI response body: {}", e)))?;

        if !status.is_success() {
            return Err(ProviderError::with_provider_error(format!(
                "OpenAI API returned status {}: {}",
                status, body_text
            )));
        }

        let response_json: serde_json::Value = serde_json::from_str(&body_text).map_err(|e| {
            ProviderError::parse_failure(format!("Failed to parse OpenAI JSON response: {}", e))
        })?;

        let text_content = response_json["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| ProviderError::parse_failure("OpenAI response missing message content"))?;

        let mut parsed = parse_analysis_json(text_content)?;
        parsed.raw_provider_meta = Some(json!({ "provider": "openai", "model": self.model }));
        Ok(parsed)
    }

    async fn analyze_body(&self, input: BodyAnalysisInput) -> Result<BodyAnalysisResult, ProviderError> {
        let api_key = self.api_key.as_ref().ok_or_else(|| {
            ProviderError::with_provider_error("OPENAI_API_KEY environment variable is not configured")
        })?;

        let base64_image = base64::engine::general_purpose::STANDARD.encode(&input.image_bytes);
        let image_data_url = format!("data:{};base64,{}", input.content_type, base64_image);
        let user_prompt = build_body_user_message(input.gender_hint.as_deref(), input.goal_hint.as_deref());

        let payload = json!({
            "model": self.model,
            "response_format": { "type": "json_object" },
            "max_tokens": 1024,
            "messages": [
                {
                    "role": "system",
                    "content": build_body_system_prompt()
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_data_url
                            }
                        },
                        {
                            "type": "text",
                            "text": user_prompt
                        }
                    ]
                }
            ]
        });

        let res = self
            .client
            .post("https://api.openai.com/v1/chat/completions")
            .bearer_auth(api_key)
            .json(&payload)
            .send()
            .await
            .map_err(|e| ProviderError::with_provider_error(format!("OpenAI HTTP request failed: {}", e)))?;

        let status = res.status();
        let body_text = res
            .text()
            .await
            .map_err(|e| ProviderError::with_provider_error(format!("Failed to read OpenAI response body: {}", e)))?;

        if !status.is_success() {
            return Err(ProviderError::with_provider_error(format!(
                "OpenAI API returned status {}: {}",
                status, body_text
            )));
        }

        let response_json: serde_json::Value = serde_json::from_str(&body_text).map_err(|e| {
            ProviderError::parse_failure(format!("Failed to parse OpenAI JSON response: {}", e))
        })?;

        let text_content = response_json["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| ProviderError::parse_failure("OpenAI response missing message content"))?;

        let mut parsed = parse_body_analysis_json(text_content)?;
        parsed.raw_provider_meta = Some(json!({ "provider": "openai", "model": self.model }));
        Ok(parsed)
    }
}
