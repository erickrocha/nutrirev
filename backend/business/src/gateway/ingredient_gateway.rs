use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::ingredient::{Ingredient, IngredientEntityMapper};
use entity::ingredient_entity;
use entity::prelude::IngredientEntity as IngredientQuery;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct IngredientGateway {
    db: DbConn,
}

impl IngredientGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }

    pub fn db(&self) -> &DbConn {
        &self.db
    }
}

#[async_trait]
impl Gateway<Ingredient, ingredient_entity::Model, ingredient_entity::ActiveModel> for IngredientGateway {
    async fn persist(&self, entity: Ingredient) -> Result<ingredient_entity::ActiveModel, DbErr> {
        let active_model = IngredientEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            IngredientQuery::delete_many().filter(ingredient_entity::Column::Id.eq(id)),
            ingredient_entity::Column::TenantId,
        ).exec(&self.db).await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<ingredient_entity::Model>, DbErr> {
        tenant_select(IngredientQuery::find(), ingredient_entity::Column::TenantId)
            .filter(ingredient_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<ingredient_entity::Model>, DbErr> {
        tenant_select(IngredientQuery::find(), ingredient_entity::Column::TenantId)
            .filter(ingredient_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<ingredient_entity::Model>, DbErr> {
        tenant_select(IngredientQuery::find(), ingredient_entity::Column::TenantId).all(&self.db).await
    }
}
