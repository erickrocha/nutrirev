use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::dietary_restriction::{DietaryRestriction, DietaryRestrictionEntityMapper};
use entity::dietary_restriction_entity;
use entity::prelude::DietaryRestrictionEntity as DietaryRestrictionQuery;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct DietaryRestrictionGateway {
    db: DbConn,
}

impl DietaryRestrictionGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }
}

#[async_trait]
impl Gateway<DietaryRestriction, dietary_restriction_entity::Model, dietary_restriction_entity::ActiveModel> for DietaryRestrictionGateway {
    async fn persist(&self, entity: DietaryRestriction) -> Result<dietary_restriction_entity::ActiveModel, DbErr> {
        let active_model = DietaryRestrictionEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            DietaryRestrictionQuery::delete_many().filter(dietary_restriction_entity::Column::Id.eq(id)),
            dietary_restriction_entity::Column::TenantId,
        )
            .exec(&self.db)
            .await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<dietary_restriction_entity::Model>, DbErr> {
        tenant_select(DietaryRestrictionQuery::find(), dietary_restriction_entity::Column::TenantId)
            .filter(dietary_restriction_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<dietary_restriction_entity::Model>, DbErr> {
        tenant_select(DietaryRestrictionQuery::find(), dietary_restriction_entity::Column::TenantId)
            .filter(dietary_restriction_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<dietary_restriction_entity::Model>, DbErr> {
        tenant_select(DietaryRestrictionQuery::find(), dietary_restriction_entity::Column::TenantId)
            .all(&self.db)
            .await
    }
}
