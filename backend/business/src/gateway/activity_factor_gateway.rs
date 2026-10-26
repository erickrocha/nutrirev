use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::activity_factor::{ActivityFactor, ActivityFactorEntityMapper};
use entity::activity_factor_entity;
use entity::prelude::ActivityFactorEntity as ActivityFactorQuery;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct ActivityFactorGateway {
    db: DbConn,
}

impl ActivityFactorGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }
}

#[async_trait]
impl Gateway<ActivityFactor, activity_factor_entity::Model, activity_factor_entity::ActiveModel> for ActivityFactorGateway {
    async fn persist(&self, entity: ActivityFactor) -> Result<activity_factor_entity::ActiveModel, DbErr> {
        let active_model = ActivityFactorEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            ActivityFactorQuery::delete_many().filter(activity_factor_entity::Column::Id.eq(id)),
            activity_factor_entity::Column::TenantId,
        )
            .exec(&self.db)
            .await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<activity_factor_entity::Model>, DbErr> {
        tenant_select(ActivityFactorQuery::find(), activity_factor_entity::Column::TenantId)
            .filter(activity_factor_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<activity_factor_entity::Model>, DbErr> {
        tenant_select(ActivityFactorQuery::find(), activity_factor_entity::Column::TenantId)
            .filter(activity_factor_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<activity_factor_entity::Model>, DbErr> {
        tenant_select(ActivityFactorQuery::find(), activity_factor_entity::Column::TenantId)
            .all(&self.db)
            .await
    }
}
