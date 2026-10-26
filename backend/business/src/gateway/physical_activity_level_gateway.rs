use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::physical_activity_level::{PhysicalActivityLevel, PhysicalActivityLevelEntityMapper};
use entity::physical_activity_level_entity;
use entity::prelude::PhysicalActivityLevelEntity as PhysicalActivityLevelQuery;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct PhysicalActivityLevelGateway {
    db: DbConn,
}

impl PhysicalActivityLevelGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }
}

#[async_trait]
impl Gateway<PhysicalActivityLevel, physical_activity_level_entity::Model, physical_activity_level_entity::ActiveModel> for PhysicalActivityLevelGateway {
    async fn persist(&self, entity: PhysicalActivityLevel) -> Result<physical_activity_level_entity::ActiveModel, DbErr> {
        let active_model = PhysicalActivityLevelEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            PhysicalActivityLevelQuery::delete_many().filter(physical_activity_level_entity::Column::Id.eq(id)),
            physical_activity_level_entity::Column::TenantId,
        )
            .exec(&self.db)
            .await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<physical_activity_level_entity::Model>, DbErr> {
        tenant_select(PhysicalActivityLevelQuery::find(), physical_activity_level_entity::Column::TenantId)
            .filter(physical_activity_level_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<physical_activity_level_entity::Model>, DbErr> {
        tenant_select(PhysicalActivityLevelQuery::find(), physical_activity_level_entity::Column::TenantId)
            .filter(physical_activity_level_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<physical_activity_level_entity::Model>, DbErr> {
        tenant_select(PhysicalActivityLevelQuery::find(), physical_activity_level_entity::Column::TenantId)
            .all(&self.db)
            .await
    }
}
