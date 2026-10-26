use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::{customer_is_visible, tenant_select, visible_customer_ids};
use entity::bowel_function_entity;
use crate::domain::customer_bowel_function::{CustomerBowelFunction, CustomerBowelFunctionEntityMapper};
use entity::customer_bowel_function_entity;
use entity::prelude::CustomerBowelFunctionEntity as CustomerBowelFunctionQuery;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct CustomerBowelFunctionGateway {
    db: DbConn,
}

impl CustomerBowelFunctionGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }

    pub async fn persist(&self, entity: CustomerBowelFunction) -> Result<customer_bowel_function_entity::ActiveModel, DbErr> {
        if !customer_is_visible(&self.db, entity.customer_id).await? {
            return Err(DbErr::Custom("Customer not found for tenant".to_string()));
        }
        if tenant_select(bowel_function_entity::Entity::find(), bowel_function_entity::Column::TenantId)
            .filter(bowel_function_entity::Column::Id.eq(entity.bowel_function_id)).one(&self.db).await?.is_none() {
            return Err(DbErr::Custom("Bowel function not found for tenant".to_string()));
        }
        let active_model = CustomerBowelFunctionEntityMapper::build_active_model(entity);
        let model = active_model.insert(&self.db).await?;
        Ok(CustomerBowelFunctionEntityMapper::build_active_model(
            CustomerBowelFunctionEntityMapper::from_model(model),
        ))
    }

    pub async fn find_by_customer_id(&self, customer_id: i32) -> Result<Vec<customer_bowel_function_entity::Model>, DbErr> {
        if !customer_is_visible(&self.db, customer_id).await? {
            return Ok(Vec::new());
        }
        CustomerBowelFunctionQuery::find()
            .filter(customer_bowel_function_entity::Column::CustomerId.eq(customer_id))
            .all(&self.db)
            .await
    }

    pub async fn find_all(&self) -> Result<Vec<customer_bowel_function_entity::Model>, DbErr> {
        let customer_ids = visible_customer_ids(&self.db).await?;
        CustomerBowelFunctionQuery::find()
            .filter(customer_bowel_function_entity::Column::CustomerId.is_in(customer_ids))
            .all(&self.db)
            .await
    }

    pub async fn delete_by_customer_and_function(&self, customer_id: i32, bowel_function_id: i32) -> Result<DeleteResult, DbErr> {
        if !customer_is_visible(&self.db, customer_id).await? { return Err(DbErr::Custom("Customer not found for tenant".to_string())); }
        CustomerBowelFunctionQuery::delete_many()
            .filter(customer_bowel_function_entity::Column::CustomerId.eq(customer_id))
            .filter(customer_bowel_function_entity::Column::BowelFunctionId.eq(bowel_function_id))
            .exec(&self.db)
            .await
    }
}
