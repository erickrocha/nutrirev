use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::prepare_meal::{PrepareMeal, PrepareMealEntityMapper};
use entity::prelude::PrepareMealEntity as PrepareMealQuery;
use entity::prepare_meal_entity;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct PrepareMealGateway {
    db: DbConn,
}

impl PrepareMealGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }
}

#[async_trait]
impl Gateway<PrepareMeal, prepare_meal_entity::Model, prepare_meal_entity::ActiveModel> for PrepareMealGateway {
    async fn persist(&self, entity: PrepareMeal) -> Result<prepare_meal_entity::ActiveModel, DbErr> {
        let active_model = PrepareMealEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            PrepareMealQuery::delete_many().filter(prepare_meal_entity::Column::Id.eq(id)),
            prepare_meal_entity::Column::TenantId,
        )
            .exec(&self.db)
            .await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<prepare_meal_entity::Model>, DbErr> {
        tenant_select(PrepareMealQuery::find(), prepare_meal_entity::Column::TenantId)
            .filter(prepare_meal_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<prepare_meal_entity::Model>, DbErr> {
        tenant_select(PrepareMealQuery::find(), prepare_meal_entity::Column::TenantId)
            .filter(prepare_meal_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<prepare_meal_entity::Model>, DbErr> {
        tenant_select(PrepareMealQuery::find(), prepare_meal_entity::Column::TenantId)
            .all(&self.db)
            .await
    }
}
