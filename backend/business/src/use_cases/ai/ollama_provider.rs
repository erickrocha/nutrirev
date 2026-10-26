use crate::domain::ai_provider::{AIProvider, MealAnalysisInput, MealAnalysisResult, ProviderError};
use crate::domain::body_analysis::{BodyAnalysisInput, BodyAnalysisResult};
use crate::use_cases::ai::body_prompt_utils::{build_body_system_prompt, build_body_user_message, parse_body_analysis_json};
use crate::use_cases::ai::prompt_utils::{build_system_prompt, build_user_message, parse_analysis_json};
use base64::Engine;
use reqwest::Client;
use serde_json::json;
use std::env;

pub struct OllamaProvider {
    client: Client,
    base_url: String,
    model: String,
}

impl Default for OllamaProvider {
    fn default() -> Self {
        Self::new()
    }
}

impl OllamaProvider {
    pub fn new() -> Self {
        let base_url = env::var("OLLAMA_BASE_URL")
            .unwrap_or_else(|_| "http://localhost:11434".to_string());
        let model = env::var("OLLAMA_MODEL")
            .unwrap_or_else(|_| "gemma3:12b".to_string());

        Self {
            client: Client::new(),
            base_url,
            model,
        }
    }

    pub fn with_config(base_url: String, model: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
            model,
        }
    }
}

#[async_trait::async_trait]
impl AIProvider for OllamaProvider {
    fn name(&self) -> &'static str {
        "ollama"
    }

    async fn analyze(&self, input: MealAnalysisInput) -> Result<MealAnalysisResult, ProviderError> {
        let base64_image = base64::engine::general_purpose::STANDARD.encode(&input.image_bytes);
        let user_prompt = build_user_message(input.meal_type_hint.as_deref());

        let payload = json!({
            "model": self.model,
            "stream": false,
            "format": "json",
            "messages": [
                {
                    "role": "system",
                    "content": build_system_prompt()
                },
                {
                    "role": "user",
                    "content": user_prompt,
                    "images": [base64_image]
                }
            ]
        });

        let endpoint = format!("{}/api/chat", self.base_url.trim_end_matches('/'));

        let res = self
            .client
            .post(&endpoint)
            .json(&payload)
            .send()
            .await
            .map_err(|e| ProviderError::with_provider_error(format!("Ollama HTTP request failed to {}: {}", endpoint, e)))?;

        let status = res.status();
        let body_text = res
            .text()
            .await
            .map_err(|e| ProviderError::with_provider_error(format!("Failed to read Ollama response body: {}", e)))?;

        if !status.is_success() {
            return Err(ProviderError::with_provider_error(format!(
                "Ollama API returned status {}: {}",
                status, body_text
            )));
        }

        let response_json: serde_json::Value = serde_json::from_str(&body_text).map_err(|e| {
            ProviderError::parse_failure(format!("Failed to parse Ollama JSON response: {}", e))
        })?;

        let text_content = response_json["message"]["content"]
            .as_str()
            .ok_or_else(|| ProviderError::parse_failure("Ollama response missing message content"))?;

        let mut parsed = parse_analysis_json(text_content)?;
        parsed.raw_provider_meta = Some(json!({ "provider": "ollama", "model": self.model }));
        Ok(parsed)
    }

    async fn analyze_body(&self, input: BodyAnalysisInput) -> Result<BodyAnalysisResult, ProviderError> {
        let base64_image = base64::engine::general_purpose::STANDARD.encode(&input.image_bytes);
        let user_prompt = build_body_user_message(input.gender_hint.as_deref(), input.goal_hint.as_deref());

        let payload = json!({
            "model": self.model,
            "stream": false,
            "format": "json",
            "messages": [
                {
                    "role": "system",
                    "content": build_body_system_prompt()
                },
                {
                    "role": "user",
                    "content": user_prompt,
                    "images": [base64_image]
                }
            ]
        });

        let endpoint = format!("{}/api/chat", self.base_url.trim_end_matches('/'));

        let res = self
            .client
            .post(&endpoint)
            .json(&payload)
            .send()
            .await
            .map_err(|e| ProviderError::with_provider_error(format!("Ollama HTTP request failed to {}: {}", endpoint, e)))?;

        let status = res.status();
        let body_text = res
            .text()
            .await
            .map_err(|e| ProviderError::with_provider_error(format!("Failed to read Ollama response body: {}", e)))?;

        if !status.is_success() {
            return Err(ProviderError::with_provider_error(format!(
                "Ollama API returned status {}: {}",
                status, body_text
            )));
        }

        let response_json: serde_json::Value = serde_json::from_str(&body_text).map_err(|e| {
            ProviderError::parse_failure(format!("Failed to parse Ollama JSON response: {}", e))
        })?;

        let text_content = response_json["message"]["content"]
            .as_str()
            .ok_or_else(|| ProviderError::parse_failure("Ollama response missing message content"))?;

        let mut parsed = parse_body_analysis_json(text_content)?;
        parsed.raw_provider_meta = Some(json!({ "provider": "ollama", "model": self.model }));
        Ok(parsed)
    }
}
