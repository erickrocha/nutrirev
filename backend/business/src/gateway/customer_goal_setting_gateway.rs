use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::customer_goal_setting::{CustomerGoalSetting, CustomerGoalSettingEntityMapper};
use entity::customer_goal_setting_entity;
use entity::prelude::CustomerGoalSettingEntity as CustomerGoalSettingQuery;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct CustomerGoalSettingGateway {
    db: DbConn,
}

impl CustomerGoalSettingGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }
}

#[async_trait]
impl Gateway<CustomerGoalSetting, customer_goal_setting_entity::Model, customer_goal_setting_entity::ActiveModel> for CustomerGoalSettingGateway {
    async fn persist(&self, entity: CustomerGoalSetting) -> Result<customer_goal_setting_entity::ActiveModel, DbErr> {
        let active_model = CustomerGoalSettingEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            CustomerGoalSettingQuery::delete_many().filter(customer_goal_setting_entity::Column::Id.eq(id)),
            customer_goal_setting_entity::Column::TenantId,
        )
            .exec(&self.db)
            .await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<customer_goal_setting_entity::Model>, DbErr> {
        tenant_select(CustomerGoalSettingQuery::find(), customer_goal_setting_entity::Column::TenantId)
            .filter(customer_goal_setting_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<customer_goal_setting_entity::Model>, DbErr> {
        tenant_select(CustomerGoalSettingQuery::find(), customer_goal_setting_entity::Column::TenantId)
            .filter(customer_goal_setting_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<customer_goal_setting_entity::Model>, DbErr> {
        tenant_select(CustomerGoalSettingQuery::find(), customer_goal_setting_entity::Column::TenantId)
            .all(&self.db)
            .await
    }
}
