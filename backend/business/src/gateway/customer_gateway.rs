use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::customer::{Customer, CustomerEntityMapper};
use entity::customer_entity;
use entity::prelude::CustomerEntity as CustomerQuery;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct CustomerGateway {
    db: DbConn,
}

impl CustomerGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }

    pub fn db(&self) -> &DbConn {
        &self.db
    }

    pub async fn find_by_email(&self, email: &str) -> Result<Option<customer_entity::Model>, DbErr> {
        CustomerQuery::find()
            .filter(customer_entity::Column::Email.eq(email))
            .one(&self.db)
            .await
    }

    pub async fn find_by_user_id(&self, user_id: i32) -> Result<Option<customer_entity::Model>, DbErr> {
        CustomerQuery::find()
            .filter(customer_entity::Column::UserId.eq(user_id))
            .one(&self.db)
            .await
    }
}

#[async_trait]
impl Gateway<Customer, customer_entity::Model, customer_entity::ActiveModel> for CustomerGateway {
    async fn persist(&self, entity: Customer) -> Result<customer_entity::ActiveModel, DbErr> {
        let active_model = CustomerEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            CustomerQuery::delete_many().filter(customer_entity::Column::Id.eq(id)),
            customer_entity::Column::TenantId,
        )
            .exec(&self.db)
            .await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<customer_entity::Model>, DbErr> {
        tenant_select(CustomerQuery::find(), customer_entity::Column::TenantId)
            .filter(customer_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<customer_entity::Model>, DbErr> {
        tenant_select(CustomerQuery::find(), customer_entity::Column::TenantId)
            .filter(customer_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<customer_entity::Model>, DbErr> {
        tenant_select(CustomerQuery::find(), customer_entity::Column::TenantId)
            .all(&self.db)
            .await
    }
}
