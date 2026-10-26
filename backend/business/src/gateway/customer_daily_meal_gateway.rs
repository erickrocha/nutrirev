use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::{customer_is_visible, tenant_select, visible_customer_ids};
use entity::daily_meal_entity;
use crate::domain::customer_daily_meal::{CustomerDailyMeal, CustomerDailyMealEntityMapper};
use entity::customer_daily_meal_entity;
use entity::prelude::CustomerDailyMealEntity as CustomerDailyMealQuery;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct CustomerDailyMealGateway {
    db: DbConn,
}

impl CustomerDailyMealGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }

    pub async fn persist(&self, entity: CustomerDailyMeal) -> Result<customer_daily_meal_entity::ActiveModel, DbErr> {
        if !customer_is_visible(&self.db, entity.customer_id).await? {
            return Err(DbErr::Custom("Customer not found for tenant".to_string()));
        }
        if tenant_select(daily_meal_entity::Entity::find(), daily_meal_entity::Column::TenantId)
            .filter(daily_meal_entity::Column::Id.eq(entity.daily_meal_id)).one(&self.db).await?.is_none() {
            return Err(DbErr::Custom("Daily meal not found for tenant".to_string()));
        }
        let active_model = CustomerDailyMealEntityMapper::build_active_model(entity);
        let model = active_model.insert(&self.db).await?;
        Ok(CustomerDailyMealEntityMapper::build_active_model(
            CustomerDailyMealEntityMapper::from_model(model),
        ))
    }

    pub async fn find_by_customer_id(&self, customer_id: i32) -> Result<Vec<customer_daily_meal_entity::Model>, DbErr> {
        if !customer_is_visible(&self.db, customer_id).await? {
            return Ok(Vec::new());
        }
        CustomerDailyMealQuery::find()
            .filter(customer_daily_meal_entity::Column::CustomerId.eq(customer_id))
            .all(&self.db)
            .await
    }

    pub async fn find_all(&self) -> Result<Vec<customer_daily_meal_entity::Model>, DbErr> {
        let customer_ids = visible_customer_ids(&self.db).await?;
        CustomerDailyMealQuery::find()
            .filter(customer_daily_meal_entity::Column::CustomerId.is_in(customer_ids))
            .all(&self.db)
            .await
    }

    pub async fn delete_by_customer_and_meal(&self, customer_id: i32, daily_meal_id: i32) -> Result<DeleteResult, DbErr> {
        if !customer_is_visible(&self.db, customer_id).await? { return Err(DbErr::Custom("Customer not found for tenant".to_string())); }
        CustomerDailyMealQuery::delete_many()
            .filter(customer_daily_meal_entity::Column::CustomerId.eq(customer_id))
            .filter(customer_daily_meal_entity::Column::DailyMealId.eq(daily_meal_id))
            .exec(&self.db)
            .await
    }
}
