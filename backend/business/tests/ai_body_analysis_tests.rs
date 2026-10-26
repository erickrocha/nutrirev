use business::domain::ai_provider::{AIProvider, ProviderError};
use business::domain::body_analysis::{
    BodyAnalysisInput, BodyAnalysisResult, BodyFatEstimate, BodyMeasurements, BodyMetricsEstimate,
    BodyRecommendations, MuscleMassAnalysis, PostureAndSymmetry,
};
use business::use_cases::ai::body_prompt_utils::{
    build_body_system_prompt, build_body_user_message, parse_body_analysis_json,
};
use business::use_cases::ai::provider_router::ProviderRouter;
use std::sync::Arc;

struct MockBodySuccessProvider {
    name: &'static str,
}

#[async_trait::async_trait]
impl AIProvider for MockBodySuccessProvider {
    fn name(&self) -> &'static str {
        self.name
    }

    async fn analyze(
        &self,
        _input: business::domain::ai_provider::MealAnalysisInput,
    ) -> Result<business::domain::ai_provider::MealAnalysisResult, ProviderError> {
        Err(ProviderError::with_provider_error("Not implemented for meal"))
    }

    async fn analyze_body(&self, _input: BodyAnalysisInput) -> Result<BodyAnalysisResult, ProviderError> {
        Ok(BodyAnalysisResult {
            body_fat: BodyFatEstimate {
                estimated_percentage: 16.5,
                category: "Athletic".to_string(),
                confidence: Some("high".to_string()),
            },
            muscle_mass: MuscleMassAnalysis {
                development_level: "High Definition".to_string(),
                key_strengths: vec!["Abdominal definition".to_string()],
                areas_for_growth: vec!["Calf hypertrophy".to_string()],
            },
            body_metrics: BodyMetricsEstimate {
                estimated_bmi: Some(22.8),
                somatotype: Some("Mesomorph".to_string()),
                waist_to_hip_ratio_category: Some("Healthy".to_string()),
            },
            measurements: BodyMeasurements {
                neck_cm: Some(38.0),
                waist_cm: Some(80.0),
                hip_cm: Some(94.0),
                confidence: Some("medium".to_string()),
            },
            posture_and_symmetry: PostureAndSymmetry {
                posture_observations: Some("Good posture".to_string()),
                symmetry_notes: Some("Symmetrical shoulders".to_string()),
            },
            recommendations: BodyRecommendations {
                nutrition_tip: Some("Slight hypercaloric diet".to_string()),
                training_focus: Some("Lower body volume".to_string()),
            },
            raw_provider_meta: None,
        })
    }
}

#[test]
fn test_body_system_prompt_not_empty() {
    let prompt = build_body_system_prompt();
    assert!(prompt.contains("clinical anthropometrist"));
    assert!(prompt.contains("body_fat"));
}

#[test]
fn test_body_user_message_with_hints() {
    let msg = build_body_user_message(Some("Masculino"), Some("Hipertrofia"));
    assert!(msg.contains("Masculino"));
    assert!(msg.contains("Hipertrofia"));
}

#[test]
fn test_parse_body_analysis_json_clean() {
    let raw = r#"{
        "body_fat": {
            "estimated_percentage": 15.2,
            "category": "Fitness",
            "confidence": "high"
        },
        "muscle_mass": {
            "development_level": "Good definition",
            "key_strengths": ["Shoulders"],
            "areas_for_growth": ["Lower chest"]
        },
        "body_metrics": {
            "estimated_bmi": 23.1,
            "somatotype": "Mesomorph",
            "waist_to_hip_ratio_category": "Normal"
        },
        "posture_and_symmetry": {
            "posture_observations": "Spine aligned",
            "symmetry_notes": "Left/Right balance"
        },
        "recommendations": {
            "nutrition_tip": "High protein intake",
            "training_focus": "Chest hypertrophy"
        }
    }"#;

    let parsed = parse_body_analysis_json(raw).expect("Should parse clean JSON");
    assert_eq!(parsed.body_fat.estimated_percentage, 15.2);
    assert_eq!(parsed.body_fat.category, "Fitness");
    assert_eq!(parsed.muscle_mass.key_strengths, vec!["Shoulders"]);
}

#[tokio::test]
async fn test_provider_router_body_analysis_primary_success() {
    let primary = Arc::new(MockBodySuccessProvider { name: "mock_primary" });
    let router = ProviderRouter::with_providers(primary, None, 1000);

    let input = BodyAnalysisInput {
        image_bytes: vec![1, 2, 3],
        content_type: "image/jpeg".to_string(),
        gender_hint: Some("Masculino".to_string()),
        goal_hint: None,
    };

    let result = router.analyze_body(input).await.expect("Should succeed");
    assert_eq!(result.body_fat.estimated_percentage, 16.5);
    assert_eq!(result.body_fat.category, "Athletic");
}
