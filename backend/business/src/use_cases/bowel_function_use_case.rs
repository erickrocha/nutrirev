use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::domain::bowel_function::{BowelFunction, BowelFunctionEntityMapper};
use crate::domain::business_error::BusinessError;
use crate::gateway::bowel_function_gateway::BowelFunctionGateway;

pub struct BowelFunctionUseCase {
    gateway: BowelFunctionGateway,
}

impl BowelFunctionUseCase {
    pub fn new(gateway: BowelFunctionGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, entity: BowelFunction) -> Result<BowelFunction, BusinessError> {
        log::info!("[BowelFunctionUseCase::create] Executing for name: {}", entity.name);
        if entity.name.trim().is_empty() {
            let msg = "BowelFunction name is required".to_string();
            log::error!("[BowelFunctionUseCase::create] {}", msg);
            return Err(BusinessError::new(msg));
        }
        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| {
                let msg = format!("Failed to persist bowel_function: {}", e);
                log::error!("[BowelFunctionUseCase::create] {}", msg);
                BusinessError::new(msg)
            })?;

        Ok(BowelFunctionEntityMapper::from_active_model(model))
    }

    pub async fn find_by_id(&self, id: i32) -> Result<BowelFunction, BusinessError> {
        log::info!("[BowelFunctionUseCase::find_by_id] Executing for id: {}", id);
        let model = self
            .gateway
            .find_by_id(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[BowelFunctionUseCase::find_by_id] {}", msg);
                BusinessError::new(msg)
            })?;

        match model {
            Some(val) => Ok(BowelFunctionEntityMapper::from_model(val)),
            None => {
                let msg = format!("BowelFunction not found with id: {}", id);
                log::error!("[BowelFunctionUseCase::find_by_id] {}", msg);
                Err(BusinessError::new("BowelFunction not found".to_string()))
            }
        }
    }

    pub async fn find_by_uuid(&self, uuid: String) -> Result<BowelFunction, BusinessError> {
        log::info!("[BowelFunctionUseCase::find_by_uuid] Executing for uuid: {}", uuid);
        let model = self
            .gateway
            .find_by_uuid(uuid.clone())
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[BowelFunctionUseCase::find_by_uuid] {}", msg);
                BusinessError::new(msg)
            })?;

        match model {
            Some(val) => Ok(BowelFunctionEntityMapper::from_model(val)),
            None => {
                let msg = format!("BowelFunction not found with uuid: {}", uuid);
                log::error!("[BowelFunctionUseCase::find_by_uuid] {}", msg);
                Err(BusinessError::new("BowelFunction not found".to_string()))
            }
        }
    }

    pub async fn find_all(&self) -> Result<Vec<BowelFunction>, BusinessError> {
        log::info!("[BowelFunctionUseCase::find_all] Executing find_all");
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[BowelFunctionUseCase::find_all] {}", msg);
                BusinessError::new(msg)
            })?;

        Ok(BowelFunctionEntityMapper::from_models(models))
    }

    pub async fn update(&self, id: i32, mut entity: BowelFunction) -> Result<BowelFunction, BusinessError> {
        log::info!("[BowelFunctionUseCase::update] Executing update for id {}: {}", id, entity.name);
        let existing = match self.find_by_id(id).await {
            Ok(val) => val,
            Err(e) => {
                log::error!("[BowelFunctionUseCase::update] Record to update not found with id {}: {}", id, e);
                return Err(e);
            }
        };
        if entity.name.trim().is_empty() {
            let msg = "BowelFunction name is required".to_string();
            log::error!("[BowelFunctionUseCase::update] {}", msg);
            return Err(BusinessError::new(msg));
        }
        entity.id = Some(id);
        entity.uuid = existing.uuid;
        entity.created_at = existing.created_at;
        entity.created_by = existing.created_by;

        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| {
                let msg = format!("Failed to update bowel_function: {}", e);
                log::error!("[BowelFunctionUseCase::update] {}", msg);
                BusinessError::new(msg)
            })?;

        Ok(BowelFunctionEntityMapper::from_active_model(model))
    }

    pub async fn delete_by_id(&self, id: i32) -> Result<(), BusinessError> {
        log::info!("[BowelFunctionUseCase::delete_by_id] Executing delete for id: {}", id);
        self.gateway
            .delete_by_id(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[BowelFunctionUseCase::delete_by_id] {}", msg);
                BusinessError::new(msg)
            })?;
        Ok(())
    }
}
