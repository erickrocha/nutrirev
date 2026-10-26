use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::domain::business_error::BusinessError;
use crate::domain::customer::{Customer, CustomerEntityMapper};
use crate::gateway::customer_gateway::CustomerGateway;
use crate::use_cases::account_invite_use_case::AccountInviteUseCase;
use crate::use_cases::image_storage_use_case::ImageStorageUseCase;
use crate::use_cases::payment_schedule_use_case::PaymentScheduleUseCase;
use chrono::{Months, NaiveDate, Utc};
use entity::{account_deletion_entity, ai_usage_daily_entity, customer_entity, meal_log_entity, user_entity};
use sea_orm::sea_query::Expr;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbConn, EntityTrait, QueryFilter, Set, TransactionTrait,
    TryIntoModel,
};
use uuid::Uuid;

/// Prazo mínimo de guarda de prontuário de paciente — Lei 13.787/2018, art. 6º,
/// contado do último registro. Quem tem o dever é a clínica; o produto só precisa
/// saber até quando não pode expurgar.
const CLINICAL_RECORD_RETENTION_YEARS: u32 = 20;

/// Comprovante devolvido ao titular: o que o app precisa para dizer, na tela, o
/// que foi apagado e o que a clínica retém, por quanto tempo.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccountDeletionReceipt {
    pub retention_until: NaiveDate,
    pub already_requested: bool,
}

/// Validated, digits-only tax id, or `None` when the customer has not given one.
///
/// Blank is treated as absent rather than invalid: the field is optional at
/// registration and only becomes required at checkout, where the payment path
/// demands it.
fn normalized_tax_id(raw: Option<&str>) -> Result<Option<String>, BusinessError> {
    match raw.map(str::trim).filter(|value| !value.is_empty()) {
        None => Ok(None),
        Some(value) => crate::domain::tax_id::normalize(value)
            .map(Some)
            .ok_or_else(|| BusinessError::new("Customer tax id is not a valid CPF or CNPJ".to_string())),
    }
}

fn valid_country_code(value: &Option<String>) -> bool {
    value.as_ref().is_none_or(|code| code.len() == 2 && code.chars().all(|c| c.is_ascii_alphabetic()))
}

pub struct CustomerUseCase {
    gateway: CustomerGateway,
}

impl CustomerUseCase {
    pub fn new(gateway: CustomerGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(&self, mut entity: Customer) -> Result<Customer, BusinessError> {
        log::info!("[CustomerUseCase::create] Executing create customer with email: {}", entity.email);
        if entity.name.trim().is_empty() {
            let msg = "Customer name is required".to_string();
            log::error!("[CustomerUseCase::create] {}", msg);
            return Err(BusinessError::new(msg));
        }
        let email_trimmed = entity.email.trim();
        if email_trimmed.is_empty() {
            let msg = "Customer email is required".to_string();
            log::error!("[CustomerUseCase::create] {}", msg);
            return Err(BusinessError::new(msg));
        }
        if !valid_country_code(&entity.country_code) {
            return Err(BusinessError::new("Country code must contain two letters".to_string()));
        }

        entity.tax_id = match normalized_tax_id(entity.tax_id.as_deref()) {
            Ok(value) => value,
            Err(e) => {
                log::error!("[CustomerUseCase::{}] {}", "create", e.message);
                return Err(e);
            }
        };

        if let Ok(Some(_)) = self.gateway.find_by_email(email_trimmed).await {
            let msg = "Customer with this email already exists".to_string();
            log::error!("[CustomerUseCase::create] {}", msg);
            return Err(BusinessError::new(msg));
        }

        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| {
                let msg = format!("Failed to persist customer: {}", e);
                log::error!("[CustomerUseCase::create] {}", msg);
                BusinessError::new(msg)
            })?;

        let created = CustomerEntityMapper::from_active_model(model);

        // Selecting a plan starts the billing cycle, first payment today. A plan
        // that cannot be billed (no price, no renewal period) is reported and
        // skipped rather than thrown away with the customer record — the clinic
        // fixes the plan and opens the subscription from the payment screen.
        if let (Some(customer_id), Some(clinical_plan_id)) =
            (created.id, created.clinical_plan_id)
        {
            if let Err(e) = PaymentScheduleUseCase::start_subscription(
                self.gateway.db(),
                customer_id,
                clinical_plan_id,
                chrono::Utc::now().date_naive(),
            )
            .await
            {
                log::warn!(
                    "[CustomerUseCase::create] Customer {} created without a billing subscription: {}",
                    customer_id,
                    e.message
                );
            }
        }

        Ok(created)
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Customer, BusinessError> {
        log::info!("[CustomerUseCase::find_by_id] Executing for id: {}", id);
        let model = self
            .gateway
            .find_by_id(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[CustomerUseCase::find_by_id] {}", msg);
                BusinessError::new(msg)
            })?;

        match model {
            Some(val) => Ok(CustomerEntityMapper::from_model(val)),
            None => {
                let msg = format!("Customer not found with id: {}", id);
                log::error!("[CustomerUseCase::find_by_id] {}", msg);
                Err(BusinessError::new("Customer not found".to_string()))
            }
        }
    }

