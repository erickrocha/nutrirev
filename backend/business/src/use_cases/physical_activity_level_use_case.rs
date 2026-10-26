use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::domain::business_error::BusinessError;
use crate::domain::physical_activity_level::{PhysicalActivityLevel, PhysicalActivityLevelEntityMapper};
use crate::gateway::physical_activity_level_gateway::PhysicalActivityLevelGateway;

pub struct PhysicalActivityLevelUseCase {
    gateway: PhysicalActivityLevelGateway,
}

impl PhysicalActivityLevelUseCase {
    pub fn new(gateway: PhysicalActivityLevelGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, entity: PhysicalActivityLevel) -> Result<PhysicalActivityLevel, BusinessError> {
        log::info!("Creating physical_activity_level: {:?}", entity);
        if entity.name.trim().is_empty() {
            return Err(BusinessError::new("PhysicalActivityLevel name is required".to_string()));
        }
        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to persist physical_activity_level: {}", e)))?;

        Ok(PhysicalActivityLevelEntityMapper::from_active_model(model))
    }

    pub async fn find_by_id(&self, id: i32) -> Result<PhysicalActivityLevel, BusinessError> {
        let model = self
            .gateway
            .find_by_id(id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        match model {
            Some(val) => Ok(PhysicalActivityLevelEntityMapper::from_model(val)),
            None => Err(BusinessError::new("PhysicalActivityLevel not found".to_string())),
        }
    }

    pub async fn find_by_uuid(&self, uuid: String) -> Result<PhysicalActivityLevel, BusinessError> {
        let model = self
            .gateway
            .find_by_uuid(uuid)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        match model {
            Some(val) => Ok(PhysicalActivityLevelEntityMapper::from_model(val)),
            None => Err(BusinessError::new("PhysicalActivityLevel not found".to_string())),
        }
    }

    pub async fn find_all(&self) -> Result<Vec<PhysicalActivityLevel>, BusinessError> {
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        Ok(PhysicalActivityLevelEntityMapper::from_models(models))
    }

    pub async fn update(&self, id: i32, mut entity: PhysicalActivityLevel) -> Result<PhysicalActivityLevel, BusinessError> {
        let existing = self.find_by_id(id).await?;
        if entity.name.trim().is_empty() {
            return Err(BusinessError::new("PhysicalActivityLevel name is required".to_string()));
        }
        entity.id = Some(id);
        entity.uuid = existing.uuid;
        entity.created_at = existing.created_at;
        entity.created_by = existing.created_by;

        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to update physical_activity_level: {}", e)))?;

        Ok(PhysicalActivityLevelEntityMapper::from_active_model(model))
    }

    pub async fn delete_by_id(&self, id: i32) -> Result<(), BusinessError> {
        self.gateway
            .delete_by_id(id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;
        Ok(())
    }
}
