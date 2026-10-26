use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::domain::business_error::BusinessError;
use crate::domain::objective::{Objective, ObjectiveEntityMapper};
use crate::gateway::objective_gateway::ObjectiveGateway;

pub struct ObjectiveUseCase {
    gateway: ObjectiveGateway,
}

impl ObjectiveUseCase {
    pub fn new(gateway: ObjectiveGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, entity: Objective) -> Result<Objective, BusinessError> {
        log::info!("Creating objective: {:?}", entity);
        if entity.name.trim().is_empty() {
            return Err(BusinessError::new("Objective name is required".to_string()));
        }
        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to persist objective: {}", e)))?;

        Ok(ObjectiveEntityMapper::from_active_model(model))
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Objective, BusinessError> {
        let model = self
            .gateway
            .find_by_id(id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        match model {
            Some(val) => Ok(ObjectiveEntityMapper::from_model(val)),
            None => Err(BusinessError::new("Objective not found".to_string())),
        }
    }

    pub async fn find_by_uuid(&self, uuid: String) -> Result<Objective, BusinessError> {
        let model = self
            .gateway
            .find_by_uuid(uuid)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        match model {
            Some(val) => Ok(ObjectiveEntityMapper::from_model(val)),
            None => Err(BusinessError::new("Objective not found".to_string())),
        }
    }

    pub async fn find_all(&self) -> Result<Vec<Objective>, BusinessError> {
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        Ok(ObjectiveEntityMapper::from_models(models))
    }

    pub async fn update(&self, id: i32, mut entity: Objective) -> Result<Objective, BusinessError> {
        let existing = self.find_by_id(id).await?;
        if entity.name.trim().is_empty() {
            return Err(BusinessError::new("Objective name is required".to_string()));
        }
        entity.id = Some(id);
        entity.uuid = existing.uuid;
        entity.created_at = existing.created_at;
        entity.created_by = existing.created_by;

        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to update objective: {}", e)))?;

        Ok(ObjectiveEntityMapper::from_active_model(model))
    }

    pub async fn delete_by_id(&self, id: i32) -> Result<(), BusinessError> {
        self.gateway
            .delete_by_id(id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;
        Ok(())
    }
}
