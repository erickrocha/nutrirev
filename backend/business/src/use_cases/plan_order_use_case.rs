use crate::commons::functions::string_to_bytes;
use crate::domain::business_error::BusinessError;
use crate::domain::tax_id;
use chrono::NaiveDate;
use entity::{business_plan_entity, plan_order_entity, tenant_entity, tenant_plan_entity};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbConn, DbErr, EntityTrait, NotSet, QueryFilter, QueryOrder, Set,
    TransactionTrait,
};

pub const PENDING: &str = "pending";
pub const CONVERTED: &str = "converted";
pub const CANCELLED: &str = "cancelled";

pub struct NewPlanOrder {
    pub plan_uuid: String,
    pub tax_id: String,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub street: String,
    pub number: String,
    pub complement: Option<String>,
    pub neighborhood: Option<String>,
    pub city: String,
    pub state: String,
    pub postal_code: String,
}

pub struct PlanOrderUseCase {
    db: DbConn,
}

fn db_error(error: DbErr) -> BusinessError {
    log::error!("[PlanOrderUseCase] database error: {}", error);
    BusinessError::new(format!("Database error: {}", error))
}

pub fn digits(raw: &str) -> String {
    raw.chars().filter(char::is_ascii_digit).collect()
}

pub fn required(value: &str, field: &str, max: usize) -> Result<String, BusinessError> {
    let value = value.trim();
    if value.is_empty() || value.chars().count() > max {
        return Err(BusinessError::new(format!("Invalid {}", field)));
    }
    Ok(value.to_string())
}

pub fn valid_email(value: &str) -> bool {
    let mut parts = value.split('@');
    matches!(
        (parts.next(), parts.next(), parts.next()),
        (Some(local), Some(domain), None)
            if !local.is_empty() && domain.contains('.') && !domain.starts_with('.')
                && !domain.ends_with('.') && !value.contains(char::is_whitespace)
    )
}

