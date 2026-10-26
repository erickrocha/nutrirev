use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::clinical_conditions::{ClinicalConditions, ClinicalConditionsEntityMapper};
use entity::clinical_conditions_entity;
use entity::prelude::ClinicalConditionsEntity as ClinicalConditionsQuery;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct ClinicalConditionsGateway {
    db: DbConn,
}

impl ClinicalConditionsGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }
}

#[async_trait]
impl Gateway<ClinicalConditions, clinical_conditions_entity::Model, clinical_conditions_entity::ActiveModel> for ClinicalConditionsGateway {
    async fn persist(&self, entity: ClinicalConditions) -> Result<clinical_conditions_entity::ActiveModel, DbErr> {
        let active_model = ClinicalConditionsEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            ClinicalConditionsQuery::delete_many().filter(clinical_conditions_entity::Column::Id.eq(id)),
            clinical_conditions_entity::Column::TenantId,
        )
            .exec(&self.db)
            .await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<clinical_conditions_entity::Model>, DbErr> {
        tenant_select(ClinicalConditionsQuery::find(), clinical_conditions_entity::Column::TenantId)
            .filter(clinical_conditions_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<clinical_conditions_entity::Model>, DbErr> {
        tenant_select(ClinicalConditionsQuery::find(), clinical_conditions_entity::Column::TenantId)
            .filter(clinical_conditions_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<clinical_conditions_entity::Model>, DbErr> {
        tenant_select(ClinicalConditionsQuery::find(), clinical_conditions_entity::Column::TenantId)
            .all(&self.db)
            .await
    }
}
