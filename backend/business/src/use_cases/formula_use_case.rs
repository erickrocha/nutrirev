use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::domain::business_error::BusinessError;
use crate::domain::formula::{Formula, FormulaEntityMapper};
use crate::gateway::formula_gateway::FormulaGateway;

pub struct FormulaUseCase {
    gateway: FormulaGateway,
}

impl FormulaUseCase {
    pub fn new(gateway: FormulaGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, entity: Formula) -> Result<Formula, BusinessError> {
        log::info!("Creating formula: {:?}", entity);
        if entity.name.trim().is_empty() {
            return Err(BusinessError::new("Formula name is required".to_string()));
        }
        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to persist formula: {}", e)))?;

        Ok(FormulaEntityMapper::from_active_model(model))
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Formula, BusinessError> {
        let model = self
            .gateway
            .find_by_id(id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        match model {
            Some(val) => Ok(FormulaEntityMapper::from_model(val)),
            None => Err(BusinessError::new("Formula not found".to_string())),
        }
    }

    pub async fn find_by_uuid(&self, uuid: String) -> Result<Formula, BusinessError> {
        let model = self
            .gateway
            .find_by_uuid(uuid)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        match model {
            Some(val) => Ok(FormulaEntityMapper::from_model(val)),
            None => Err(BusinessError::new("Formula not found".to_string())),
        }
    }

    pub async fn find_all(&self) -> Result<Vec<Formula>, BusinessError> {
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        Ok(FormulaEntityMapper::from_models(models))
    }

    pub async fn update(&self, id: i32, mut entity: Formula) -> Result<Formula, BusinessError> {
        let existing = self.find_by_id(id).await?;
        if entity.name.trim().is_empty() {
            return Err(BusinessError::new("Formula name is required".to_string()));
        }
        entity.id = Some(id);
        entity.uuid = existing.uuid;
        entity.created_at = existing.created_at;
        entity.created_by = existing.created_by;

        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to update formula: {}", e)))?;

        Ok(FormulaEntityMapper::from_active_model(model))
    }

    pub async fn delete_by_id(&self, id: i32) -> Result<(), BusinessError> {
        self.gateway
            .delete_by_id(id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;
        Ok(())
    }
}
