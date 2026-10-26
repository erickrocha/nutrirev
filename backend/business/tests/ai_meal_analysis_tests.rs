use business::domain::ai_provider::{
    AIProvider, FoodItem, Macros, MealAnalysisInput, MealAnalysisResult, ProviderError,
    ProviderErrorKind,
};
use business::use_cases::ai::image_processor::ImageProcessor;
use business::use_cases::ai::prompt_utils::parse_analysis_json;
use business::use_cases::ai::provider_router::ProviderRouter;
use business::use_cases::ai::quota_manager::QuotaManager;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;

// ==================== Mock Providers for Testing ====================

struct MockSuccessProvider {
    name: &'static str,
}

#[async_trait::async_trait]
impl AIProvider for MockSuccessProvider {
    fn name(&self) -> &'static str {
        self.name
    }

    async fn analyze(
        &self,
        _input: MealAnalysisInput,
    ) -> Result<MealAnalysisResult, ProviderError> {
        Ok(MealAnalysisResult {
            items: vec![FoodItem {
                name: "grilled chicken breast".to_string(),
                estimated_grams: 150.0,
                calories: 248.0,
                protein_g: 46.5,
                carbs_g: 0.0,
                fat_g: 5.4,
                confidence: Some("high".to_string()),
            }],
            totals: Macros {
                calories: 248.0,
                protein_g: 46.5,
                carbs_g: 0.0,
                fat_g: 5.4,
            },
            raw_provider_meta: None,
        })
    }

    async fn analyze_body(
        &self,
        _input: business::domain::body_analysis::BodyAnalysisInput,
    ) -> Result<business::domain::body_analysis::BodyAnalysisResult, ProviderError> {
        Err(ProviderError::with_provider_error("Not implemented"))
    }
}

struct MockFailingProvider {
    name: &'static str,
    call_count: Arc<AtomicU32>,
}

#[async_trait::async_trait]
impl AIProvider for MockFailingProvider {
    fn name(&self) -> &'static str {
        self.name
    }

    async fn analyze(
        &self,
        _input: MealAnalysisInput,
    ) -> Result<MealAnalysisResult, ProviderError> {
        self.call_count.fetch_add(1, Ordering::SeqCst);
        Err(ProviderError::with_provider_error("Primary API connection failed"))
    }

    async fn analyze_body(
        &self,
        _input: business::domain::body_analysis::BodyAnalysisInput,
    ) -> Result<business::domain::body_analysis::BodyAnalysisResult, ProviderError> {
        self.call_count.fetch_add(1, Ordering::SeqCst);
        Err(ProviderError::with_provider_error("Primary API connection failed"))
    }
}

struct MockTimeoutProvider {
    name: &'static str,
}

#[async_trait::async_trait]
impl AIProvider for MockTimeoutProvider {
    fn name(&self) -> &'static str {
        self.name
    }

    async fn analyze(
        &self,
        _input: MealAnalysisInput,
    ) -> Result<MealAnalysisResult, ProviderError> {
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        Err(ProviderError::timeout("Timeout exceeded"))
    }

    async fn analyze_body(
        &self,
        _input: business::domain::body_analysis::BodyAnalysisInput,
    ) -> Result<business::domain::body_analysis::BodyAnalysisResult, ProviderError> {
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        Err(ProviderError::timeout("Timeout exceeded"))
    }
}

// ==================== Unit & Contract Tests ====================

#[test]
fn test_prompt_utils_parse_clean_json() {
    let raw = r#"{
        "items": [
            {
                "name": "Omelete de Ervas",
                "estimated_grams": 120.0,
                "calories": 180.0,
                "protein_g": 14.0,
                "carbs_g": 1.5,
                "fat_g": 12.0,
                "confidence": "high"
            }
        ],
        "totals": {
            "calories": 180.0,
            "protein_g": 14.0,
            "carbs_g": 1.5,
            "fat_g": 12.0
        }
    }"#;

    let res = parse_analysis_json(raw).expect("Should parse clean JSON");
    assert_eq!(res.items.len(), 1);
    assert_eq!(res.items[0].name, "Omelete de Ervas");
    assert_eq!(res.totals.calories, 180.0);
}

