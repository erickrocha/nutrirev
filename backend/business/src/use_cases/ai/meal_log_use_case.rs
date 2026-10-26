use crate::commons::gateway::tenant_select;
use crate::domain::ai_provider::MealAnalysisResult;
use crate::domain::enums::AnalysisType;
use crate::use_cases::ai::analysis_job_use_case::{AnalysisJobUseCase, STATUS_COMPLETED};
use crate::use_cases::ai::gamification_use_case::GamificationUseCase;
use crate::use_cases::image_storage_use_case::{ImageStorageUseCase, StorageMode};
use chrono::NaiveDate;
use entity::daily_meal_entity;
use entity::meal_log_entity::{self, ActiveModel, Model};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbConn, DbErr, EntityTrait, NotSet, QueryFilter, Set,
};
use uuid::Uuid;

pub enum SaveMealLogError {
    AnalysisNotFound,
    AnalysisNotCompleted,
    AlreadyLogged,
    InvalidDailyMeal,
    Db(DbErr),
}

impl From<DbErr> for SaveMealLogError {
    fn from(e: DbErr) -> Self {
        SaveMealLogError::Db(e)
    }
}

pub struct MealLogUseCase;

pub struct DailyNutritionSummary {
    pub calories: f64,
    pub protein_g: f64,
    pub carbs_g: f64,
    pub fat_g: f64,
    pub meals_logged: u64,
}

impl MealLogUseCase {
    pub async fn daily_summary(
        db: &DbConn,
        customer_id: i32,
        meal_date: NaiveDate,
    ) -> Result<DailyNutritionSummary, DbErr> {
        let logs = meal_log_entity::Entity::find()
            .filter(meal_log_entity::Column::CustomerId.eq(customer_id))
            .filter(meal_log_entity::Column::MealDate.eq(meal_date))
            .all(db)
            .await?;
        Ok(DailyNutritionSummary {
            calories: logs.iter().map(|log| log.calories).sum(),
            protein_g: logs.iter().map(|log| log.protein_g).sum(),
            carbs_g: logs.iter().map(|log| log.carbs_g).sum(),
            fat_g: logs.iter().map(|log| log.fat_g).sum(),
            meals_logged: logs.len() as u64,
        })
    }

    pub async fn save(
        db: &DbConn,
        customer_id: i32,
        job_uuid: Uuid,
        daily_meal_id: i32,
        meal_date: NaiveDate,
        image_bytes: Option<Vec<u8>>,
        content_type: Option<String>,
    ) -> Result<(Model, Option<i32>), SaveMealLogError> {
        let job = AnalysisJobUseCase::find_by_uuid(db, job_uuid, customer_id)
            .await?
            .ok_or(SaveMealLogError::AnalysisNotFound)?;

        if job.status != STATUS_COMPLETED {
            return Err(SaveMealLogError::AnalysisNotCompleted);
        }

        let result_json = job.result_json.clone().unwrap_or_default();
        let result: MealAnalysisResult = serde_json::from_str(&result_json).map_err(|e| {
            SaveMealLogError::Db(DbErr::Custom(format!(
                "Failed to parse stored analysis result: {}",
                e
            )))
        })?;

        let already_logged = meal_log_entity::Entity::find()
            .filter(meal_log_entity::Column::AnalysisJobId.eq(job.id))
            .one(db)
            .await?;
        if already_logged.is_some() {
            return Err(SaveMealLogError::AlreadyLogged);
        }

        let daily_meal = tenant_select(
            daily_meal_entity::Entity::find(),
            daily_meal_entity::Column::TenantId,
        )
            .filter(daily_meal_entity::Column::Id.eq(daily_meal_id))
            .one(db)
            .await?;
        if daily_meal.is_none() {
            return Err(SaveMealLogError::InvalidDailyMeal);
        }

        let items_json = serde_json::to_string(&result.items).ok();

        let (photo, photo_base64) = match (image_bytes, content_type) {
            (Some(bytes), Some(content_type)) => match ImageStorageUseCase::get_meal_log_storage_mode() {
                StorageMode::Base64 => {
                    use base64::Engine;
                    let b64_str = base64::engine::general_purpose::STANDARD.encode(&bytes);
                    let data_url = format!("data:{};base64,{}", content_type, b64_str);
                    (None, Some(data_url.into_bytes()))
                }
                StorageMode::S3 => {
                    let key = ImageStorageUseCase::generate_object_key("meal-log", customer_id, "jpg");
                    match ImageStorageUseCase::upload_object(&key, bytes, &content_type).await {
                        Ok(()) => (Some(key), None),
                        Err(e) => {
                            log::warn!("Failed to upload meal_log photo to S3, saving without a photo: {}", e);
                            (None, None)
                        }
                    }
                }
            },
            _ => (None, None),
        };

        let active = ActiveModel {
            id: NotSet,
            uuid: NotSet,
            customer_id: Set(customer_id),
            daily_meal_id: Set(daily_meal_id),
            analysis_job_id: Set(Some(job.id)),
            analysis_type: Set(AnalysisType::AiAnalyze.to_string()),
            meal_date: Set(meal_date),
            calories: Set(result.totals.calories),
            protein_g: Set(result.totals.protein_g),
            carbs_g: Set(result.totals.carbs_g),
            fat_g: Set(result.totals.fat_g),
            items_json: Set(items_json),
            photo: Set(photo),
            photo_base64: Set(photo_base64),
            created_at: NotSet,
            created_by: NotSet,
            updated_at: NotSet,
            updated_by: NotSet,
        };

        let saved = active.insert(db).await?;

        let points_awarded = GamificationUseCase::award_for_meal_log(
            db,
            customer_id,
            daily_meal_id,
            saved.created_at,
            saved.id,
        )
        .await?;

        Ok((saved, points_awarded))
    }

    pub async fn list_for_date(db: &DbConn, customer_id: i32, meal_date: NaiveDate) -> Result<Vec<Model>, DbErr> {
        meal_log_entity::Entity::find()
            .filter(meal_log_entity::Column::CustomerId.eq(customer_id))
            .filter(meal_log_entity::Column::MealDate.eq(meal_date))
            .all(db)
            .await
    }
}
