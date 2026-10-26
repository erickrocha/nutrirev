use crate::commons::entity_mapper::EntityMapper;
use crate::domain::business_error::BusinessError;
use crate::domain::customer_bowel_function::{CustomerBowelFunction, CustomerBowelFunctionEntityMapper};
use crate::gateway::customer_bowel_function_gateway::CustomerBowelFunctionGateway;

pub struct CustomerBowelFunctionUseCase {
    gateway: CustomerBowelFunctionGateway,
}

impl CustomerBowelFunctionUseCase {
    pub fn new(gateway: CustomerBowelFunctionGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, entity: CustomerBowelFunction) -> Result<CustomerBowelFunction, BusinessError> {
        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to persist customer_bowel_function: {}", e)))?;

        Ok(CustomerBowelFunctionEntityMapper::from_active_model(model))
    }

    pub async fn find_by_customer_id(&self, customer_id: i32) -> Result<Vec<CustomerBowelFunction>, BusinessError> {
        let models = self
            .gateway
            .find_by_customer_id(customer_id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        Ok(CustomerBowelFunctionEntityMapper::from_models(models))
    }

    pub async fn find_all(&self) -> Result<Vec<CustomerBowelFunction>, BusinessError> {
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        Ok(CustomerBowelFunctionEntityMapper::from_models(models))
    }

    pub async fn delete(&self, customer_id: i32, bowel_function_id: i32) -> Result<(), BusinessError> {
        self.gateway
            .delete_by_customer_and_function(customer_id, bowel_function_id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;
        Ok(())
    }
}
