use crate::domain::body_analysis::{BodyAnalysisInput, BodyAnalysisResult};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct MealAnalysisInput {
    pub image_bytes: Vec<u8>,
    pub content_type: String,
    pub meal_type_hint: Option<String>,
    pub daily_meal_id: i32,
    pub meal_date: chrono::NaiveDate,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FoodItem {
    pub name: String,
    pub estimated_grams: f64,
    pub calories: f64,
    pub protein_g: f64,
    pub carbs_g: f64,
    pub fat_g: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Macros {
    pub calories: f64,
    pub protein_g: f64,
    pub carbs_g: f64,
    pub fat_g: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MealAnalysisResult {
    pub items: Vec<FoodItem>,
    pub totals: Macros,
    #[serde(skip_serializing)]
    pub raw_provider_meta: Option<serde_json::Value>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ProviderErrorKind {
    InvalidImage,
    Timeout,
    ProviderError,
    ParseFailure,
    QuotaExceeded,
    Unauthorized,
    InvalidDailyMeal,
    InvalidDate,
}

impl ProviderErrorKind {
    pub fn as_code(&self) -> &'static str {
        match self {
            ProviderErrorKind::InvalidImage => "INVALID_IMAGE",
            ProviderErrorKind::Timeout => "PROVIDER_TIMEOUT",
            ProviderErrorKind::ProviderError => "PROVIDER_ERROR",
            ProviderErrorKind::ParseFailure => "PARSE_FAILURE",
            ProviderErrorKind::QuotaExceeded => "QUOTA_EXCEEDED",
            ProviderErrorKind::Unauthorized => "UNAUTHORIZED",
            ProviderErrorKind::InvalidDailyMeal => "INVALID_DAILY_MEAL",
            ProviderErrorKind::InvalidDate => "INVALID_DATE",
        }
    }
}

#[derive(Debug, Clone)]
pub struct ProviderError {
    pub kind: ProviderErrorKind,
    pub message: String,
}

impl ProviderError {
    pub fn new(kind: ProviderErrorKind, message: impl Into<String>) -> Self {
        Self {
            kind,
            message: message.into(),
        }
    }

    pub fn invalid_image(msg: impl Into<String>) -> Self {
        Self::new(ProviderErrorKind::InvalidImage, msg)
    }

    pub fn timeout(msg: impl Into<String>) -> Self {
        Self::new(ProviderErrorKind::Timeout, msg)
    }

    pub fn with_provider_error(msg: impl Into<String>) -> Self {
        Self::new(ProviderErrorKind::ProviderError, msg)
    }

    pub fn parse_failure(msg: impl Into<String>) -> Self {
        Self::new(ProviderErrorKind::ParseFailure, msg)
    }

    pub fn quota_exceeded(msg: impl Into<String>) -> Self {
        Self::new(ProviderErrorKind::QuotaExceeded, msg)
    }

    pub fn unauthorized(msg: impl Into<String>) -> Self {
        Self::new(ProviderErrorKind::Unauthorized, msg)
    }
}

impl std::fmt::Display for ProviderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{:?}] {}", self.kind, self.message)
    }
}

impl std::error::Error for ProviderError {}

#[async_trait::async_trait]
pub trait AIProvider: Send + Sync {
    fn name(&self) -> &'static str;
    async fn analyze(&self, input: MealAnalysisInput) -> Result<MealAnalysisResult, ProviderError>;
    async fn analyze_body(&self, input: BodyAnalysisInput) -> Result<BodyAnalysisResult, ProviderError>;
}
