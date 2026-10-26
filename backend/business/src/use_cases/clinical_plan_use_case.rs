use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::domain::business_error::BusinessError;
use crate::domain::clinical_plan::{ClinicalPlan, ClinicalPlanEntityMapper};
use crate::gateway::clinical_plan_gateway::ClinicalPlanGateway;

pub struct ClinicalPlanUseCase {
    gateway: ClinicalPlanGateway,
}

impl ClinicalPlanUseCase {
    pub fn new(gateway: ClinicalPlanGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, entity: ClinicalPlan) -> Result<ClinicalPlan, BusinessError> {
        log::info!("Creating clinical_plan: {:?}", entity);
        if entity.name.trim().is_empty() {
            return Err(BusinessError::new("ClinicalPlan name is required".to_string()));
        }
        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to persist clinical_plan: {}", e)))?;

        Ok(ClinicalPlanEntityMapper::from_active_model(model))
    }

    pub async fn find_by_id(&self, id: i32) -> Result<ClinicalPlan, BusinessError> {
        let model = self
            .gateway
            .find_by_id(id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        match model {
            Some(val) => Ok(ClinicalPlanEntityMapper::from_model(val)),
            None => Err(BusinessError::new("ClinicalPlan not found".to_string())),
        }
    }

    pub async fn find_by_uuid(&self, uuid: String) -> Result<ClinicalPlan, BusinessError> {
        let model = self
            .gateway
            .find_by_uuid(uuid)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        match model {
            Some(val) => Ok(ClinicalPlanEntityMapper::from_model(val)),
            None => Err(BusinessError::new("ClinicalPlan not found".to_string())),
        }
    }

    pub async fn find_all(&self) -> Result<Vec<ClinicalPlan>, BusinessError> {
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        Ok(ClinicalPlanEntityMapper::from_models(models))
    }

    pub async fn update(&self, id: i32, mut entity: ClinicalPlan) -> Result<ClinicalPlan, BusinessError> {
        let existing = self.find_by_id(id).await?;
        if entity.name.trim().is_empty() {
            return Err(BusinessError::new("ClinicalPlan name is required".to_string()));
        }
        entity.id = Some(id);
        entity.uuid = existing.uuid;
        entity.created_at = existing.created_at;
        entity.created_by = existing.created_by;

        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to update clinical_plan: {}", e)))?;

        Ok(ClinicalPlanEntityMapper::from_active_model(model))
    }

    pub async fn delete_by_id(&self, id: i32) -> Result<(), BusinessError> {
        self.gateway
            .delete_by_id(id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;
        Ok(())
    }
}
