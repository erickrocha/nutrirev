use std::collections::HashSet;

use chrono::{DateTime, Utc};
use entity::{
    customer_entity, customer_goal_setting_entity, doctor_entity, meal_plan_entity, tenant_entity,
};
use sea_orm::{
    ColumnTrait, DbConn, DbErr, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect,
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TenantDashboardTotals {
    pub customers: u64,
    pub doctors: u64,
    pub customers_with_goals: u64,
    pub meal_plans: u64,
    pub finished_meal_plans: u64,
    pub mobile_enabled_customers: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RecentTenantCustomer {
    pub id: i32,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub date_of_birth: chrono::NaiveDate,
    pub gender: String,
    pub address_line1: Option<String>,
    pub address_line2: Option<String>,
    pub locality: Option<String>,
    pub administrative_area: Option<String>,
    pub postal_code: Option<String>,
    pub country_code: Option<String>,
    pub clinical_plan_id: Option<i32>,
    pub prepare_meal_id: Option<i32>,
    pub mobile_enabled: bool,
    pub photo: Option<String>,
    pub photo_base64: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TenantDashboard {
    pub tenant_id: i32,
    pub generated_at: DateTime<Utc>,
    pub totals: TenantDashboardTotals,
    pub recent_customers: Vec<RecentTenantCustomer>,
}

pub struct TenantDashboardUseCase;

impl TenantDashboardUseCase {
    pub async fn tenant_exists(db: &DbConn, tenant_id: i32) -> Result<bool, DbErr> {
        Ok(tenant_entity::Entity::find_by_id(tenant_id)
            .one(db)
            .await?
            .is_some())
    }

    pub async fn load(db: &DbConn, tenant_id: i32) -> Result<TenantDashboard, DbErr> {
        let customers = customer_entity::Entity::find()
            .filter(customer_entity::Column::TenantId.eq(tenant_id))
            .count(db)
            .await?;
        let doctors = doctor_entity::Entity::find()
            .filter(doctor_entity::Column::TenantId.eq(tenant_id))
            .count(db)
            .await?;
        let meal_plans = meal_plan_entity::Entity::find()
            .filter(meal_plan_entity::Column::TenantId.eq(tenant_id))
            .count(db)
            .await?;
        let finished_meal_plans = meal_plan_entity::Entity::find()
            .filter(meal_plan_entity::Column::TenantId.eq(tenant_id))
            .filter(meal_plan_entity::Column::GenerationStatus.eq("Finished"))
            .count(db)
            .await?;
        let mobile_enabled_customers = customer_entity::Entity::find()
            .filter(customer_entity::Column::TenantId.eq(tenant_id))
            .filter(customer_entity::Column::MobileEnabled.eq(true))
            .count(db)
            .await?;

        let customers_with_goals = customer_goal_setting_entity::Entity::find()
            .filter(customer_goal_setting_entity::Column::TenantId.eq(tenant_id))
            .all(db)
            .await?
            .into_iter()
            .filter_map(|goal| goal.customer_id)
            .collect::<HashSet<_>>()
            .len() as u64;

        let recent_customers = customer_entity::Entity::find()
            .filter(customer_entity::Column::TenantId.eq(tenant_id))
            .order_by_desc(customer_entity::Column::CreatedAt)
            .limit(5)
            .all(db)
            .await?
            .into_iter()
            .map(|customer| {
                let photo_base64 = customer
                    .photo_base64
                    .and_then(|bytes| String::from_utf8(bytes).ok());
                RecentTenantCustomer {
                    id: customer.id,
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    date_of_birth: customer.date_of_birth,
                    gender: customer.gender,
                    address_line1: customer.address_line1,
                    address_line2: customer.address_line2,
                    locality: customer.locality,
                    administrative_area: customer.administrative_area,
                    postal_code: customer.postal_code,
                    country_code: customer.country_code,
                    clinical_plan_id: customer.clinical_plan_id,
                    prepare_meal_id: customer.prepare_meal_id,
                    mobile_enabled: customer.mobile_enabled,
                    photo: customer.photo,
                    photo_base64,
                    created_at: customer.created_at,
                }
            })
            .collect();

        Ok(TenantDashboard {
            tenant_id,
            generated_at: Utc::now(),
            totals: TenantDashboardTotals {
                customers,
                doctors,
                customers_with_goals,
                meal_plans,
                finished_meal_plans,
                mobile_enabled_customers,
            },
            recent_customers,
        })
    }
}
