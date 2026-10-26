use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::formula::{Formula, FormulaEntityMapper};
use entity::formula_entity;
use entity::prelude::FormulaEntity as FormulaQuery;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct FormulaGateway {
    db: DbConn,
}

impl FormulaGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }
}

#[async_trait]
impl Gateway<Formula, formula_entity::Model, formula_entity::ActiveModel> for FormulaGateway {
    async fn persist(&self, entity: Formula) -> Result<formula_entity::ActiveModel, DbErr> {
        let active_model = FormulaEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            FormulaQuery::delete_many().filter(formula_entity::Column::Id.eq(id)),
            formula_entity::Column::TenantId,
        )
            .exec(&self.db)
            .await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<formula_entity::Model>, DbErr> {
        tenant_select(FormulaQuery::find(), formula_entity::Column::TenantId)
            .filter(formula_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<formula_entity::Model>, DbErr> {
        tenant_select(FormulaQuery::find(), formula_entity::Column::TenantId)
            .filter(formula_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<formula_entity::Model>, DbErr> {
        tenant_select(FormulaQuery::find(), formula_entity::Column::TenantId)
            .all(&self.db)
            .await
    }
}
