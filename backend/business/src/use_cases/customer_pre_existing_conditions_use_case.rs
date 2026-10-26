use crate::commons::entity_mapper::EntityMapper;
use crate::domain::business_error::BusinessError;
use crate::domain::customer_pre_existing_conditions::{CustomerPreExistingConditions, CustomerPreExistingConditionsEntityMapper};
use crate::gateway::customer_pre_existing_conditions_gateway::CustomerPreExistingConditionsGateway;

pub struct CustomerPreExistingConditionsUseCase {
    gateway: CustomerPreExistingConditionsGateway,
}

impl CustomerPreExistingConditionsUseCase {
    pub fn new(gateway: CustomerPreExistingConditionsGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, entity: CustomerPreExistingConditions) -> Result<CustomerPreExistingConditions, BusinessError> {
        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to persist customer_pre_existing_conditions: {}", e)))?;

        Ok(CustomerPreExistingConditionsEntityMapper::from_active_model(model))
    }

    pub async fn find_by_customer_id(&self, customer_id: i32) -> Result<Vec<CustomerPreExistingConditions>, BusinessError> {
        let models = self
            .gateway
            .find_by_customer_id(customer_id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        Ok(CustomerPreExistingConditionsEntityMapper::from_models(models))
    }

    pub async fn find_all(&self) -> Result<Vec<CustomerPreExistingConditions>, BusinessError> {
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        Ok(CustomerPreExistingConditionsEntityMapper::from_models(models))
    }

    pub async fn delete(&self, customer_id: i32, pre_existing_conditions_id: i32) -> Result<(), BusinessError> {
        self.gateway
            .delete_by_customer_and_condition(customer_id, pre_existing_conditions_id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;
        Ok(())
    }
}
