use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::domain::activity_factor::{ActivityFactor, ActivityFactorEntityMapper};
use crate::domain::business_error::BusinessError;
use crate::gateway::activity_factor_gateway::ActivityFactorGateway;

pub struct ActivityFactorUseCase {
    gateway: ActivityFactorGateway,
}

impl ActivityFactorUseCase {
    pub fn new(gateway: ActivityFactorGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, entity: ActivityFactor) -> Result<ActivityFactor, BusinessError> {
        log::info!("[ActivityFactorUseCase::create] Executing for name: {}", entity.name);
        if entity.name.trim().is_empty() {
            let msg = "ActivityFactor name is required".to_string();
            log::error!("[ActivityFactorUseCase::create] {}", msg);
            return Err(BusinessError::new(msg));
        }
        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| {
                let msg = format!("Failed to persist activity_factor: {}", e);
                log::error!("[ActivityFactorUseCase::create] {}", msg);
                BusinessError::new(msg)
            })?;

        Ok(ActivityFactorEntityMapper::from_active_model(model))
    }

    pub async fn find_by_id(&self, id: i32) -> Result<ActivityFactor, BusinessError> {
        log::info!("[ActivityFactorUseCase::find_by_id] Executing for id: {}", id);
        let model = self
            .gateway
            .find_by_id(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[ActivityFactorUseCase::find_by_id] {}", msg);
                BusinessError::new(msg)
            })?;

        match model {
            Some(val) => Ok(ActivityFactorEntityMapper::from_model(val)),
            None => {
                let msg = format!("ActivityFactor not found with id: {}", id);
                log::error!("[ActivityFactorUseCase::find_by_id] {}", msg);
                Err(BusinessError::new("ActivityFactor not found".to_string()))
            }
        }
    }

    pub async fn find_by_uuid(&self, uuid: String) -> Result<ActivityFactor, BusinessError> {
        log::info!("[ActivityFactorUseCase::find_by_uuid] Executing for uuid: {}", uuid);
        let model = self
            .gateway
            .find_by_uuid(uuid.clone())
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[ActivityFactorUseCase::find_by_uuid] {}", msg);
                BusinessError::new(msg)
            })?;

        match model {
            Some(val) => Ok(ActivityFactorEntityMapper::from_model(val)),
            None => {
                let msg = format!("ActivityFactor not found with uuid: {}", uuid);
                log::error!("[ActivityFactorUseCase::find_by_uuid] {}", msg);
                Err(BusinessError::new("ActivityFactor not found".to_string()))
            }
        }
    }

    pub async fn find_all(&self) -> Result<Vec<ActivityFactor>, BusinessError> {
        log::info!("[ActivityFactorUseCase::find_all] Executing find_all");
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[ActivityFactorUseCase::find_all] {}", msg);
                BusinessError::new(msg)
            })?;

        Ok(ActivityFactorEntityMapper::from_models(models))
    }

    pub async fn update(&self, id: i32, mut entity: ActivityFactor) -> Result<ActivityFactor, BusinessError> {
        log::info!("[ActivityFactorUseCase::update] Executing update for id {}: {}", id, entity.name);
        let existing = match self.find_by_id(id).await {
            Ok(val) => val,
            Err(e) => {
                log::error!("[ActivityFactorUseCase::update] Record to update not found with id {}: {}", id, e);
                return Err(e);
            }
        };
        if entity.name.trim().is_empty() {
            let msg = "ActivityFactor name is required".to_string();
            log::error!("[ActivityFactorUseCase::update] {}", msg);
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
                let msg = format!("Failed to update activity_factor: {}", e);
                log::error!("[ActivityFactorUseCase::update] {}", msg);
                BusinessError::new(msg)
            })?;

        Ok(ActivityFactorEntityMapper::from_active_model(model))
    }

    pub async fn delete_by_id(&self, id: i32) -> Result<(), BusinessError> {
        log::info!("[ActivityFactorUseCase::delete_by_id] Executing delete for id: {}", id);
        self.gateway
            .delete_by_id(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[ActivityFactorUseCase::delete_by_id] {}", msg);
                BusinessError::new(msg)
            })?;
        Ok(())
    }
}
