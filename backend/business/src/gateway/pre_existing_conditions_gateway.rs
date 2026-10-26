use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::pre_existing_conditions::{PreExistingConditions, PreExistingConditionsEntityMapper};
use entity::pre_existing_conditions_entity;
use entity::prelude::PreExistingConditionsEntity as PreExistingConditionsQuery;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct PreExistingConditionsGateway {
    db: DbConn,
}

impl PreExistingConditionsGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }
}

#[async_trait]
impl Gateway<PreExistingConditions, pre_existing_conditions_entity::Model, pre_existing_conditions_entity::ActiveModel> for PreExistingConditionsGateway {
    async fn persist(&self, entity: PreExistingConditions) -> Result<pre_existing_conditions_entity::ActiveModel, DbErr> {
        let active_model = PreExistingConditionsEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            PreExistingConditionsQuery::delete_many().filter(pre_existing_conditions_entity::Column::Id.eq(id)),
            pre_existing_conditions_entity::Column::TenantId,
        )
            .exec(&self.db)
            .await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<pre_existing_conditions_entity::Model>, DbErr> {
        tenant_select(PreExistingConditionsQuery::find(), pre_existing_conditions_entity::Column::TenantId)
            .filter(pre_existing_conditions_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<pre_existing_conditions_entity::Model>, DbErr> {
        tenant_select(PreExistingConditionsQuery::find(), pre_existing_conditions_entity::Column::TenantId)
            .filter(pre_existing_conditions_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<pre_existing_conditions_entity::Model>, DbErr> {
        tenant_select(PreExistingConditionsQuery::find(), pre_existing_conditions_entity::Column::TenantId)
            .all(&self.db)
            .await
    }
}
