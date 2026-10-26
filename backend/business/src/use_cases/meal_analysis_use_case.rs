use crate::commons::gateway::tenant_select;
use crate::domain::ai_provider::{MealAnalysisInput, ProviderError, ProviderErrorKind};
use crate::sea_orm::DatabaseConnection;
use crate::use_cases::ai::analysis_job_use_case::AnalysisJobUseCase;
use crate::use_cases::ai::concurrency::AI_ANALYSIS_SEMAPHORE;
use crate::use_cases::ai::image_processor::ImageProcessor;
use crate::use_cases::ai::meal_log_use_case::{MealLogUseCase, SaveMealLogError};
use crate::use_cases::ai::provider_router::ProviderRouter;
use crate::use_cases::ai::quota_manager::QuotaManager;
use entity::daily_meal_entity;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct MealAnalysisUseCase {
    quota_manager: QuotaManager,
    router: Arc<ProviderRouter>,
}

impl Default for MealAnalysisUseCase {
    fn default() -> Self {
        Self::new()
    }
}

impl MealAnalysisUseCase {
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

    /// Enforces quota, validates the selected daily_meal slot, and preprocesses
    /// the uploaded image. Runs in the controller so invalid/over-quota/invalid
    /// requests are rejected immediately, before a background job is created.
    pub async fn prepare(
        &self,
        db: &DatabaseConnection,
        user_id: i32,
        raw_image_bytes: &[u8],
        meal_type_hint: Option<String>,
        daily_meal_id: i32,
        meal_date: chrono::NaiveDate,
    ) -> Result<MealAnalysisInput, ProviderError> {
        self.quota_manager.check_and_increment(db, user_id).await?;

        let daily_meal = tenant_select(
            daily_meal_entity::Entity::find(),
            daily_meal_entity::Column::TenantId,
        )
            .filter(daily_meal_entity::Column::Id.eq(daily_meal_id))
            .one(db)
            .await
            .map_err(|e| ProviderError::new(ProviderErrorKind::ProviderError, format!("Failed to validate daily_meal_id: {}", e)))?;
        if daily_meal.is_none() {
            return Err(ProviderError::new(ProviderErrorKind::InvalidDailyMeal, "daily_meal_id does not exist."));
        }

        let (image_bytes, content_type) = ImageProcessor::process(raw_image_bytes)?;
        Ok(MealAnalysisInput {
            image_bytes,
            content_type,
            meal_type_hint,
            daily_meal_id,
            meal_date,
        })
    }

    /// Runs the provider call in the background and writes the outcome back onto
    /// the `analysis_job` row, so the caller doesn't have to block on it. Once the
    /// analysis completes successfully, automatically feeds `meal_log` using the
    /// daily_meal slot and date the client selected up front.
    pub fn spawn_analysis(&self, db: Arc<DatabaseConnection>, job_uuid: Uuid, user_id: i32, input: MealAnalysisInput) {
        let router = Arc::clone(&self.router);
        let daily_meal_id = input.daily_meal_id;
        let meal_date = input.meal_date;
        let image_bytes = input.image_bytes.clone();
        let content_type = input.content_type.clone();

        tokio::spawn(async move {
            let _permit = AI_ANALYSIS_SEMAPHORE.acquire().await;
            let _ = AnalysisJobUseCase::mark_processing(&db, job_uuid).await;

            let start_time = std::time::Instant::now();
            let result = router.analyze(input).await;
            let elapsed = start_time.elapsed();

            match result {
                Ok(res) => {
                    log::info!(
                        "Meal analysis completed in {:?}. Items detected: {}, total calories: {}",
                        elapsed,
                        res.items.len(),
                        res.totals.calories
                    );
                    match serde_json::to_string(&res) {
                        Ok(json) => {
                            if let Err(e) = AnalysisJobUseCase::mark_completed(&db, job_uuid, json).await {
                                log::error!("Failed to mark meal analysis job completed: {}", e);
                                return;
                            }
                            if let Err(err) = MealLogUseCase::save(
                                &db,
                                user_id,
                                job_uuid,
                                daily_meal_id,
                                meal_date,
                                Some(image_bytes),
                                Some(content_type),
                            )
                            .await
                            {
                                let (code, message) = meal_log_error_to_code(err);
                                log::error!("Failed to auto-save meal_log for job {}: {}", job_uuid, message);
                                let _ = AnalysisJobUseCase::mark_failed(&db, job_uuid, code, &message).await;
                            }
                        }
                        Err(e) => {
                            log::error!("Failed to serialize meal analysis result: {}", e);
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
                    log::error!("Meal analysis failed after {:?}. Error: {:?}", elapsed, err);
                    let _ =
                        AnalysisJobUseCase::mark_failed(&db, job_uuid, err.kind.as_code(), &err.message).await;
                }
            }
        });
    }
}

fn meal_log_error_to_code(err: SaveMealLogError) -> (&'static str, String) {
    match err {
        SaveMealLogError::AnalysisNotFound => ("ANALYSIS_NOT_FOUND", "Analysis job not found.".to_string()),
        SaveMealLogError::AnalysisNotCompleted => {
            ("ANALYSIS_NOT_COMPLETED", "Analysis is not completed yet.".to_string())
        }
        SaveMealLogError::AlreadyLogged => ("ALREADY_LOGGED", "This analysis has already been logged.".to_string()),
        SaveMealLogError::InvalidDailyMeal => ("INVALID_DAILY_MEAL", "daily_meal_id does not exist.".to_string()),
        SaveMealLogError::Db(e) => ("INTERNAL_ERROR", format!("Failed to save meal to your log: {}", e)),
    }
}