#[test]
fn test_prompt_utils_parse_markdown_fenced_json() {
    let raw = r#"```json
{
    "items": [
        {
            "name": "Salada Caprese",
            "estimated_grams": 200.0,
            "calories": 250.0,
            "protein_g": 12.0,
            "carbs_g": 5.0,
            "fat_g": 18.0
        }
    ],
    "totals": {
        "calories": 250.0,
        "protein_g": 12.0,
        "carbs_g": 5.0,
        "fat_g": 18.0
    }
}
```"#;

    let res = parse_analysis_json(raw).expect("Should parse markdown fenced JSON");
    assert_eq!(res.items[0].name, "Salada Caprese");
}

#[test]
fn test_image_processor_rejects_empty_bytes() {
    let res = ImageProcessor::process(&[]);
    assert!(res.is_err());
    assert_eq!(res.unwrap_err().kind, ProviderErrorKind::InvalidImage);
}

#[test]
fn test_quota_manager_env_limit_resolution() {
    let std_env_var = "MEAL_ANALYSIS_DAILY_QUOTA";
    std::env::set_var(std_env_var, "42");
    assert_eq!(QuotaManager::env_limit(), 42);

    std::env::remove_var(std_env_var);
    assert_eq!(QuotaManager::env_limit(), 50);
}

#[tokio::test]
async fn test_provider_router_primary_success() {
    let primary = Arc::new(MockSuccessProvider { name: "mock-primary" });
    let router = ProviderRouter::with_providers(primary, None, 1000);

    let input = MealAnalysisInput {
        image_bytes: vec![1, 2, 3],
        content_type: "image/jpeg".to_string(),
        meal_type_hint: Some("lunch".to_string()),
        daily_meal_id: 1,
        meal_date: chrono::Utc::now().date_naive(),
    };

    let res = router.analyze(input).await.expect("Primary should succeed");
    assert_eq!(res.items[0].name, "grilled chicken breast");
}

#[tokio::test]
async fn test_provider_router_fallback_success_when_primary_fails() {
    let call_count = Arc::new(AtomicU32::new(0));
    let primary = Arc::new(MockFailingProvider {
        name: "mock-failing-primary",
        call_count: call_count.clone(),
    });
    let fallback = Arc::new(MockSuccessProvider {
        name: "mock-fallback",
    });

    let router = ProviderRouter::with_providers(primary, Some(fallback), 1000);

    let input = MealAnalysisInput {
        image_bytes: vec![1, 2, 3],
        content_type: "image/jpeg".to_string(),
        meal_type_hint: None,
        daily_meal_id: 1,
        meal_date: chrono::Utc::now().date_naive(),
    };

    let res = router.analyze(input).await.expect("Fallback should succeed");
    assert_eq!(res.items[0].name, "grilled chicken breast");
    assert_eq!(call_count.load(Ordering::SeqCst), 2); // Primary was tried twice (initial + retry)
}

#[tokio::test]
async fn test_provider_router_timeout_routes_to_fallback() {
    let primary = Arc::new(MockTimeoutProvider {
        name: "mock-timeout-primary",
    });
    let fallback = Arc::new(MockSuccessProvider {
        name: "mock-fallback",
    });

    let router = ProviderRouter::with_providers(primary, Some(fallback), 50); // 50ms short timeout

    let input = MealAnalysisInput {
        image_bytes: vec![1, 2, 3],
        content_type: "image/jpeg".to_string(),
        meal_type_hint: None,
        daily_meal_id: 1,
        meal_date: chrono::Utc::now().date_naive(),
    };

    let res = router.analyze(input).await.expect("Fallback should succeed after primary timeout");
    assert_eq!(res.items[0].name, "grilled chicken breast");
}
