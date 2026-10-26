use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::bowel_function::{BowelFunction, BowelFunctionEntityMapper};
use entity::bowel_function_entity;
use entity::prelude::BowelFunctionEntity as BowelFunctionQuery;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct BowelFunctionGateway {
    db: DbConn,
}

impl BowelFunctionGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }
}

#[async_trait]
impl Gateway<BowelFunction, bowel_function_entity::Model, bowel_function_entity::ActiveModel> for BowelFunctionGateway {
    async fn persist(&self, entity: BowelFunction) -> Result<bowel_function_entity::ActiveModel, DbErr> {
        let active_model = BowelFunctionEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            BowelFunctionQuery::delete_many().filter(bowel_function_entity::Column::Id.eq(id)),
            bowel_function_entity::Column::TenantId,
        )
            .exec(&self.db)
            .await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<bowel_function_entity::Model>, DbErr> {
        tenant_select(BowelFunctionQuery::find(), bowel_function_entity::Column::TenantId)
            .filter(bowel_function_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<bowel_function_entity::Model>, DbErr> {
        tenant_select(BowelFunctionQuery::find(), bowel_function_entity::Column::TenantId)
            .filter(bowel_function_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<bowel_function_entity::Model>, DbErr> {
        tenant_select(BowelFunctionQuery::find(), bowel_function_entity::Column::TenantId)
            .all(&self.db)
            .await
    }
}
