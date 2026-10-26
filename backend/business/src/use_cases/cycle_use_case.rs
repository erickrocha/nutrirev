use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::domain::business_error::BusinessError;
use crate::domain::cycle::{Cycle, CycleEntityMapper};
use crate::gateway::cycle_gateway::CycleGateway;

pub struct CycleUseCase {
    gateway: CycleGateway,
}

impl CycleUseCase {
    pub fn new(gateway: CycleGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, mut entity: Cycle) -> Result<Cycle, BusinessError> {
        log::info!("[CycleUseCase::create] Executing for name: {}", entity.name);
        if entity.name.trim().is_empty() {
            let msg = "Cycle name is required".to_string();
            log::error!("[CycleUseCase::create] {}", msg);
            return Err(BusinessError::new(msg));
        }
        entity.id = None;
        let active = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[CycleUseCase::create] {}", msg);
                BusinessError::new(msg)
            })?;
        Ok(CycleEntityMapper::from_active_model(active))
    }

    pub async fn update(&self, id: i32, mut entity: Cycle) -> Result<Cycle, BusinessError> {
        log::info!("[CycleUseCase::update] Executing update for id {}: {}", id, entity.name);
        if entity.name.trim().is_empty() {
            let msg = "Cycle name is required".to_string();
            log::error!("[CycleUseCase::update] {}", msg);
            return Err(BusinessError::new(msg));
        }
        let existing = match self.find_by_id(id).await {
            Ok(val) => val,
            Err(e) => {
                log::error!("[CycleUseCase::update] Cycle to update not found with id {}: {}", id, e);
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
                log::error!("[CycleUseCase::update] {}", msg);
                BusinessError::new(msg)
            })?;
        Ok(CycleEntityMapper::from_active_model(active))
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Cycle, BusinessError> {
        log::info!("[CycleUseCase::find_by_id] Executing for id: {}", id);
        let model = self
            .gateway
            .find_by_id(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[CycleUseCase::find_by_id] {}", msg);
                BusinessError::new(msg)
            })?;
        match model {
            Some(m) => Ok(CycleEntityMapper::from_model(m)),
            None => {
                let msg = format!("Cycle not found with id: {}", id);
                log::error!("[CycleUseCase::find_by_id] {}", msg);
                Err(BusinessError::new("Cycle not found".to_string()))
            }
        }
    }

    pub async fn find_by_uuid(&self, uuid: String) -> Result<Cycle, BusinessError> {
        log::info!("[CycleUseCase::find_by_uuid] Executing for uuid: {}", uuid);
        let model = self
            .gateway
            .find_by_uuid(uuid.clone())
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[CycleUseCase::find_by_uuid] {}", msg);
                BusinessError::new(msg)
            })?;
        match model {
            Some(m) => Ok(CycleEntityMapper::from_model(m)),
            None => {
                let msg = format!("Cycle not found with uuid: {}", uuid);
                log::error!("[CycleUseCase::find_by_uuid] {}", msg);
                Err(BusinessError::new("Cycle not found".to_string()))
            }
        }
    }

    pub async fn find_all(&self) -> Result<Vec<Cycle>, BusinessError> {
        log::info!("[CycleUseCase::find_all] Executing find_all");
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[CycleUseCase::find_all] {}", msg);
                BusinessError::new(msg)
            })?;
        Ok(CycleEntityMapper::from_models(models))
    }

    pub async fn delete(&self, id: i32) -> Result<(), BusinessError> {
        log::info!("[CycleUseCase::delete] Executing delete for id: {}", id);
        self.gateway
            .delete_by_id(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error deleting cycle id {}: {}", id, e);
                log::error!("[CycleUseCase::delete] {}", msg);
                BusinessError::new(msg)
            })?;
        Ok(())
    }
}
