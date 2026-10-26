use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::domain::business_error::BusinessError;
use crate::domain::payment_date::{PaymentDate, PaymentDateEntityMapper};
use crate::gateway::billing_gateway::BillingGateway;
use crate::gateway::payment_date_gateway::PaymentDateGateway;
use crate::use_cases::payment_schedule_use_case::PaymentScheduleUseCase;

pub struct PaymentDateUseCase {
    gateway: PaymentDateGateway,
}

impl PaymentDateUseCase {
    pub fn new(gateway: PaymentDateGateway) -> Self {
        Self { gateway }
    }

    /// Opens (or re-opens) a customer's subscription from the clinic screen.
    ///
    /// Delegates to [`PaymentScheduleUseCase::start_subscription`] so the manual
    /// path and the customer-creation path produce identical rows: a validated,
    /// billable plan and a `next_due_date` the worker can act on.
    pub async fn create(&self, entity: PaymentDate) -> Result<PaymentDate, BusinessError> {
        log::info!(
            "[PaymentDateUseCase::create] Executing for customer_id: {:?}, clinical_plan_id: {:?}",
            entity.customer_id,
            entity.clinical_plan_id
        );

        let (Some(customer_id), Some(clinical_plan_id)) =
            (entity.customer_id, entity.clinical_plan_id)
        else {
            let msg = "Customer and clinical plan are required".to_string();
            log::error!("[PaymentDateUseCase::create] {}", msg);
            return Err(BusinessError::new(msg));
        };

        PaymentScheduleUseCase::start_subscription(
            self.gateway.db(),
            customer_id,
            clinical_plan_id,
            entity.first_due_date,
        )
        .await
    }

    pub async fn find_by_id(&self, id: i32) -> Result<PaymentDate, BusinessError> {
        log::info!("[PaymentDateUseCase::find_by_id] Executing for id: {}", id);
        let model = self.gateway.find_by_id(id).await.map_err(|e| {
            let msg = format!("Database error: {}", e);
            log::error!("[PaymentDateUseCase::find_by_id] {}", msg);
            BusinessError::new(msg)
        })?;

        match model {
            Some(val) => Ok(PaymentDateEntityMapper::from_model(val)),
            None => {
                let msg = format!("PaymentDate not found with id: {}", id);
                log::error!("[PaymentDateUseCase::find_by_id] {}", msg);
                Err(BusinessError::new("PaymentDate not found".to_string()))
            }
        }
    }

    pub async fn find_by_uuid(&self, uuid: String) -> Result<PaymentDate, BusinessError> {
        log::info!("[PaymentDateUseCase::find_by_uuid] Executing for uuid: {}", uuid);
        let model = self.gateway.find_by_uuid(uuid.clone()).await.map_err(|e| {
            let msg = format!("Database error: {}", e);
            log::error!("[PaymentDateUseCase::find_by_uuid] {}", msg);
            BusinessError::new(msg)
        })?;

        match model {
            Some(val) => Ok(PaymentDateEntityMapper::from_model(val)),
            None => {
                let msg = format!("PaymentDate not found with uuid: {}", uuid);
                log::error!("[PaymentDateUseCase::find_by_uuid] {}", msg);
                Err(BusinessError::new("PaymentDate not found".to_string()))
            }
        }
    }

    pub async fn find_all(&self, filter_customer_id: Option<i32>) -> Result<Vec<PaymentDate>, BusinessError> {
        log::info!(
            "[PaymentDateUseCase::find_all] Executing find_all (customer_id filter: {:?})",
            filter_customer_id
        );
        let models = self
            .gateway
            .find_all_for_customer(filter_customer_id)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[PaymentDateUseCase::find_all] {}", msg);
                BusinessError::new(msg)
            })?;

        Ok(PaymentDateEntityMapper::from_models(models))
    }

    pub async fn update(&self, id: i32, mut entity: PaymentDate) -> Result<PaymentDate, BusinessError> {
        log::info!("[PaymentDateUseCase::update] Executing update for id: {}", id);
        let existing = self.find_by_id(id).await?;

        entity.id = Some(id);
        entity.uuid = existing.uuid;
        entity.created_at = existing.created_at;
        entity.created_by = existing.created_by;
        entity.customer_id = existing.customer_id;
        entity.clinical_plan_id = existing.clinical_plan_id;
        // Carried forward with the rest of the server-owned state. Without this
        // a clinic correcting a due date would silently switch a patient off
        // automatic billing and orphan the card they consented to store.
        entity.billing_mode = existing.billing_mode.clone();
        entity.payment_token_id = existing.payment_token_id;
        // Same class of defect, and pre-existing: the mapper rebuilds `status`
        // as Active, so editing a cancelled subscription used to quietly revive it.
        entity.status = existing.status.clone();

        // Correcting the first due date should move the cycle with it, but only
        // while nothing has been billed yet — once a charge exists, its date is
        // what the customer was told to pay, and the cursor must stay put.
        let emitted = BillingGateway::last_cycle_number(self.gateway.db(), id)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[PaymentDateUseCase::update] {}", msg);
                BusinessError::new(msg)
            })?;
        entity.next_due_date = if emitted == 0 {
            Some(entity.first_due_date)
        } else {
            existing.next_due_date
        };

        let model = self.gateway.persist(entity).await.map_err(|e| {
            let msg = format!("Failed to update payment_date: {}", e);
            log::error!("[PaymentDateUseCase::update] {}", msg);
            BusinessError::new(msg)
        })?;

        Ok(PaymentDateEntityMapper::from_active_model(model))
    }

    pub async fn delete_by_id(&self, id: i32) -> Result<(), BusinessError> {
        log::info!("[PaymentDateUseCase::delete_by_id] Executing delete for id: {}", id);
        self.gateway.delete_by_id(id).await.map_err(|e| {
            let msg = format!("Database error: {}", e);
            log::error!("[PaymentDateUseCase::delete_by_id] {}", msg);
            BusinessError::new(msg)
        })?;
        Ok(())
    }
}
