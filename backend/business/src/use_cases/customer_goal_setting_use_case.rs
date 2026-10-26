use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::domain::business_error::BusinessError;
use crate::domain::customer_goal_setting::{CustomerGoalSetting, CustomerGoalSettingEntityMapper};
use crate::gateway::customer_goal_setting_gateway::CustomerGoalSettingGateway;

pub struct CustomerGoalSettingUseCase {
    gateway: CustomerGoalSettingGateway,
}

impl CustomerGoalSettingUseCase {
    pub fn new(gateway: CustomerGoalSettingGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, entity: CustomerGoalSetting) -> Result<CustomerGoalSetting, BusinessError> {
        log::info!("[CustomerGoalSettingUseCase::create] Executing for name: {}", entity.name);
        if entity.name.trim().is_empty() {
            let msg = "CustomerGoalSetting name is required".to_string();
            log::error!("[CustomerGoalSettingUseCase::create] {}", msg);
            return Err(BusinessError::new(msg));
        }
        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| {
                let msg = format!("Failed to persist customer_goal_setting: {}", e);
                log::error!("[CustomerGoalSettingUseCase::create] {}", msg);
                BusinessError::new(msg)
            })?;

        Ok(CustomerGoalSettingEntityMapper::from_active_model(model))
    }

    pub async fn find_by_id(&self, id: i32) -> Result<CustomerGoalSetting, BusinessError> {
        log::info!("[CustomerGoalSettingUseCase::find_by_id] Executing for id: {}", id);
        let model = self
            .gateway
            .find_by_id(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[CustomerGoalSettingUseCase::find_by_id] {}", msg);
                BusinessError::new(msg)
            })?;

        match model {
            Some(val) => Ok(CustomerGoalSettingEntityMapper::from_model(val)),
            None => {
                let msg = format!("CustomerGoalSetting not found with id: {}", id);
                log::error!("[CustomerGoalSettingUseCase::find_by_id] {}", msg);
                Err(BusinessError::new("CustomerGoalSetting not found".to_string()))
            }
        }
    }

    pub async fn find_by_uuid(&self, uuid: String) -> Result<CustomerGoalSetting, BusinessError> {
        log::info!("[CustomerGoalSettingUseCase::find_by_uuid] Executing for uuid: {}", uuid);
        let model = self
            .gateway
            .find_by_uuid(uuid.clone())
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[CustomerGoalSettingUseCase::find_by_uuid] {}", msg);
                BusinessError::new(msg)
            })?;

        match model {
            Some(val) => Ok(CustomerGoalSettingEntityMapper::from_model(val)),
            None => {
                let msg = format!("CustomerGoalSetting not found with uuid: {}", uuid);
                log::error!("[CustomerGoalSettingUseCase::find_by_uuid] {}", msg);
                Err(BusinessError::new("CustomerGoalSetting not found".to_string()))
            }
        }
    }

    pub async fn find_all(&self) -> Result<Vec<CustomerGoalSetting>, BusinessError> {
        log::info!("[CustomerGoalSettingUseCase::find_all] Executing find_all");
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[CustomerGoalSettingUseCase::find_all] {}", msg);
                BusinessError::new(msg)
            })?;

        Ok(CustomerGoalSettingEntityMapper::from_models(models))
    }

    pub async fn update(&self, id: i32, mut entity: CustomerGoalSetting) -> Result<CustomerGoalSetting, BusinessError> {
        log::info!("[CustomerGoalSettingUseCase::update] Executing update for id {}: {}", id, entity.name);
        let existing = match self.find_by_id(id).await {
            Ok(val) => val,
            Err(e) => {
                log::error!("[CustomerGoalSettingUseCase::update] Record to update not found with id {}: {}", id, e);
                return Err(e);
            }
        };
        if entity.name.trim().is_empty() {
            let msg = "CustomerGoalSetting name is required".to_string();
            log::error!("[CustomerGoalSettingUseCase::update] {}", msg);
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
                let msg = format!("Failed to update customer_goal_setting: {}", e);
                log::error!("[CustomerGoalSettingUseCase::update] {}", msg);
                BusinessError::new(msg)
            })?;

        Ok(CustomerGoalSettingEntityMapper::from_active_model(model))
    }

    pub async fn delete_by_id(&self, id: i32) -> Result<(), BusinessError> {
        log::info!("[CustomerGoalSettingUseCase::delete_by_id] Executing delete for id: {}", id);
        self.gateway
            .delete_by_id(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[CustomerGoalSettingUseCase::delete_by_id] {}", msg);
                BusinessError::new(msg)
            })?;
        Ok(())
    }
}
