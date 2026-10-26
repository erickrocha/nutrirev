use crate::commons::entity_mapper::EntityMapper;
use crate::domain::business_error::BusinessError;
use crate::domain::customer_daily_meal::{CustomerDailyMeal, CustomerDailyMealEntityMapper};
use crate::gateway::customer_daily_meal_gateway::CustomerDailyMealGateway;

pub struct CustomerDailyMealUseCase {
    gateway: CustomerDailyMealGateway,
}

impl CustomerDailyMealUseCase {
    pub fn new(gateway: CustomerDailyMealGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, entity: CustomerDailyMeal) -> Result<CustomerDailyMeal, BusinessError> {
        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to persist customer_daily_meal: {}", e)))?;

        Ok(CustomerDailyMealEntityMapper::from_active_model(model))
    }

    pub async fn find_by_customer_id(&self, customer_id: i32) -> Result<Vec<CustomerDailyMeal>, BusinessError> {
        let models = self
            .gateway
            .find_by_customer_id(customer_id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        Ok(CustomerDailyMealEntityMapper::from_models(models))
    }

    pub async fn find_all(&self) -> Result<Vec<CustomerDailyMeal>, BusinessError> {
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        Ok(CustomerDailyMealEntityMapper::from_models(models))
    }

    pub async fn delete(&self, customer_id: i32, daily_meal_id: i32) -> Result<(), BusinessError> {
        self.gateway
            .delete_by_customer_and_meal(customer_id, daily_meal_id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;
        Ok(())
    }
}
