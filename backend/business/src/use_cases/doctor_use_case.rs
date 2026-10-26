use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::domain::business_error::BusinessError;
use crate::domain::doctor::{Doctor, DoctorEntityMapper};
use crate::gateway::doctor_gateway::DoctorGateway;

pub struct DoctorUseCase {
    gateway: DoctorGateway,
}

impl DoctorUseCase {
    pub fn new(gateway: DoctorGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, entity: Doctor) -> Result<Doctor, BusinessError> {
        log::info!("[DoctorUseCase::create] Executing for name: {}", entity.name);

        if entity.name.trim().is_empty() {
            let msg = "Doctor name cannot be empty".to_string();
            log::error!("[DoctorUseCase::create] {}", msg);
            return Err(BusinessError::new(msg));
        }

        let model = self.gateway.persist(entity).await.map_err(|e| {
            let msg = format!("Failed to persist doctor: {}", e);
            log::error!("[DoctorUseCase::create] {}", msg);
            BusinessError::new(msg)
        })?;

        Ok(DoctorEntityMapper::from_active_model(model))
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Doctor, BusinessError> {
        log::info!("[DoctorUseCase::find_by_id] Executing for id: {}", id);
        let model = self.gateway.find_by_id(id).await.map_err(|e| {
            let msg = format!("Database error: {}", e);
            log::error!("[DoctorUseCase::find_by_id] {}", msg);
            BusinessError::new(msg)
        })?;

        match model {
            Some(val) => Ok(DoctorEntityMapper::from_model(val)),
            None => {
                let msg = format!("Doctor not found with id: {}", id);
                log::error!("[DoctorUseCase::find_by_id] {}", msg);
                Err(BusinessError::new("Doctor not found".to_string()))
            }
        }
    }

    pub async fn find_by_uuid(&self, uuid: String) -> Result<Doctor, BusinessError> {
        log::info!("[DoctorUseCase::find_by_uuid] Executing for uuid: {}", uuid);
        let model = self.gateway.find_by_uuid(uuid.clone()).await.map_err(|e| {
            let msg = format!("Database error: {}", e);
            log::error!("[DoctorUseCase::find_by_uuid] {}", msg);
            BusinessError::new(msg)
        })?;

        match model {
            Some(val) => Ok(DoctorEntityMapper::from_model(val)),
            None => {
                let msg = format!("Doctor not found with uuid: {}", uuid);
                log::error!("[DoctorUseCase::find_by_uuid] {}", msg);
                Err(BusinessError::new("Doctor not found".to_string()))
            }
        }
    }

    pub async fn find_all(&self) -> Result<Vec<Doctor>, BusinessError> {
        log::info!("[DoctorUseCase::find_all] Executing find_all");
        let models = self.gateway.find_all().await.map_err(|e| {
            let msg = format!("Database error: {}", e);
            log::error!("[DoctorUseCase::find_all] {}", msg);
            BusinessError::new(msg)
        })?;

        Ok(DoctorEntityMapper::from_models(models))
    }

    pub async fn find_all_by_tenant_id(&self, tenant_id: i32) -> Result<Vec<Doctor>, BusinessError> {
        log::info!("[DoctorUseCase::find_all_by_tenant_id] Executing for tenant_id: {}", tenant_id);
        let models = self.gateway.find_all_by_tenant_id(tenant_id).await.map_err(|e| {
            let msg = format!("Database error: {}", e);
            log::error!("[DoctorUseCase::find_all_by_tenant_id] {}", msg);
            BusinessError::new(msg)
        })?;

        Ok(DoctorEntityMapper::from_models(models))
    }

    pub async fn update(&self, id: i32, mut entity: Doctor) -> Result<Doctor, BusinessError> {
        log::info!("[DoctorUseCase::update] Executing update for id: {}", id);
        if entity.name.trim().is_empty() {
            let msg = "Doctor name cannot be empty".to_string();
            log::error!("[DoctorUseCase::update] {}", msg);
            return Err(BusinessError::new(msg));
        }

        let existing = self.find_by_id(id).await?;

        entity.id = Some(id);
        entity.uuid = existing.uuid;
        entity.created_at = existing.created_at;
        entity.created_by = existing.created_by;

        let model = self.gateway.persist(entity).await.map_err(|e| {
            let msg = format!("Failed to update doctor: {}", e);
            log::error!("[DoctorUseCase::update] {}", msg);
            BusinessError::new(msg)
        })?;

        Ok(DoctorEntityMapper::from_active_model(model))
    }

    pub async fn delete_by_id(&self, id: i32) -> Result<(), BusinessError> {
        log::info!("[DoctorUseCase::delete_by_id] Executing delete for id: {}", id);
        self.find_by_id(id).await?;
        self.gateway.delete_by_id(id).await.map_err(|e| {
            let msg = format!("Database error: {}", e);
            log::error!("[DoctorUseCase::delete_by_id] {}", msg);
            BusinessError::new(msg)
        })?;
        Ok(())
    }
}
