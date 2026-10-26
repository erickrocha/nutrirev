use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::cycle::{Cycle, CycleEntityMapper};
use entity::cycle_entity;
use entity::prelude::CycleEntity as CycleQuery;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct CycleGateway {
    db: DbConn,
}

impl CycleGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }

    pub fn db(&self) -> &DbConn {
        &self.db
    }
}

#[async_trait]
impl Gateway<Cycle, cycle_entity::Model, cycle_entity::ActiveModel> for CycleGateway {
    async fn persist(&self, entity: Cycle) -> Result<cycle_entity::ActiveModel, DbErr> {
        let active_model = CycleEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            CycleQuery::delete_many().filter(cycle_entity::Column::Id.eq(id)),
            cycle_entity::Column::TenantId,
        ).exec(&self.db).await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<cycle_entity::Model>, DbErr> {
        tenant_select(CycleQuery::find(), cycle_entity::Column::TenantId)
            .filter(cycle_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<cycle_entity::Model>, DbErr> {
        tenant_select(CycleQuery::find(), cycle_entity::Column::TenantId)
            .filter(cycle_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<cycle_entity::Model>, DbErr> {
        tenant_select(CycleQuery::find(), cycle_entity::Column::TenantId).all(&self.db).await
    }
}
