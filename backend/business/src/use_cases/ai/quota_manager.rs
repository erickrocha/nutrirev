use crate::domain::ai_provider::ProviderError;
use entity::audit::{tenant_scope, TenantScope};
use entity::{ai_usage_daily_entity, business_plan_entity, tenant_plan_entity};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, QueryFilter,
    QuerySelect, Set, TransactionTrait,
};
use std::env;

#[derive(Clone, Debug, Default)]
pub struct QuotaManager;

impl QuotaManager {
    pub fn new() -> Self {
        Self
    }

    pub async fn resolve_limit(&self, db: &DatabaseConnection) -> u32 {
        if let TenantScope::Tenant(tenant_id) = tenant_scope() {
            if let Ok(Some(tenant_plan)) = tenant_plan_entity::Entity::find()
                .filter(tenant_plan_entity::Column::TenantId.eq(tenant_id))
                .filter(tenant_plan_entity::Column::Active.eq(true))
                .one(db)
                .await
            {
                if let Ok(Some(plan)) =
                    business_plan_entity::Entity::find_by_id(tenant_plan.business_plan_id)
                        .one(db)
                        .await
                {
                    if plan.daily_ai_quota > 0 {
                        return plan.daily_ai_quota as u32;
                    }
                }
            }
        }

        Self::env_limit()
    }

    pub fn env_limit() -> u32 {
        env::var("MEAL_ANALYSIS_DAILY_QUOTA")
            .ok()
            .and_then(|v| v.parse::<u32>().ok())
            .unwrap_or(50)
    }

    pub async fn check_and_increment(
        &self,
        db: &DatabaseConnection,
        user_id: i32,
    ) -> Result<(), ProviderError> {
        let limit = i32::try_from(self.resolve_limit(db).await).unwrap_or(i32::MAX);
        let today = chrono::Utc::now().date_naive();
        let tenant_id = match tenant_scope() {
            TenantScope::Tenant(id) => Some(id),
            _ => None,
        };

        // Cria o contador do dia se ele ainda não existe. Duas requisições simultâneas
        // podem tentar ao mesmo tempo: a chave única (user_id, usage_date) deixa só uma
        // passar, e o erro da outra significa exatamente que a linha já está lá.
        let _ = ai_usage_daily_entity::Entity::insert(ai_usage_daily_entity::ActiveModel {
            tenant_id: Set(tenant_id),
            user_id: Set(user_id),
            usage_date: Set(today),
            used: Set(0),
            ..Default::default()
        })
        .exec(db)
        .await;

        // O incremento vai sob lock de linha para que requisições concorrentes leiam o
        // contador uma de cada vez — sem isso, N chamadas simultâneas passam todas pela
        // mesma leitura e a quota deixa de valer.
        let txn = db.begin().await.map_err(quota_db_error)?;

        let counter = ai_usage_daily_entity::Entity::find()
            .filter(ai_usage_daily_entity::Column::UserId.eq(user_id))
            .filter(ai_usage_daily_entity::Column::UsageDate.eq(today))
            .lock_exclusive()
            .one(&txn)
            .await
            .map_err(quota_db_error)?
            .ok_or_else(|| {
                ProviderError::with_provider_error("AI quota counter row could not be created")
            })?;

        if counter.used >= limit {
            txn.rollback().await.ok();
            return Err(ProviderError::quota_exceeded(format!(
                "Daily quota of {} meal analysis requests exceeded.",
                limit
            )));
        }

        let next = counter.used + 1;
        let mut counter: ai_usage_daily_entity::ActiveModel = counter.into();
        counter.used = Set(next);
        counter.update(&txn).await.map_err(quota_db_error)?;

        txn.commit().await.map_err(quota_db_error)?;
        Ok(())
    }
}

fn quota_db_error(error: DbErr) -> ProviderError {
    ProviderError::with_provider_error(format!("Database error checking AI quota: {}", error))
}
