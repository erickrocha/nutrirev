use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::domain::business_error::BusinessError;
use crate::domain::daily_meal::{DailyMeal, DailyMealEntityMapper};
use crate::gateway::daily_meal_gateway::DailyMealGateway;

pub struct DailyMealUseCase {
    gateway: DailyMealGateway,
}

impl DailyMealUseCase {
    pub fn new(gateway: DailyMealGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, entity: DailyMeal) -> Result<DailyMeal, BusinessError> {
        log::info!("Creating daily_meal: {:?}", entity);
        if entity.name.trim().is_empty() {
            return Err(BusinessError::new("DailyMeal name is required".to_string()));
        }
        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to persist daily_meal: {}", e)))?;

        Ok(DailyMealEntityMapper::from_active_model(model))
    }

    pub async fn find_by_id(&self, id: i32) -> Result<DailyMeal, BusinessError> {
        let model = self
            .gateway
            .find_by_id(id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        match model {
            Some(val) => Ok(DailyMealEntityMapper::from_model(val)),
            None => Err(BusinessError::new("DailyMeal not found".to_string())),
        }
    }

    pub async fn find_by_uuid(&self, uuid: String) -> Result<DailyMeal, BusinessError> {
        let model = self
            .gateway
            .find_by_uuid(uuid)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        match model {
            Some(val) => Ok(DailyMealEntityMapper::from_model(val)),
            None => Err(BusinessError::new("DailyMeal not found".to_string())),
        }
    }

    pub async fn find_all(&self) -> Result<Vec<DailyMeal>, BusinessError> {
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;

        Ok(DailyMealEntityMapper::from_models(models))
    }

    pub async fn update(&self, id: i32, mut entity: DailyMeal) -> Result<DailyMeal, BusinessError> {
        let existing = self.find_by_id(id).await?;
        if entity.name.trim().is_empty() {
            return Err(BusinessError::new("DailyMeal name is required".to_string()));
        }
        entity.id = Some(id);
        entity.uuid = existing.uuid;
        entity.created_at = existing.created_at;
        entity.created_by = existing.created_by;

        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to update daily_meal: {}", e)))?;

        Ok(DailyMealEntityMapper::from_active_model(model))
    }

    pub async fn delete_by_id(&self, id: i32) -> Result<(), BusinessError> {
        self.gateway
            .delete_by_id(id)
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {}", e)))?;
        Ok(())
    }
}
