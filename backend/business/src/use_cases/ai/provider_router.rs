use crate::domain::ai_provider::{AIProvider, MealAnalysisInput, MealAnalysisResult, ProviderError};
use crate::domain::body_analysis::{BodyAnalysisInput, BodyAnalysisResult};
use crate::use_cases::ai::claude_provider::ClaudeProvider;
use crate::use_cases::ai::gemini_provider::GeminiProvider;
use crate::use_cases::ai::ollama_provider::OllamaProvider;
use crate::use_cases::ai::openai_provider::OpenAIProvider;
use std::env;
use std::sync::Arc;
use std::time::Duration;
use tokio::time::timeout;

pub struct ProviderRouter {
    primary: Arc<dyn AIProvider>,
    fallback: Option<Arc<dyn AIProvider>>,
    timeout_ms: u64,
}

impl Default for ProviderRouter {
    fn default() -> Self {
        Self::new()
    }
}

impl ProviderRouter {
    pub fn new() -> Self {
        let primary_name = env::var("AI_PRIMARY_PROVIDER").unwrap_or_else(|_| "gemini".to_string());
        let fallback_name = env::var("AI_FALLBACK_PROVIDER").unwrap_or_else(|_| "openai".to_string());
        let timeout_ms = env::var("AI_TIMEOUT_MS")
            .ok()
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(15000);

        let primary = Self::instantiate_provider(&primary_name)
            .unwrap_or_else(|| Arc::new(GeminiProvider::new()));

        let fallback = if fallback_name != "none" && fallback_name != primary_name {
            Self::instantiate_provider(&fallback_name)
        } else {
            None
        };

        Self {
            primary,
            fallback,
            timeout_ms,
        }
    }

    pub fn with_providers(
        primary: Arc<dyn AIProvider>,
        fallback: Option<Arc<dyn AIProvider>>,
        timeout_ms: u64,
    ) -> Self {
        Self {
            primary,
            fallback,
            timeout_ms,
        }
    }

    fn instantiate_provider(name: &str) -> Option<Arc<dyn AIProvider>> {
        match name.to_lowercase().as_str() {
            "gemini" => Some(Arc::new(GeminiProvider::new())),
            "openai" => Some(Arc::new(OpenAIProvider::new())),
            "claude" => Some(Arc::new(ClaudeProvider::new())),
            "ollama" => Some(Arc::new(OllamaProvider::new())),
            _ => None,
        }
    }

    pub async fn analyze(&self, input: MealAnalysisInput) -> Result<MealAnalysisResult, ProviderError> {
        let duration = Duration::from_millis(self.timeout_ms);

        log::info!("Attempting meal analysis with primary provider: {}",self.primary.name());

        // Attempt 1: Primary provider
        match timeout(duration, self.primary.analyze(input.clone())).await {
            Ok(Ok(result)) => {
                log::info!("Meal analysis succeeded via primary provider: {}", self.primary.name());
                return Ok(result);
            }
            Ok(Err(err)) => {
                log::warn!("Primary provider {} failed: {:?}. Retrying once...",self.primary.name(),err);
            }
            Err(_) => {
                log::warn!("Primary provider {} timed out after {}ms. Retrying once...",self.primary.name(),self.timeout_ms);
            }
        }

        // Retry 1: Retry primary provider
        let last_err = match timeout(duration, self.primary.analyze(input.clone())).await {
            Ok(Ok(result)) => {
                log::info!("Meal analysis succeeded on retry via primary provider: {}", self.primary.name());
                return Ok(result);
            }
            Ok(Err(err)) => {
                log::warn!("Primary provider {} failed on retry: {:?}",self.primary.name(),err);
                err
            }
            Err(_) => {
                log::warn!("Primary provider {} timed out again after {}ms.",self.primary.name(),self.timeout_ms);
                ProviderError::timeout(format!("Primary provider {} timed out again after {}ms",self.primary.name(),self.timeout_ms))
            }
        };

        // Attempt Fallback provider if configured
        if let Some(ref fallback_provider) = self.fallback {
            log::info!("Primary provider failed. Attempting fallback provider: {}",fallback_provider.name());

            return match timeout(duration, fallback_provider.analyze(input)).await {
                Ok(Ok(result)) => {
                    log::info!("Meal analysis succeeded via fallback provider: {}",fallback_provider.name());
                    Ok(result)
                }
                Ok(Err(err)) => {
                    log::error!("Fallback provider {} failed: {:?}",fallback_provider.name(),err);
                    Err(err)
                }
                Err(_) => {
                    log::error!("Fallback provider {} timed out after {}ms.",fallback_provider.name(),self.timeout_ms);
                    Err(ProviderError::timeout(format!("Fallback provider {} timed out",fallback_provider.name())))
                }
            }
        }

        // Surface the real underlying failure instead of a generic message that
        // masks the actual cause (e.g. a 404 from an invalid model ID reads
        // identically to a genuine timeout otherwise).
        Err(last_err)
    }

    pub async fn analyze_body(&self, input: BodyAnalysisInput) -> Result<BodyAnalysisResult, ProviderError> {
        let duration = Duration::from_millis(self.timeout_ms);

        log::info!("Attempting body composition analysis with primary provider: {}",self.primary.name());

        // Attempt 1: Primary provider
        match timeout(duration, self.primary.analyze_body(input.clone())).await {
            Ok(Ok(result)) => {
                log::info!("Body analysis succeeded via primary provider: {}", self.primary.name());
                return Ok(result);
            }
            Ok(Err(err)) => {
                log::warn!("Primary provider {} body analysis failed: {:?}. Retrying once...",self.primary.name(),err);
            }
            Err(_) => {
                log::warn!("Primary provider {} body analysis timed out after {}ms. Retrying once...",self.primary.name(),self.timeout_ms);
            }
        }

        // Retry 1: Retry primary provider
        let last_err = match timeout(duration, self.primary.analyze_body(input.clone())).await {
            Ok(Ok(result)) => {
                log::info!("Body analysis succeeded on retry via primary provider: {}", self.primary.name());
                return Ok(result);
            }
            Ok(Err(err)) => {
                log::warn!("Primary provider {} body analysis failed on retry: {:?}",self.primary.name(),err);
                err
            }
            Err(_) => {
                log::warn!("Primary provider {} body analysis timed out again after {}ms.",self.primary.name(),self.timeout_ms);
                ProviderError::timeout(format!("Primary provider {} timed out again after {}ms",self.primary.name(),self.timeout_ms))
            }
        };

        // Attempt Fallback provider if configured
        if let Some(ref fallback_provider) = self.fallback {
            log::info!("Primary provider failed. Attempting fallback provider for body analysis: {}",fallback_provider.name());

            return match timeout(duration, fallback_provider.analyze_body(input)).await {
                Ok(Ok(result)) => {
                    log::info!("Body analysis succeeded via fallback provider: {}",fallback_provider.name());
                    Ok(result)
                }
                Ok(Err(err)) => {
                    log::error!("Fallback provider {} body analysis failed: {:?}",fallback_provider.name(),err);
                    Err(err)
                }
                Err(_) => {
                    log::error!("Fallback provider {} body analysis timed out after {}ms.",fallback_provider.name(),self.timeout_ms);
                    Err(ProviderError::timeout(format!("Fallback provider {} timed out",fallback_provider.name())))
                }
            }
        }

        Err(last_err)
    }
}
