use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::daily_meal::{DailyMeal, DailyMealEntityMapper};
use entity::daily_meal_entity;
use entity::prelude::DailyMealEntity as DailyMealQuery;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct DailyMealGateway {
    db: DbConn,
}

impl DailyMealGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }
}

#[async_trait]
impl Gateway<DailyMeal, daily_meal_entity::Model, daily_meal_entity::ActiveModel> for DailyMealGateway {
    async fn persist(&self, entity: DailyMeal) -> Result<daily_meal_entity::ActiveModel, DbErr> {
        let active_model = DailyMealEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            DailyMealQuery::delete_many().filter(daily_meal_entity::Column::Id.eq(id)),
            daily_meal_entity::Column::TenantId,
        )
            .exec(&self.db)
            .await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<daily_meal_entity::Model>, DbErr> {
        tenant_select(DailyMealQuery::find(), daily_meal_entity::Column::TenantId)
            .filter(daily_meal_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<daily_meal_entity::Model>, DbErr> {
        tenant_select(DailyMealQuery::find(), daily_meal_entity::Column::TenantId)
            .filter(daily_meal_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<daily_meal_entity::Model>, DbErr> {
        tenant_select(DailyMealQuery::find(), daily_meal_entity::Column::TenantId)
            .all(&self.db)
            .await
    }
}
