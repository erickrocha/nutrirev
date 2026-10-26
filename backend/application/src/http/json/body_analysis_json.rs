use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BodyFatEstimateJson {
    pub estimated_percentage: f64,
    pub category: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MuscleMassAnalysisJson {
    pub development_level: String,
    pub key_strengths: Vec<String>,
    pub areas_for_growth: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BodyMetricsEstimateJson {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimated_bmi: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub somatotype: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub waist_to_hip_ratio_category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PostureAndSymmetryJson {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub posture_observations: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub symmetry_notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BodyRecommendationsJson {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nutrition_tip: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub training_focus: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BodyMeasurementsJson {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub neck_cm: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub waist_cm: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hip_cm: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BodyAnalysisResponseV1 {
    pub schema_version: String,
    pub provider: String,
    pub analysis_id: String,
    pub status: String,
    pub body_fat: BodyFatEstimateJson,
    pub muscle_mass: MuscleMassAnalysisJson,
    pub body_metrics: BodyMetricsEstimateJson,
    pub measurements: BodyMeasurementsJson,
    pub posture_and_symmetry: PostureAndSymmetryJson,
    pub recommendations: BodyRecommendationsJson,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BodyAnalysisStatusJson {
    pub analysis_id: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BodyAnalysisErrorJson {
    pub error_code: String,
    pub message: String,
    pub request_id: String,
}
