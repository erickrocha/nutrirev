use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::domain::business_error::BusinessError;
use crate::domain::pre_existing_conditions::{PreExistingConditions, PreExistingConditionsEntityMapper};
use crate::gateway::pre_existing_conditions_gateway::PreExistingConditionsGateway;

pub struct PreExistingConditionsUseCase {
    gateway: PreExistingConditionsGateway,
}

impl PreExistingConditionsUseCase {
    pub fn new(gateway: PreExistingConditionsGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, entity: PreExistingConditions) -> Result<PreExistingConditions, BusinessError> {
        log::info!("Creating pre_existing_conditions: {:?}", entity);
        if entity.name.trim().is_empty() {
            return Err(BusinessError::new("PreExistingConditions name is required".to_string()));
        }
        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to persist pre_existing_conditions: {}", e)))?;

        Ok(PreExistingConditionsEntityMapper::from_active_model(model))
    }

    pub async fn find_by_id(&self, id: i32) -> Result<PreExistingConditions, BusinessError> {
        let model = self
            .gateway
            .find_by_id(id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        match model {
            Some(val) => Ok(PreExistingConditionsEntityMapper::from_model(val)),
            None => Err(BusinessError::new("PreExistingConditions not found".to_string())),
        }
    }

    pub async fn find_by_uuid(&self, uuid: String) -> Result<PreExistingConditions, BusinessError> {
        let model = self
            .gateway
            .find_by_uuid(uuid)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        match model {
            Some(val) => Ok(PreExistingConditionsEntityMapper::from_model(val)),
            None => Err(BusinessError::new("PreExistingConditions not found".to_string())),
        }
    }

    pub async fn find_all(&self) -> Result<Vec<PreExistingConditions>, BusinessError> {
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        Ok(PreExistingConditionsEntityMapper::from_models(models))
    }

    pub async fn update(&self, id: i32, mut entity: PreExistingConditions) -> Result<PreExistingConditions, BusinessError> {
        let existing = self.find_by_id(id).await?;
        if entity.name.trim().is_empty() {
            return Err(BusinessError::new("PreExistingConditions name is required".to_string()));
        }
        entity.id = Some(id);
        entity.uuid = existing.uuid;
        entity.created_at = existing.created_at;
        entity.created_by = existing.created_by;

        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to update pre_existing_conditions: {}", e)))?;

        Ok(PreExistingConditionsEntityMapper::from_active_model(model))
    }

    pub async fn delete_by_id(&self, id: i32) -> Result<(), BusinessError> {
        self.gateway
            .delete_by_id(id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;
        Ok(())
    }
}
