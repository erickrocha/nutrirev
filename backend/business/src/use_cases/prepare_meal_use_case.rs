use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::domain::business_error::BusinessError;
use crate::domain::prepare_meal::{PrepareMeal, PrepareMealEntityMapper};
use crate::gateway::prepare_meal_gateway::PrepareMealGateway;

pub struct PrepareMealUseCase {
    gateway: PrepareMealGateway,
}

impl PrepareMealUseCase {
    pub fn new(gateway: PrepareMealGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, entity: PrepareMeal) -> Result<PrepareMeal, BusinessError> {
        log::info!("Creating prepare_meal: {:?}", entity);
        if entity.name.trim().is_empty() {
            return Err(BusinessError::new("PrepareMeal name is required".to_string()));
        }
        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to persist prepare_meal: {}", e)))?;

        Ok(PrepareMealEntityMapper::from_active_model(model))
    }

    pub async fn find_by_id(&self, id: i32) -> Result<PrepareMeal, BusinessError> {
        let model = self
            .gateway
            .find_by_id(id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        match model {
            Some(val) => Ok(PrepareMealEntityMapper::from_model(val)),
            None => Err(BusinessError::new("PrepareMeal not found".to_string())),
        }
    }

    pub async fn find_by_uuid(&self, uuid: String) -> Result<PrepareMeal, BusinessError> {
        let model = self
            .gateway
            .find_by_uuid(uuid)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        match model {
            Some(val) => Ok(PrepareMealEntityMapper::from_model(val)),
            None => Err(BusinessError::new("PrepareMeal not found".to_string())),
        }
    }

    pub async fn find_all(&self) -> Result<Vec<PrepareMeal>, BusinessError> {
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        Ok(PrepareMealEntityMapper::from_models(models))
    }

    pub async fn update(&self, id: i32, mut entity: PrepareMeal) -> Result<PrepareMeal, BusinessError> {
        let existing = self.find_by_id(id).await?;
        if entity.name.trim().is_empty() {
            return Err(BusinessError::new("PrepareMeal name is required".to_string()));
        }
        entity.id = Some(id);
        entity.uuid = existing.uuid;
        entity.created_at = existing.created_at;
        entity.created_by = existing.created_by;

        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to update prepare_meal: {}", e)))?;

        Ok(PrepareMealEntityMapper::from_active_model(model))
    }

    pub async fn delete_by_id(&self, id: i32) -> Result<(), BusinessError> {
        self.gateway
            .delete_by_id(id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;
        Ok(())
    }
}
