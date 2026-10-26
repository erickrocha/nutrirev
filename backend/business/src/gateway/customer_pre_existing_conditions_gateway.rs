use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::{customer_is_visible, tenant_select, visible_customer_ids};
use entity::pre_existing_conditions_entity;
use crate::domain::customer_pre_existing_conditions::{CustomerPreExistingConditions, CustomerPreExistingConditionsEntityMapper};
use entity::customer_pre_existing_conditions_entity;
use entity::prelude::CustomerPreExistingConditionsEntity as CustomerPreExistingConditionsQuery;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct CustomerPreExistingConditionsGateway {
    db: DbConn,
}

impl CustomerPreExistingConditionsGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }

    pub async fn persist(&self, entity: CustomerPreExistingConditions) -> Result<customer_pre_existing_conditions_entity::ActiveModel, DbErr> {
        if !customer_is_visible(&self.db, entity.customer_id).await? {
            return Err(DbErr::Custom("Customer not found for tenant".to_string()));
        }
        if tenant_select(pre_existing_conditions_entity::Entity::find(), pre_existing_conditions_entity::Column::TenantId)
            .filter(pre_existing_conditions_entity::Column::Id.eq(entity.pre_existing_conditions_id)).one(&self.db).await?.is_none() {
            return Err(DbErr::Custom("Pre-existing condition not found for tenant".to_string()));
        }
        let active_model = CustomerPreExistingConditionsEntityMapper::build_active_model(entity);
        let model = active_model.insert(&self.db).await?;
        Ok(CustomerPreExistingConditionsEntityMapper::build_active_model(
            CustomerPreExistingConditionsEntityMapper::from_model(model),
        ))
    }

    pub async fn find_by_customer_id(&self, customer_id: i32) -> Result<Vec<customer_pre_existing_conditions_entity::Model>, DbErr> {
        if !customer_is_visible(&self.db, customer_id).await? {
            return Ok(Vec::new());
        }
        CustomerPreExistingConditionsQuery::find()
            .filter(customer_pre_existing_conditions_entity::Column::CustomerId.eq(customer_id))
            .all(&self.db)
            .await
    }

    pub async fn find_all(&self) -> Result<Vec<customer_pre_existing_conditions_entity::Model>, DbErr> {
        let customer_ids = visible_customer_ids(&self.db).await?;
        CustomerPreExistingConditionsQuery::find()
            .filter(customer_pre_existing_conditions_entity::Column::CustomerId.is_in(customer_ids))
            .all(&self.db)
            .await
    }

    pub async fn delete_by_customer_and_condition(&self, customer_id: i32, pre_existing_conditions_id: i32) -> Result<DeleteResult, DbErr> {
        if !customer_is_visible(&self.db, customer_id).await? { return Err(DbErr::Custom("Customer not found for tenant".to_string())); }
        CustomerPreExistingConditionsQuery::delete_many()
            .filter(customer_pre_existing_conditions_entity::Column::CustomerId.eq(customer_id))
            .filter(customer_pre_existing_conditions_entity::Column::PreExistingConditionsId.eq(pre_existing_conditions_id))
            .exec(&self.db)
            .await
    }
}
