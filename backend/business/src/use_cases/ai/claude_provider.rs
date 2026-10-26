use crate::domain::ai_provider::{AIProvider, MealAnalysisInput, MealAnalysisResult, ProviderError};
use crate::domain::body_analysis::{BodyAnalysisInput, BodyAnalysisResult};
use crate::use_cases::ai::body_prompt_utils::{build_body_system_prompt, build_body_user_message, parse_body_analysis_json};
use crate::use_cases::ai::prompt_utils::{build_system_prompt, build_user_message, parse_analysis_json};
use base64::Engine;
use reqwest::Client;
use serde_json::json;
use std::env;

pub struct ClaudeProvider {
    client: Client,
    api_key: Option<String>,
    model: String,
}

impl Default for ClaudeProvider {
    fn default() -> Self {
        Self::new()
    }
}

impl ClaudeProvider {
    pub fn new() -> Self {
        let api_key = env::var("CLAUDE_API_KEY").ok();
        let model = env::var("CLAUDE_MODEL")
            .ok()
            .filter(|m| !m.trim().is_empty())
            .unwrap_or_else(|| "claude-3-5-sonnet-20241022".to_string());
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
            model: "claude-3-5-sonnet-20241022".to_string(),
        }
    }
}

#[async_trait::async_trait]
impl AIProvider for ClaudeProvider {
    fn name(&self) -> &'static str {
        "claude"
    }

    async fn analyze(&self, input: MealAnalysisInput) -> Result<MealAnalysisResult, ProviderError> {
        let api_key = self.api_key.as_ref().ok_or_else(|| {
            ProviderError::with_provider_error("CLAUDE_API_KEY environment variable is not configured")
        })?;

        let base64_image = base64::engine::general_purpose::STANDARD.encode(&input.image_bytes);
        let user_prompt = build_user_message(input.meal_type_hint.as_deref());

        let payload = json!({
            "model": self.model,
            "max_tokens": 1024,
            "system": build_system_prompt(),
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": input.content_type,
                                "data": base64_image
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
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&payload)
            .send()
            .await
            .map_err(|e| ProviderError::with_provider_error(format!("Claude HTTP request failed: {}", e)))?;

        let status = res.status();
        let body_text = res
            .text()
            .await
            .map_err(|e| ProviderError::with_provider_error(format!("Failed to read Claude response body: {}", e)))?;

        if !status.is_success() {
            return Err(ProviderError::with_provider_error(format!(
                "Claude API returned status {}: {}",
                status, body_text
            )));
        }

        let response_json: serde_json::Value = serde_json::from_str(&body_text).map_err(|e| {
            ProviderError::parse_failure(format!("Failed to parse Claude JSON response: {}", e))
        })?;

        let text_content = response_json["content"][0]["text"]
            .as_str()
            .ok_or_else(|| ProviderError::parse_failure("Claude response missing content text"))?;

        let mut parsed = parse_analysis_json(text_content)?;
        parsed.raw_provider_meta = Some(json!({ "provider": "claude", "model": self.model }));
        Ok(parsed)
    }

    async fn analyze_body(&self, input: BodyAnalysisInput) -> Result<BodyAnalysisResult, ProviderError> {
        let api_key = self.api_key.as_ref().ok_or_else(|| {
            ProviderError::with_provider_error("CLAUDE_API_KEY environment variable is not configured")
        })?;

        let base64_image = base64::engine::general_purpose::STANDARD.encode(&input.image_bytes);
        let user_prompt = build_body_user_message(input.gender_hint.as_deref(), input.goal_hint.as_deref());

        let payload = json!({
            "model": self.model,
            "max_tokens": 1024,
            "system": build_body_system_prompt(),
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": input.content_type,
                                "data": base64_image
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
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&payload)
            .send()
            .await
            .map_err(|e| ProviderError::with_provider_error(format!("Claude HTTP request failed: {}", e)))?;

        let status = res.status();
        let body_text = res
            .text()
            .await
            .map_err(|e| ProviderError::with_provider_error(format!("Failed to read Claude response body: {}", e)))?;

        if !status.is_success() {
            return Err(ProviderError::with_provider_error(format!(
                "Claude API returned status {}: {}",
                status, body_text
            )));
        }

        let response_json: serde_json::Value = serde_json::from_str(&body_text).map_err(|e| {
            ProviderError::parse_failure(format!("Failed to parse Claude JSON response: {}", e))
        })?;

        let text_content = response_json["content"][0]["text"]
            .as_str()
            .ok_or_else(|| ProviderError::parse_failure("Claude response missing content text"))?;

        let mut parsed = parse_body_analysis_json(text_content)?;
        parsed.raw_provider_meta = Some(json!({ "provider": "claude", "model": self.model }));
        Ok(parsed)
    }
}
