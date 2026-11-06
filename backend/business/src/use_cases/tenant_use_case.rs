use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::domain::business_error::BusinessError;
use crate::domain::tenant::{Tenant, TenantEntityMapper};
use crate::gateway::tenant_gateway::TenantGateway;

/// Digits-only CPF/CNPJ, `None` when blank, error when the format or check digits are wrong.
pub fn normalized_tax_id(raw: Option<&str>) -> Result<Option<String>, BusinessError> {
    match raw.map(str::trim).filter(|value| !value.is_empty()) {
        None => Ok(None),
        Some(value) => crate::domain::tax_id::normalize(value)
            .map(Some)
            .ok_or_else(|| BusinessError::new("Tenant tax id is not a valid CPF or CNPJ".to_string())),
    }
}

fn valid_country_code(value: &Option<String>) -> bool {
    value.as_ref().is_none_or(|code| code.len() == 2 && code.chars().all(|c| c.is_ascii_alphabetic()))
}

pub struct TenantUseCase {
    gateway: TenantGateway,
}

impl TenantUseCase {
    pub fn new(gateway: TenantGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, mut tenant: Tenant) -> Result<Tenant, BusinessError> {
        log::info!("[TenantUseCase::create] Executing create tenant for name: {:?}", tenant.name);

        if tenant.name.as_ref().is_none_or(|n| n.trim().is_empty()) {
            let msg = "Tenant name is required".to_string();
            log::error!("[TenantUseCase::create] {}", msg);
            return Err(BusinessError::new(msg));
        }
        if !valid_country_code(&tenant.country_code) {
            return Err(BusinessError::new("Country code must contain two letters".to_string()));
        }
        tenant.tax_id = normalized_tax_id(tenant.tax_id.as_deref())?;

        let entity = self
            .gateway
            .persist(tenant)
            .await
            .map_err(|e| {
                let msg = format!("Failed to persist tenant: {}", e);
                log::error!("[TenantUseCase::create] {}", msg);
                BusinessError::new(msg)
            })?;

        Ok(TenantEntityMapper::from_active_model(entity))
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Tenant, BusinessError> {
        log::info!("[TenantUseCase::find_by_id] Executing for id: {}", id);

        let entity = self
            .gateway
            .find_by_id(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[TenantUseCase::find_by_id] {}", msg);
                BusinessError::new(msg)
            })?;

        match entity {
            Some(value) => Ok(TenantEntityMapper::from_model(value)),
            None => {
                let msg = format!("Tenant not found with id: {}", id);
                log::error!("[TenantUseCase::find_by_id] {}", msg);
                Err(BusinessError::new("Tenant not found".to_string()))
            }
        }
    }

    pub async fn find_by_uuid(&self, uuid: String) -> Result<Tenant, BusinessError> {
        log::info!("[TenantUseCase::find_by_uuid] Executing for uuid: {}", uuid);

        let entity = self
            .gateway
            .find_by_uuid(uuid.clone())
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[TenantUseCase::find_by_uuid] {}", msg);
                BusinessError::new(msg)
            })?;

        match entity {
            Some(value) => Ok(TenantEntityMapper::from_model(value)),
            None => {
                let msg = format!("Tenant not found with uuid: {}", uuid);
                log::error!("[TenantUseCase::find_by_uuid] {}", msg);
                Err(BusinessError::new("Tenant not found".to_string()))
            }
        }
    }

    pub async fn find_all(&self) -> Result<Vec<Tenant>, BusinessError> {
        log::info!("[TenantUseCase::find_all] Executing find_all tenants");

        let entities = self
            .gateway
            .find_all()
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[TenantUseCase::find_all] {}", msg);
                BusinessError::new(msg)
            })?;

        Ok(TenantEntityMapper::from_models(entities))
    }

    pub async fn update(&self, id: i32, mut tenant: Tenant) -> Result<Tenant, BusinessError> {
        log::info!("[TenantUseCase::update] Executing update for id {}: {:?}", id, tenant.name);

        let existing = match self.find_by_id(id).await {
            Ok(t) => t,
            Err(e) => {
                log::error!("[TenantUseCase::update] Tenant to update not found with id {}: {}", id, e);
                return Err(e);
            }
        };

        if tenant.name.as_ref().is_none_or(|n| n.trim().is_empty()) {
            let msg = "Tenant name is required".to_string();
            log::error!("[TenantUseCase::update] {}", msg);
            return Err(BusinessError::new(msg));
        }
        if !valid_country_code(&tenant.country_code) {
            return Err(BusinessError::new("Country code must contain two letters".to_string()));
        }
        tenant.tax_id = normalized_tax_id(tenant.tax_id.as_deref())?;
        if tenant.payment_grace_days.is_some_and(|days| days < 0) {
            return Err(BusinessError::new("Payment grace days cannot be negative".to_string()));
        }

        let updated_tenant = Tenant {
            id: Some(id),
            uuid: existing.uuid,
            name: tenant.name,
            tax_id: tenant.tax_id,
            email: tenant.email,
            phone: tenant.phone,
            address_line1: tenant.address_line1,
            address_line2: tenant.address_line2,
            locality: tenant.locality,
            administrative_area: tenant.administrative_area,
            postal_code: tenant.postal_code,
            country_code: tenant.country_code,
            // Omitting the field keeps the clinic's current grace rather than
            // silently resetting it to the column default.
            payment_grace_days: tenant.payment_grace_days.or(existing.payment_grace_days),
            created_at: existing.created_at,
            created_by: existing.created_by,
            updated_at: None,
            updated_by: tenant.updated_by,
        };

        let entity = self
            .gateway
            .persist(updated_tenant)
            .await
            .map_err(|e| {
                let msg = format!("Failed to update tenant: {}", e);
                log::error!("[TenantUseCase::update] {}", msg);
                BusinessError::new(msg)
            })?;

        Ok(TenantEntityMapper::from_active_model(entity))
    }

    pub async fn persist(&self, tenant: Tenant) -> Option<Tenant> {
        log::info!("[TenantUseCase::persist] Executing persist tenant: {:?}", tenant.name);
        self.create(tenant).await.ok()
    }
}
