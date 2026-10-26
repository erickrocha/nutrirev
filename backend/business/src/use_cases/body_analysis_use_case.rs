use crate::domain::ai_provider::ProviderError;
use crate::domain::body_analysis::BodyAnalysisInput;
use crate::sea_orm::DatabaseConnection;
use crate::use_cases::ai::analysis_job_use_case::AnalysisJobUseCase;
use crate::use_cases::ai::concurrency::AI_ANALYSIS_SEMAPHORE;
use crate::use_cases::ai::image_processor::ImageProcessor;
use crate::use_cases::ai::provider_router::ProviderRouter;
use crate::use_cases::ai::quota_manager::QuotaManager;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct BodyAnalysisUseCase {
    quota_manager: QuotaManager,
    router: Arc<ProviderRouter>,
}

impl Default for BodyAnalysisUseCase {
    fn default() -> Self {
        Self::new()
    }
}

impl BodyAnalysisUseCase {
    pub fn new() -> Self {
        Self {
            quota_manager: QuotaManager::new(),
            router: Arc::new(ProviderRouter::new()),
        }
    }

    pub fn with_router_and_quota(router: ProviderRouter, quota_manager: QuotaManager) -> Self {
        Self {
            quota_manager,
            router: Arc::new(router),
        }
    }

    /// Enforces quota and preprocesses the uploaded image. Rejects invalid/over-quota
    /// requests immediately.
    pub async fn prepare(
        &self,
        db: &DatabaseConnection,
        user_id: i32,
        raw_image_bytes: &[u8],
        gender_hint: Option<String>,
        goal_hint: Option<String>,
    ) -> Result<BodyAnalysisInput, ProviderError> {
        self.quota_manager.check_and_increment(db, user_id).await?;
        let (image_bytes, content_type) = ImageProcessor::process(raw_image_bytes)?;
        Ok(BodyAnalysisInput {
            image_bytes,
            content_type,
            gender_hint,
            goal_hint,
        })
    }

    /// Runs the provider call in the background and writes the outcome back onto
    /// the `analysis_job` row, so the caller doesn't have to block on it.
    pub fn spawn_analysis(&self, db: Arc<DatabaseConnection>, job_uuid: Uuid, input: BodyAnalysisInput) {
        let router = Arc::clone(&self.router);

        tokio::spawn(async move {
            let _permit = AI_ANALYSIS_SEMAPHORE.acquire().await;
            let _ = AnalysisJobUseCase::mark_processing(&db, job_uuid).await;

            let start_time = std::time::Instant::now();
            let result = router.analyze_body(input).await;
            let elapsed = start_time.elapsed();

            match result {
                Ok(res) => {
                    log::info!(
                        "Body composition analysis completed in {:?}. Body fat: {}%, Category: {}",
                        elapsed,
                        res.body_fat.estimated_percentage,
                        res.body_fat.category
                    );
                    match serde_json::to_string(&res) {
                        Ok(json) => {
                            let _ = AnalysisJobUseCase::mark_completed(&db, job_uuid, json).await;
                        }
                        Err(e) => {
                            log::error!("Failed to serialize body analysis result: {}", e);
                            let _ = AnalysisJobUseCase::mark_failed(
                                &db,
                                job_uuid,
                                "PARSE_FAILURE",
                                &format!("Failed to serialize analysis result: {}", e),
                            )
                            .await;
                        }
                    }
                }
                Err(err) => {
                    log::error!("Body analysis failed after {:?}. Error: {:?}", elapsed, err);
                    let _ =
                        AnalysisJobUseCase::mark_failed(&db, job_uuid, err.kind.as_code(), &err.message).await;
                }
            }
        });
    }
}
