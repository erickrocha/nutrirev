use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::objective::{Objective, ObjectiveEntityMapper};
use entity::objective_entity;
use entity::prelude::ObjectiveEntity as ObjectiveQuery;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct ObjectiveGateway {
    db: DbConn,
}

impl ObjectiveGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }
}

#[async_trait]
impl Gateway<Objective, objective_entity::Model, objective_entity::ActiveModel> for ObjectiveGateway {
    async fn persist(&self, entity: Objective) -> Result<objective_entity::ActiveModel, DbErr> {
        let active_model = ObjectiveEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            ObjectiveQuery::delete_many().filter(objective_entity::Column::Id.eq(id)),
            objective_entity::Column::TenantId,
        )
            .exec(&self.db)
            .await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<objective_entity::Model>, DbErr> {
        tenant_select(ObjectiveQuery::find(), objective_entity::Column::TenantId)
            .filter(objective_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<objective_entity::Model>, DbErr> {
        tenant_select(ObjectiveQuery::find(), objective_entity::Column::TenantId)
            .filter(objective_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<objective_entity::Model>, DbErr> {
        tenant_select(ObjectiveQuery::find(), objective_entity::Column::TenantId)
            .all(&self.db)
            .await
    }
}
