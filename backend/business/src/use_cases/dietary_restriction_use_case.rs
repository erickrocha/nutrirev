use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::domain::business_error::BusinessError;
use crate::domain::dietary_restriction::{DietaryRestriction, DietaryRestrictionEntityMapper};
use crate::gateway::dietary_restriction_gateway::DietaryRestrictionGateway;

pub struct DietaryRestrictionUseCase {
    gateway: DietaryRestrictionGateway,
}

impl DietaryRestrictionUseCase {
    pub fn new(gateway: DietaryRestrictionGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, entity: DietaryRestriction) -> Result<DietaryRestriction, BusinessError> {
        log::info!("Creating dietary_restriction: {:?}", entity);
        if entity.name.trim().is_empty() {
            return Err(BusinessError::new("DietaryRestriction name is required".to_string()));
        }
        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to persist dietary_restriction: {}", e)))?;

        Ok(DietaryRestrictionEntityMapper::from_active_model(model))
    }

    pub async fn find_by_id(&self, id: i32) -> Result<DietaryRestriction, BusinessError> {
        let model = self
            .gateway
            .find_by_id(id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        match model {
            Some(val) => Ok(DietaryRestrictionEntityMapper::from_model(val)),
            None => Err(BusinessError::new("DietaryRestriction not found".to_string())),
        }
    }

    pub async fn find_by_uuid(&self, uuid: String) -> Result<DietaryRestriction, BusinessError> {
        let model = self
            .gateway
            .find_by_uuid(uuid)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        match model {
            Some(val) => Ok(DietaryRestrictionEntityMapper::from_model(val)),
            None => Err(BusinessError::new("DietaryRestriction not found".to_string())),
        }
    }

    pub async fn find_all(&self) -> Result<Vec<DietaryRestriction>, BusinessError> {
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        Ok(DietaryRestrictionEntityMapper::from_models(models))
    }

    pub async fn update(&self, id: i32, mut entity: DietaryRestriction) -> Result<DietaryRestriction, BusinessError> {
        let existing = self.find_by_id(id).await?;
        if entity.name.trim().is_empty() {
            return Err(BusinessError::new("DietaryRestriction name is required".to_string()));
        }
        entity.id = Some(id);
        entity.uuid = existing.uuid;
        entity.created_at = existing.created_at;
        entity.created_by = existing.created_by;

        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to update dietary_restriction: {}", e)))?;

        Ok(DietaryRestrictionEntityMapper::from_active_model(model))
    }

    pub async fn delete_by_id(&self, id: i32) -> Result<(), BusinessError> {
        self.gateway
            .delete_by_id(id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;
        Ok(())
    }
}
