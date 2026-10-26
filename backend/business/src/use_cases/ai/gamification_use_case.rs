use chrono::{DateTime, Utc};
use entity::{customer_entity, meal_point_tier_entity, point_transaction_entity};
use sea_orm::prelude::Decimal;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, EntityTrait, NotSet, QueryFilter, QueryOrder, QuerySelect, Set};

pub struct GamificationUseCase;

impl GamificationUseCase {
    /// Awards points for a just-saved meal log entry, if it beat one of the
    /// configured deadline tiers for that meal slot. `log_created_at` is
    /// compared as UTC time-of-day (no per-tenant timezone system exists).
    pub async fn award_for_meal_log(
        db: &DbConn,
        customer_id: i32,
        daily_meal_id: i32,
        log_created_at: DateTime<Utc>,
        meal_log_id: i32,
    ) -> Result<Option<i32>, DbErr> {
        let deadline_time = log_created_at.time();
        let customer = customer_entity::Entity::find()
            .filter(customer_entity::Column::UserId.eq(customer_id))
            .one(db)
            .await?
            .ok_or_else(|| DbErr::Custom("Customer not found".to_string()))?;

        let mut tier_query = meal_point_tier_entity::Entity::find()
            .filter(meal_point_tier_entity::Column::DailyMealId.eq(daily_meal_id))
            .order_by_asc(meal_point_tier_entity::Column::DeadlineTime);
        tier_query = match customer.tenant_id {
            Some(id) => tier_query.filter(meal_point_tier_entity::Column::TenantId.eq(id)),
            None => tier_query.filter(meal_point_tier_entity::Column::TenantId.is_null()),
        };
        let tiers = tier_query
            .all(db)
            .await?;

        let matched = tiers.into_iter().find(|t| deadline_time <= t.deadline_time);

        let Some(tier) = matched else {
            return Ok(None);
        };

        let active = point_transaction_entity::ActiveModel {
            id: NotSet,
            uuid: NotSet,
            customer_id: Set(customer_id),
            meal_log_id: Set(meal_log_id),
            points: Set(tier.points),
            created_at: NotSet,
        };
        active.insert(db).await?;

        Ok(Some(tier.points))
    }

    pub async fn get_balance(db: &DbConn, customer_id: i32) -> Result<i64, DbErr> {
        #[derive(sea_orm::FromQueryResult)]
        struct Sum {
            total: Option<Decimal>,
        }

        let sum = point_transaction_entity::Entity::find()
            .filter(point_transaction_entity::Column::CustomerId.eq(customer_id))
            .select_only()
            .column_as(point_transaction_entity::Column::Points.sum(), "total")
            .into_model::<Sum>()
            .one(db)
            .await?;

        Ok(sum
            .and_then(|s| s.total)
            .and_then(|d| d.to_string().split('.').next().and_then(|n| n.parse::<i64>().ok()))
            .unwrap_or(0))
    }
}

#[cfg(all(test, feature = "mock"))]
mod tests {
    use super::*;
    use sea_orm::{DatabaseBackend, MockDatabase};
    use std::str::FromStr;

    #[tokio::test]
    async fn test_get_balance_returns_points_when_present() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results([
                [
                    std::collections::BTreeMap::from([
                        ("total".to_string(), sea_orm::Value::Decimal(Some(Decimal::from_str("150").unwrap()))),
                    ])
                ],
            ])
            .into_connection();

        let balance = GamificationUseCase::get_balance(&db, 1).await.unwrap();
        assert_eq!(balance, 150);
    }

    #[tokio::test]
    async fn test_get_balance_returns_zero_when_none() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results([
                [
                    std::collections::BTreeMap::from([
                        ("total".to_string(), sea_orm::Value::Decimal(None)),
                    ])
                ],
            ])
            .into_connection();

        let balance = GamificationUseCase::get_balance(&db, 1).await.unwrap();
        assert_eq!(balance, 0);
    }
}