    pub async fn find_by_uuid(&self, uuid: String) -> Result<Customer, BusinessError> {
        log::info!("[CustomerUseCase::find_by_uuid] Executing for uuid: {}", uuid);
        let model = self
            .gateway
            .find_by_uuid(uuid.clone())
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[CustomerUseCase::find_by_uuid] {}", msg);
                BusinessError::new(msg)
            })?;

        match model {
            Some(val) => Ok(CustomerEntityMapper::from_model(val)),
            None => {
                let msg = format!("Customer not found with uuid: {}", uuid);
                log::error!("[CustomerUseCase::find_by_uuid] {}", msg);
                Err(BusinessError::new("Customer not found".to_string()))
            }
        }
    }

    pub async fn find_by_user_id(&self, user_id: i32) -> Result<Customer, BusinessError> {
        log::info!("[CustomerUseCase::find_by_user_id] Executing for user_id: {}", user_id);
        let model = self
            .gateway
            .find_by_user_id(user_id)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[CustomerUseCase::find_by_user_id] {}", msg);
                BusinessError::new(msg)
            })?;

        match model {
            Some(val) => Ok(CustomerEntityMapper::from_model(val)),
            None => {
                let msg = format!("Customer associated with user_id {} was not found", user_id);
                log::error!("[CustomerUseCase::find_by_user_id] {}", msg);
                Err(BusinessError::new("Customer associated with this user was not found".to_string()))
            }
        }
    }

    pub async fn find_by_email(&self, email: String) -> Result<Customer, BusinessError> {
        log::info!("[CustomerUseCase::find_by_email] Executing for email: {}", email);
        let model = self
            .gateway
            .find_by_email(&email)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[CustomerUseCase::find_by_email] {}", msg);
                BusinessError::new(msg)
            })?;

        match model {
            Some(val) => Ok(CustomerEntityMapper::from_model(val)),
            None => {
                let msg = format!("Customer with email {} was not found", email);
                log::error!("[CustomerUseCase::find_by_email] {}", msg);
                Err(BusinessError::new("Customer with this email was not found".to_string()))
            }
        }
    }

    pub async fn find_all(&self) -> Result<Vec<Customer>, BusinessError> {
        log::info!("[CustomerUseCase::find_all] Executing find_all customers");
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[CustomerUseCase::find_all] {}", msg);
                BusinessError::new(msg)
            })?;

        Ok(CustomerEntityMapper::from_models(models))
    }

    pub async fn update(&self, id: i32, mut entity: Customer) -> Result<Customer, BusinessError> {
        log::info!("[CustomerUseCase::update] Executing update for customer id {}: {}", id, entity.name);
        let existing = match self.find_by_id(id).await {
            Ok(c) => c,
            Err(e) => {
                log::error!("[CustomerUseCase::update] Customer to update not found with id {}: {}", id, e);
                return Err(e);
            }
        };

        if entity.name.trim().is_empty() {
            let msg = "Customer name is required".to_string();
            log::error!("[CustomerUseCase::update] {}", msg);
            return Err(BusinessError::new(msg));
        }
        let email_trimmed = entity.email.trim();
        if email_trimmed.is_empty() {
            let msg = "Customer email is required".to_string();
            log::error!("[CustomerUseCase::update] {}", msg);
            return Err(BusinessError::new(msg));
        }
        if !valid_country_code(&entity.country_code) {
            return Err(BusinessError::new("Country code must contain two letters".to_string()));
        }

        if let Ok(Some(existing_email_owner)) = self.gateway.find_by_email(email_trimmed).await {
            if existing_email_owner.id != id {
                let msg = "Customer with this email already exists".to_string();
                log::error!("[CustomerUseCase::update] {}", msg);
                return Err(BusinessError::new(msg));
            }
        }

        entity.tax_id = match normalized_tax_id(entity.tax_id.as_deref()) {
            Ok(value) => value,
            Err(e) => {
                log::error!("[CustomerUseCase::{}] {}", "update", e.message);
                return Err(e);
            }
        };

        entity.id = Some(id);
        entity.uuid = existing.uuid;
        // Provider state, like uuid and user_id: owned by the server, never
        // taken from the request body.
        entity.provider_customer_id = existing.provider_customer_id;
        entity.photo = existing.photo;
        entity.photo_base64 = existing.photo_base64;
        entity.user_id = existing.user_id;
        entity.created_at = existing.created_at;
        entity.created_by = existing.created_by;

        let model = self
            .gateway
            .persist(entity)
            .await
            .map_err(|e| {
                let msg = format!("Failed to update customer: {}", e);
                log::error!("[CustomerUseCase::update] {}", msg);
                BusinessError::new(msg)
            })?;

        Ok(CustomerEntityMapper::from_active_model(model))
    }

    pub async fn delete_by_id(&self, id: i32) -> Result<(), BusinessError> {
        log::info!("[CustomerUseCase::delete_by_id] Executing delete for id: {}", id);
        self.gateway
            .delete_by_id(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[CustomerUseCase::delete_by_id] {}", msg);
                BusinessError::new(msg)
            })?;
        Ok(())
    }

    pub async fn enable_mobile(&self,id: i32,user_gateway: &crate::gateway::user_gateway::UserGateway) -> Result<Customer, BusinessError> {
        log::info!("[CustomerUseCase::enable_mobile] Executing enable_mobile for customer id: {}", id);
        let mut customer = match self.find_by_id(id).await {
            Ok(c) => c,
            Err(e) => {
                log::error!("[CustomerUseCase::enable_mobile] Failed to find customer id {}: {}", id, e);
                return Err(e);
            }
        };

        // Check if User account already exists for customer email
        let existing_user = crate::gateway::user_gateway::UserGateway::find_by_email(self.gateway.db(), customer.email.clone())
            .await
            .map_err(|e| {
                let msg = format!("Database error checking user email: {}", e);
                log::error!("[CustomerUseCase::enable_mobile] {}", msg);
                BusinessError::new(msg)
            })?;

        let user_id = if let Some(u) = existing_user {
            u.id
        } else {
            // A conta nasce com um segredo aleatório que ninguém conhece — nem a
            // clínica. O caminho para dentro é o convite de uso único emitido por
            // `AccountInviteUseCase`, e não uma senha padrão compartilhada entre
            // todos os pacientes.
            let hashed_password = bcrypt::hash(
                AccountInviteUseCase::unguessable_secret(),
                bcrypt::DEFAULT_COST,
            )
            .map_err(|e| {
                let msg = format!("Failed to hash provisioning secret: {}", e);
                log::error!("[CustomerUseCase::enable_mobile] {}", msg);
                BusinessError::new(msg)
            })?;

            let new_user = crate::domain::user::User {
                id: None,
                uuid: None,
                tenant_id: customer.tenant_id,
                name: Some(customer.name.clone()),
                email: customer.email.clone(),
                password: hashed_password,
                role: crate::domain::enums::Role::User,
                enabled: true,
                first_login: true,
                created_at: None,
                updated_at: None,
                created_by: Some("system".to_string()),
                updated_by: None,
            };

            let created_user_active_model = user_gateway
                .persist(new_user)
                .await
                .map_err(|e| {
                    let msg = format!("Failed to provision user for mobile access: {}", e);
                    log::error!("[CustomerUseCase::enable_mobile] {}", msg);
                    BusinessError::new(msg)
                })?;

            let model: entity::user_entity::Model = created_user_active_model
                .try_into_model()
                .map_err(|e| {
                    let msg = format!("Failed to parse created user model: {}", e);
                    log::error!("[CustomerUseCase::enable_mobile] {}", msg);
                    BusinessError::new(msg)
                })?;
            model.id
        };

        customer.user_id = Some(user_id);
        customer.mobile_enabled = Some(true);

        let updated_model = self
            .gateway
            .persist(customer.clone())
            .await
            .map_err(|e| {
                let msg = format!("Failed to enable mobile on customer: {}", e);
                log::error!("[CustomerUseCase::enable_mobile] {}", msg);
                BusinessError::new(msg)
            })?;

        Ok(CustomerEntityMapper::from_active_model(updated_model))
    }

    /// Atende ao pedido de exclusão de conta do próprio titular.
    ///
    /// Encerra o **acesso** e apaga tudo que não está sob dever de guarda; o
    /// **registro nutricional** (refeições, medidas, condições clínicas) fica
    /// retido em nome da clínica, que é a controladora e tem obrigação legal de
    /// guardá-lo — LGPD art. 16, I combinado com a Lei 13.787/2018. É essa
    /// separação que permite cumprir a exigência de exclusão de conta da Apple
    /// (5.1.1(v)) e do Google Play sem violar o dever de guarda do prontuário.
    ///
    /// Idempotente: pedir duas vezes devolve o mesmo comprovante.
    pub async fn delete_account(
        &self,
        db: &DbConn,
        customer_id: i32,
    ) -> Result<AccountDeletionReceipt, BusinessError> {
        log::info!("[CustomerUseCase::delete_account] Executing delete_account for customer_id: {}", customer_id);

        let customer = customer_entity::Entity::find_by_id(customer_id)
            .one(db)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to load customer: {}", e)))?
            .ok_or_else(|| BusinessError::new("Customer not found".to_string()))?;

        if let Some(existing) = account_deletion_entity::Entity::find()
            .filter(account_deletion_entity::Column::CustomerId.eq(customer_id))
            .one(db)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to check deletion request: {}", e)))?
        {
            return Ok(AccountDeletionReceipt {
                retention_until: existing.retention_until,
                already_requested: true,
            });
        }

        let today = Utc::now().date_naive();
        let retention_until = today
            .checked_add_months(Months::new(12 * CLINICAL_RECORD_RETENTION_YEARS))
            .ok_or_else(|| BusinessError::new("Failed to compute retention deadline".to_string()))?;

        // Chaves de imagem coletadas antes da transação: o S3 não participa dela.
        let profile_photo_key = customer.photo.clone();
        let meal_photos = meal_log_entity::Entity::find()
            .filter(meal_log_entity::Column::CustomerId.eq(customer_id))
            .filter(meal_log_entity::Column::Photo.is_not_null())
            .all(db)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to load meal photos: {}", e)))?;
        let meal_photo_keys: Vec<String> =
            meal_photos.iter().filter_map(|log| log.photo.clone()).collect();

        let txn = db
            .begin()
            .await
            .map_err(|e| BusinessError::new(format!("Failed to start deletion transaction: {}", e)))?;

        if let Some(user_id) = customer.user_id {
            // A credencial morre aqui: conta desabilitada, e-mail substituído por
            // lápide (libera o endereço real e remove o dado pessoal) e senha
            // trocada por valor aleatório que ninguém conhece.
            let tombstone = format!("deleted-{}@invalid", Uuid::new_v4());
            let scrambled = bcrypt::hash(Uuid::new_v4().to_string(), bcrypt::DEFAULT_COST)
                .map_err(|e| BusinessError::new(format!("Failed to scramble credential: {}", e)))?;

            let mut user: user_entity::ActiveModel = user_entity::Entity::find_by_id(user_id)
                .one(&txn)
                .await
                .map_err(|e| BusinessError::new(format!("Failed to load user: {}", e)))?
                .ok_or_else(|| BusinessError::new("Linked user not found".to_string()))?
                .into();
            user.enabled = Set(false);
            user.email = Set(tombstone);
            user.password = Set(scrambled);
            user.update(&txn)
                .await
                .map_err(|e| BusinessError::new(format!("Failed to disable user: {}", e)))?;

            ai_usage_daily_entity::Entity::delete_many()
                .filter(ai_usage_daily_entity::Column::UserId.eq(user_id))
                .exec(&txn)
                .await
                .map_err(|e| BusinessError::new(format!("Failed to delete AI usage: {}", e)))?;
        }

        let mut target: customer_entity::ActiveModel = customer.clone().into();
        target.user_id = Set(None);
        target.mobile_enabled = Set(false);
        target.photo = Set(None);
        target.photo_base64 = Set(None);
        target
            .update(&txn)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to detach customer account: {}", e)))?;

        // O registro nutricional permanece; só a imagem sai, porque a foto não é
        // parte do prontuário exigido e é o dado de maior exposição.
        meal_log_entity::Entity::update_many()
            .col_expr(meal_log_entity::Column::Photo, Expr::value(Option::<String>::None))
            .filter(meal_log_entity::Column::CustomerId.eq(customer_id))
            .exec(&txn)
            .await
            .map_err(|e| BusinessError::new(format!("Failed to clear meal photos: {}", e)))?;

        account_deletion_entity::ActiveModel {
            customer_id: Set(customer_id),
            tenant_id: Set(customer.tenant_id),
            requested_at: Set(Utc::now()),
            retention_until: Set(retention_until),
            ..Default::default()
        }
        .insert(&txn)
        .await
        .map_err(|e| BusinessError::new(format!("Failed to record deletion request: {}", e)))?;

        txn.commit()
            .await
            .map_err(|e| BusinessError::new(format!("Failed to commit deletion: {}", e)))?;

        // ponytail: S3 é best-effort e fora da transação — o banco já é a fonte da
        // verdade e o pedido está registrado. Objeto órfão que sobrar aqui é varrido
        // pela regra de ciclo de vida do bucket.
        for key in profile_photo_key.into_iter().chain(meal_photo_keys) {
            if let Err(e) = ImageStorageUseCase::delete_object(&key).await {
                log::warn!("[CustomerUseCase::delete_account] Failed to delete S3 object {}: {}", key, e);
            }
        }

        log::info!("[CustomerUseCase::delete_account] Account deleted for customer_id: {}, clinical record retained until {}", customer_id, retention_until);
        Ok(AccountDeletionReceipt {
            retention_until,
            already_requested: false,
        })
    }

    /// Uploads customer profile photo to S3, updates customer.photo in database with S3 object key,
    /// and returns the updated customer together with a generated CloudFront signed URL.
    pub async fn update_profile_photo(
        &self,
        customer_id: i32,
        image_bytes: Vec<u8>,
        file_extension: &str,
        content_type: &str,
    ) -> Result<(Customer, String), BusinessError> {
        log::info!("[CustomerUseCase::update_profile_photo] Executing update_profile_photo for customer_id: {}", customer_id);
        let mut customer = match self.find_by_id(customer_id).await {
            Ok(c) => c,
            Err(e) => {
                log::error!("[CustomerUseCase::update_profile_photo] Failed to find customer_id {}: {}", customer_id, e);
                return Err(e);
            }
        };

        if crate::use_cases::image_storage_use_case::ImageStorageUseCase::get_storage_mode()
            == crate::use_cases::image_storage_use_case::StorageMode::Base64
        {
            use base64::Engine;
            let b64_str = base64::engine::general_purpose::STANDARD.encode(&image_bytes);
            let data_url = format!("data:{};base64,{}", content_type, b64_str);
            customer.photo_base64 = Some(data_url.as_bytes().to_vec());

            let updated_model = self
                .gateway
                .persist(customer)
                .await
                .map_err(|e| {
                    let msg = format!("Failed to save photo base64 in database: {}", e);
                    log::error!("[CustomerUseCase::update_profile_photo] {}", msg);
                    BusinessError::new(msg)
                })?;

            let updated_customer = CustomerEntityMapper::from_active_model(updated_model);
            return Ok((updated_customer, data_url));
        }

        // 1. Generate object key (uploads/customer-{id}/{uuid}.{ext})
        let object_key = ImageStorageUseCase::generate_customer_object_key(customer_id, file_extension);

        // 2. Upload image to S3 (LocalStack in dev or AWS S3 in prod)
        if let Err(e) = ImageStorageUseCase::upload_object(&object_key, image_bytes, content_type).await {
            log::error!("[CustomerUseCase::update_profile_photo] Failed to upload object to S3: {}", e);
            return Err(e);
        }

        // 3. Save object key in database
        customer.photo = Some(object_key.clone());
        let updated_model = self
            .gateway
            .persist(customer)
            .await
            .map_err(|e| {
                let msg = format!("Failed to save photo key in database: {}", e);
                log::error!("[CustomerUseCase::update_profile_photo] {}", msg);
                BusinessError::new(msg)
            })?;

        let updated_customer = CustomerEntityMapper::from_active_model(updated_model);

        // 4. Generate CloudFront signed URL
        let signed_url = match ImageStorageUseCase::generate_cloudfront_signed_url(&object_key) {
            Ok(url) => url,
            Err(e) => {
                log::error!("[CustomerUseCase::update_profile_photo] Failed to generate CloudFront signed URL: {}", e);
                return Err(e);
            }
        };

        Ok((updated_customer, signed_url))
    }

    /// Generates a Pre-Signed S3 PUT URL for uploading customer profile photo directly from frontend.
    pub async fn generate_photo_presigned_url(
        &self,
        customer_id: i32,
        file_extension: &str,
        content_type: &str,
    ) -> Result<(String, String), BusinessError> {
        log::info!("[CustomerUseCase::generate_photo_presigned_url] Generating presigned upload URL for customer_id: {}", customer_id);
        // Verify customer exists
        let _ = self.find_by_id(customer_id).await?;
        ImageStorageUseCase::generate_presigned_upload_url("customer", customer_id, file_extension, content_type).await
    }

    /// Confirms photo upload: updates customer.photo with object_key and returns updated Customer + CloudFront URL.
    pub async fn confirm_photo_upload(
        &self,
        customer_id: i32,
        object_key: String,
    ) -> Result<(Customer, String), BusinessError> {
        log::info!("[CustomerUseCase::confirm_photo_upload] Confirming photo upload for customer_id: {}, key: {}", customer_id, object_key);
        ImageStorageUseCase::verify_object_exists(&object_key).await?;
        let mut customer = self.find_by_id(customer_id).await?;

        customer.photo = Some(object_key.clone());
        let updated_model = self
            .gateway
            .persist(customer)
            .await
            .map_err(|e| {
                let msg = format!("Failed to save photo key in database: {}", e);
                log::error!("[CustomerUseCase::confirm_photo_upload] {}", msg);
                BusinessError::new(msg)
            })?;

        let updated_customer = CustomerEntityMapper::from_active_model(updated_model);
        let signed_url = ImageStorageUseCase::generate_cloudfront_signed_url(&object_key)?;
        Ok((updated_customer, signed_url))
    }
}

#[cfg(test)]
mod tests {
    use super::normalized_tax_id;

    #[test]
    fn blank_is_absent_but_malformed_is_an_error() {
        // Optional at registration: an empty field is not a validation failure.
        assert_eq!(normalized_tax_id(None).unwrap(), None);
        assert_eq!(normalized_tax_id(Some("")).unwrap(), None);
        assert_eq!(normalized_tax_id(Some("   ")).unwrap(), None);
        // But a typo must never be stored as though it were an identity.
        assert!(normalized_tax_id(Some("52998224726")).is_err());
    }

    #[test]
    fn a_valid_document_is_stored_digits_only() {
        assert_eq!(
            normalized_tax_id(Some("529.982.247-25")).unwrap().as_deref(),
            Some("52998224725")
        );
    }
}
