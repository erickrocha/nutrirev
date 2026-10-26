use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct BodyAnalysisInput {
    pub image_bytes: Vec<u8>,
    pub content_type: String,
    pub gender_hint: Option<String>,
    pub goal_hint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BodyFatEstimate {
    pub estimated_percentage: f64,
    pub category: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MuscleMassAnalysis {
    pub development_level: String,
    #[serde(default)]
    pub key_strengths: Vec<String>,
    #[serde(default)]
    pub areas_for_growth: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BodyMetricsEstimate {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimated_bmi: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub somatotype: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub waist_to_hip_ratio_category: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct BodyMeasurements {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub neck_cm: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub waist_cm: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hip_cm: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PostureAndSymmetry {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub posture_observations: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub symmetry_notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BodyRecommendations {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nutrition_tip: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub training_focus: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BodyAnalysisResult {
    pub body_fat: BodyFatEstimate,
    pub muscle_mass: MuscleMassAnalysis,
    pub body_metrics: BodyMetricsEstimate,
    #[serde(default)]
    pub measurements: BodyMeasurements,
    pub posture_and_symmetry: PostureAndSymmetry,
    pub recommendations: BodyRecommendations,
    #[serde(skip_serializing)]
    pub raw_provider_meta: Option<serde_json::Value>,
}
