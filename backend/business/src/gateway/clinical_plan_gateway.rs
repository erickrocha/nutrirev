use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::clinical_plan::{ClinicalPlan, ClinicalPlanEntityMapper};
use entity::clinical_plan_entity;
use entity::prelude::ClinicalPlanEntity as ClinicalPlanQuery;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct ClinicalPlanGateway {
    db: DbConn,
}

impl ClinicalPlanGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }
}

#[async_trait]
impl Gateway<ClinicalPlan, clinical_plan_entity::Model, clinical_plan_entity::ActiveModel> for ClinicalPlanGateway {
    async fn persist(&self, entity: ClinicalPlan) -> Result<clinical_plan_entity::ActiveModel, DbErr> {
        let active_model = ClinicalPlanEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            ClinicalPlanQuery::delete_many().filter(clinical_plan_entity::Column::Id.eq(id)),
            clinical_plan_entity::Column::TenantId,
        )
            .exec(&self.db)
            .await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<clinical_plan_entity::Model>, DbErr> {
        tenant_select(ClinicalPlanQuery::find(), clinical_plan_entity::Column::TenantId)
            .filter(clinical_plan_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<clinical_plan_entity::Model>, DbErr> {
        tenant_select(ClinicalPlanQuery::find(), clinical_plan_entity::Column::TenantId)
            .filter(clinical_plan_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<clinical_plan_entity::Model>, DbErr> {
        tenant_select(ClinicalPlanQuery::find(), clinical_plan_entity::Column::TenantId)
            .all(&self.db)
            .await
    }
}