impl PlanOrderUseCase {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }

    /// Plano que o visitante está contratando, para o resumo da tela de pedido.
    pub async fn find_plan(&self, plan_uuid: &str) -> Result<business_plan_entity::Model, BusinessError> {
        business_plan_entity::Entity::find()
            .filter(business_plan_entity::Column::Uuid.eq(string_to_bytes(plan_uuid)))
            .one(&self.db)
            .await
            .map_err(db_error)?
            .ok_or_else(|| BusinessError::new("Business plan not found".to_string()))
    }

    pub async fn create(&self, input: NewPlanOrder) -> Result<plan_order_entity::Model, BusinessError> {
        let plan = self.find_plan(&input.plan_uuid).await?;

        let tax_id = tax_id::normalize(&input.tax_id)
            .ok_or_else(|| BusinessError::new("Invalid tax id".to_string()))?;
        let name = required(&input.name, "name", 200)?;
        let email = required(&input.email, "email", 200)?.to_lowercase();
        if !valid_email(&email) {
            return Err(BusinessError::new("Invalid email".to_string()));
        }
        let phone = digits(&input.phone);
        if !(10..=13).contains(&phone.len()) {
            return Err(BusinessError::new("Invalid phone".to_string()));
        }
        let postal_code = digits(&input.postal_code);
        if postal_code.len() != 8 {
            return Err(BusinessError::new("Invalid postal code".to_string()));
        }
        let state = input.state.trim().to_uppercase();
        if state.len() != 2 || !state.chars().all(|c| c.is_ascii_alphabetic()) {
            return Err(BusinessError::new("Invalid state".to_string()));
        }
        let street = required(&input.street, "street", 200)?;
        let number = required(&input.number, "number", 20)?;
        let city = required(&input.city, "city", 120)?;
        let line2 = [input.complement, input.neighborhood]
            .into_iter()
            .flatten()
            .map(|part| part.trim().to_string())
            .filter(|part| !part.is_empty())
            .collect::<Vec<_>>()
            .join(" - ");

        plan_order_entity::ActiveModel {
            id: NotSet,
            uuid: NotSet,
            business_plan_id: Set(plan.id),
            plan_name: Set(plan.name),
            price_in_cents: Set(plan.price_in_cents),
            status: Set(PENDING.to_string()),
            tax_id: Set(tax_id),
            name: Set(name),
            email: Set(email),
            phone: Set(phone),
            address_line1: Set(format!("{}, {}", street, number)),
            address_line2: Set((!line2.is_empty()).then_some(line2)),
            locality: Set(city),
            administrative_area: Set(state),
            postal_code: Set(postal_code),
            tenant_id: NotSet,
            created_at: NotSet,
            created_by: NotSet,
            updated_at: NotSet,
            updated_by: NotSet,
        }
        .insert(&self.db)
        .await
        .map_err(db_error)
    }

    pub async fn list(&self, status: Option<&str>) -> Result<Vec<plan_order_entity::Model>, BusinessError> {
        let mut query = plan_order_entity::Entity::find().order_by_desc(plan_order_entity::Column::Id);
        if let Some(status) = status {
            query = query.filter(plan_order_entity::Column::Status.eq(status));
        }
        query.all(&self.db).await.map_err(db_error)
    }

    pub async fn find_by_uuid(&self, uuid: &str) -> Result<plan_order_entity::Model, BusinessError> {
        plan_order_entity::Entity::find()
            .filter(plan_order_entity::Column::Uuid.eq(string_to_bytes(uuid)))
            .one(&self.db)
            .await
            .map_err(db_error)?
            .ok_or_else(|| BusinessError::new("Plan order not found".to_string()))
    }

    pub async fn cancel(&self, uuid: &str) -> Result<plan_order_entity::Model, BusinessError> {
        let order = self.find_by_uuid(uuid).await?;
        if order.status != PENDING {
            return Err(BusinessError::new("Plan order is not pending".to_string()));
        }
        let mut active: plan_order_entity::ActiveModel = order.into();
        active.status = Set(CANCELLED.to_string());
        active.update(&self.db).await.map_err(db_error)
    }

    /// Fecha o acordo: cria o tenant com os dados do pedido, associa o plano e marca o
    /// pedido como convertido. Tudo numa transação — o pedido só sai de `pending` junto
    /// com o tenant, então um segundo clique não cria uma clínica duplicada.
    pub async fn convert(
        &self,
        uuid: &str,
        payment_date: NaiveDate,
    ) -> Result<plan_order_entity::Model, BusinessError> {
        let transaction = self.db.begin().await.map_err(db_error)?;

        let order = plan_order_entity::Entity::find()
            .filter(plan_order_entity::Column::Uuid.eq(string_to_bytes(uuid)))
            .one(&transaction)
            .await
            .map_err(db_error)?
            .ok_or_else(|| BusinessError::new("Plan order not found".to_string()))?;
        if order.status != PENDING {
            return Err(BusinessError::new("Plan order is not pending".to_string()));
        }

        let tenant = tenant_entity::ActiveModel {
            name: Set(Some(order.name.clone())),
            email: Set(Some(order.email.clone())),
            phone: Set(Some(order.phone.clone())),
            address_line1: Set(Some(order.address_line1.clone())),
            address_line2: Set(order.address_line2.clone()),
            locality: Set(Some(order.locality.clone())),
            administrative_area: Set(Some(order.administrative_area.clone())),
            postal_code: Set(Some(order.postal_code.clone())),
            country_code: Set(Some("BR".to_string())),
            ..Default::default()
        }
        .insert(&transaction)
        .await
        .map_err(db_error)?;

        tenant_plan_entity::ActiveModel {
            tenant_id: Set(tenant.id),
            business_plan_id: Set(order.business_plan_id),
            payment_date: Set(payment_date),
            active: Set(true),
            ..Default::default()
        }
        .insert(&transaction)
        .await
        .map_err(db_error)?;

        let mut active: plan_order_entity::ActiveModel = order.into();
        active.status = Set(CONVERTED.to_string());
        active.tenant_id = Set(Some(tenant.id));
        let converted = active.update(&transaction).await.map_err(db_error)?;

        transaction.commit().await.map_err(db_error)?;
        Ok(converted)
    }
}
