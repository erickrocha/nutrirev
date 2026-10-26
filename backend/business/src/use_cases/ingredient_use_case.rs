use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::domain::business_error::BusinessError;
use crate::domain::ingredient::{Ingredient, IngredientEntityMapper};
use crate::gateway::ingredient_gateway::IngredientGateway;

pub struct IngredientUseCase {
    gateway: IngredientGateway,
}

impl IngredientUseCase {
    pub fn new(gateway: IngredientGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, mut entity: Ingredient) -> Result<Ingredient, BusinessError> {
        log::info!("[IngredientUseCase::create] Executing for name: {}", entity.name);
        if entity.name.trim().is_empty() {
            let msg = "Ingredient name is required".to_string();
            log::error!("[IngredientUseCase::create] {}", msg);
            return Err(BusinessError::new(msg));
        }
        entity.id = None;
        let active = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[IngredientUseCase::create] {}", msg);
                BusinessError::new(msg)
            })?;
        Ok(IngredientEntityMapper::from_active_model(active))
    }

    pub async fn update(&self, id: i32, mut entity: Ingredient) -> Result<Ingredient, BusinessError> {
        log::info!("[IngredientUseCase::update] Executing update for id {}: {}", id, entity.name);
        if entity.name.trim().is_empty() {
            let msg = "Ingredient name is required".to_string();
            log::error!("[IngredientUseCase::update] {}", msg);
            return Err(BusinessError::new(msg));
        }
        let existing = match self.find_by_id(id).await {
            Ok(val) => val,
            Err(e) => {
                log::error!("[IngredientUseCase::update] Ingredient to update not found with id {}: {}", id, e);
                return Err(e);
            }
        };
        entity.id = Some(id);
        entity.uuid = existing.uuid;
        let active = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[IngredientUseCase::update] {}", msg);
                BusinessError::new(msg)
            })?;
        Ok(IngredientEntityMapper::from_active_model(active))
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Ingredient, BusinessError> {
        log::info!("[IngredientUseCase::find_by_id] Executing for id: {}", id);
        let model = self
            .gateway
            .find_by_id(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[IngredientUseCase::find_by_id] {}", msg);
                BusinessError::new(msg)
            })?;
        match model {
            Some(m) => Ok(IngredientEntityMapper::from_model(m)),
            None => {
                let msg = format!("Ingredient not found with id: {}", id);
                log::error!("[IngredientUseCase::find_by_id] {}", msg);
                Err(BusinessError::new("Ingredient not found".to_string()))
            }
        }
    }

    pub async fn find_by_uuid(&self, uuid: String) -> Result<Ingredient, BusinessError> {
        log::info!("[IngredientUseCase::find_by_uuid] Executing for uuid: {}", uuid);
        let model = self
            .gateway
            .find_by_uuid(uuid.clone())
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[IngredientUseCase::find_by_uuid] {}", msg);
                BusinessError::new(msg)
            })?;
        match model {
            Some(m) => Ok(IngredientEntityMapper::from_model(m)),
            None => {
                let msg = format!("Ingredient not found with uuid: {}", uuid);
                log::error!("[IngredientUseCase::find_by_uuid] {}", msg);
                Err(BusinessError::new("Ingredient not found".to_string()))
            }
        }
    }

    pub async fn find_all(&self) -> Result<Vec<Ingredient>, BusinessError> {
        log::info!("[IngredientUseCase::find_all] Executing find_all");
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[IngredientUseCase::find_all] {}", msg);
                BusinessError::new(msg)
            })?;
        Ok(IngredientEntityMapper::from_models(models))
    }

    pub async fn delete(&self, id: i32) -> Result<(), BusinessError> {
        log::info!("[IngredientUseCase::delete] Executing delete for id: {}", id);
        self.gateway
            .delete_by_id(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error deleting ingredient id {}: {}", id, e);
                log::error!("[IngredientUseCase::delete] {}", msg);
                BusinessError::new(msg)
            })?;
        Ok(())
    }
}
