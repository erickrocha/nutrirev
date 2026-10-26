use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::doctor::{Doctor, DoctorEntityMapper};
use entity::doctor_entity::{self, ActiveModel, Model};
use entity::prelude::DoctorEntity as DoctorQuery;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct DoctorGateway {
    db: DbConn,
}

impl DoctorGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }

    pub fn db(&self) -> &DbConn {
        &self.db
    }

    pub async fn find_all_by_tenant_id(&self, tenant_id: i32) -> Result<Vec<Model>, DbErr> {
        DoctorQuery::find()
            .filter(doctor_entity::Column::TenantId.eq(tenant_id))
            .all(&self.db)
            .await
    }
}

#[async_trait]
impl Gateway<Doctor, Model, ActiveModel> for DoctorGateway {
    async fn persist(&self, entity: Doctor) -> Result<ActiveModel, DbErr> {
        let active_model = DoctorEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            DoctorQuery::delete_many().filter(doctor_entity::Column::Id.eq(id)),
            doctor_entity::Column::TenantId,
        )
            .exec(&self.db)
            .await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<Model>, DbErr> {
        tenant_select(DoctorQuery::find(), doctor_entity::Column::TenantId)
            .filter(doctor_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<Model>, DbErr> {
        tenant_select(DoctorQuery::find(), doctor_entity::Column::TenantId)
            .filter(doctor_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<Model>, DbErr> {
        tenant_select(DoctorQuery::find(), doctor_entity::Column::TenantId).all(&self.db).await
    }
}
