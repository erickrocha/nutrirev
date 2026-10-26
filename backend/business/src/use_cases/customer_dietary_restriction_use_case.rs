use crate::commons::entity_mapper::EntityMapper;
use crate::domain::business_error::BusinessError;
use crate::domain::customer_dietary_restriction::{CustomerDietaryRestriction, CustomerDietaryRestrictionEntityMapper};
use crate::gateway::customer_dietary_restriction_gateway::CustomerDietaryRestrictionGateway;

pub struct CustomerDietaryRestrictionUseCase {
    gateway: CustomerDietaryRestrictionGateway,
}

impl CustomerDietaryRestrictionUseCase {
    pub fn new(gateway: CustomerDietaryRestrictionGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, entity: CustomerDietaryRestriction) -> Result<CustomerDietaryRestriction, BusinessError> {
        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to persist customer_dietary_restriction: {}", e)))?;

        Ok(CustomerDietaryRestrictionEntityMapper::from_active_model(model))
    }

    pub async fn find_by_customer_id(&self, customer_id: i32) -> Result<Vec<CustomerDietaryRestriction>, BusinessError> {
        let models = self
            .gateway
            .find_by_customer_id(customer_id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        Ok(CustomerDietaryRestrictionEntityMapper::from_models(models))
    }

    pub async fn find_all(&self) -> Result<Vec<CustomerDietaryRestriction>, BusinessError> {
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        Ok(CustomerDietaryRestrictionEntityMapper::from_models(models))
    }

    pub async fn delete(&self, customer_id: i32, dietary_restriction_id: i32) -> Result<(), BusinessError> {
        self.gateway
            .delete_by_customer_and_restriction(customer_id, dietary_restriction_id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;
        Ok(())
    }
}
