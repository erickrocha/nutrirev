use entity::analysis_job_entity::{self, ActiveModel, Model};
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, EntityTrait, NotSet, QueryFilter, Set};
use uuid::Uuid;

pub const KIND_MEAL: &str = "meal";
pub const KIND_BODY: &str = "body";

pub const STATUS_PENDING: &str = "pending";
pub const STATUS_PROCESSING: &str = "processing";
pub const STATUS_COMPLETED: &str = "completed";
pub const STATUS_FAILED: &str = "failed";

pub struct AnalysisJobUseCase;

impl AnalysisJobUseCase {
    pub async fn create_pending(db: &DbConn, customer_id: i32, kind: &str) -> Result<Uuid, DbErr> {
        let active = ActiveModel {
            id: NotSet,
            job_uuid: NotSet,
            customer_id: Set(customer_id),
            kind: Set(kind.to_string()),
            status: Set(STATUS_PENDING.to_string()),
            result_json: Set(None),
            error_code: Set(None),
            error_message: Set(None),
            created_at: NotSet,
            updated_at: NotSet,
        };

        let saved = active.insert(db).await?;
        Uuid::from_slice(&saved.job_uuid).map_err(|e| DbErr::Custom(format!("Invalid job_uuid stored: {}", e)))
    }

    pub async fn mark_processing(db: &DbConn, job_uuid: Uuid) -> Result<(), DbErr> {
        Self::update_status(db, job_uuid, STATUS_PROCESSING, None, None, None).await
    }

    pub async fn mark_completed(db: &DbConn, job_uuid: Uuid, result_json: String) -> Result<(), DbErr> {
        Self::update_status(db, job_uuid, STATUS_COMPLETED, Some(result_json), None, None).await
    }

    pub async fn mark_failed(db: &DbConn, job_uuid: Uuid, error_code: &str, error_message: &str) -> Result<(), DbErr> {
        Self::update_status(
            db,
            job_uuid,
            STATUS_FAILED,
            None,
            Some(error_code.to_string()),
            Some(error_message.to_string()),
        )
        .await
    }

    pub async fn find_by_uuid(db: &DbConn, job_uuid: Uuid, customer_id: i32) -> Result<Option<Model>, DbErr> {
        analysis_job_entity::Entity::find()
            .filter(analysis_job_entity::Column::JobUuid.eq(job_uuid.as_bytes().to_vec()))
            .filter(analysis_job_entity::Column::CustomerId.eq(customer_id))
            .one(db)
            .await
    }

    async fn update_status(
        db: &DbConn,
        job_uuid: Uuid,
        status: &str,
        result_json: Option<String>,
        error_code: Option<String>,
        error_message: Option<String>,
    ) -> Result<(), DbErr> {
        let existing = analysis_job_entity::Entity::find()
            .filter(analysis_job_entity::Column::JobUuid.eq(job_uuid.as_bytes().to_vec()))
            .one(db)
            .await?;

        let Some(model) = existing else {
            return Err(DbErr::RecordNotFound(format!("analysis_job with uuid {} not found", job_uuid)));
        };

        let mut active: ActiveModel = model.into();
        active.status = Set(status.to_string());
        active.result_json = Set(result_json);
        active.error_code = Set(error_code);
        active.error_message = Set(error_message);
        active.update(db).await?;
        Ok(())
    }
}
