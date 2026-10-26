use crate::domain::business_plan_tier::BusinessPlanTier;
use chrono::{DateTime, Duration, NaiveDate, Utc};
use entity::{business_plan_entity, business_plan_tier_entity, tenant_entity, user_entity, tenant_plan_entity};
use sea_orm::{
    ColumnTrait, DbConn, DbErr, EntityTrait, PaginatorTrait, QueryFilter, QuerySelect,
};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SysAdminDashboardTotals {
    pub tenants: u64,
    pub users: u64,
    pub active_plans: u64,
    pub tenants_without_active_plan: u64,
    pub monthly_recurring_revenue_in_cents: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RecentTenant {
    pub id: i32,
    pub uuid: Vec<u8>,
    pub name: Option<String>,
    pub email: Option<String>,
    pub created_at: DateTime<Utc>,
    pub active_plan_name: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BillingAttentionItem {
    pub business_plan_id: i32,
    pub business_plan_uuid: Vec<u8>,
    pub tenant_id: i32,
    pub tenant_name: Option<String>,
    pub plan_name: String,
    pub payment_date: NaiveDate,
    pub contract_value_in_cents: i64,
    pub overdue: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SysAdminDashboard {
    pub generated_at: DateTime<Utc>,
    pub totals: SysAdminDashboardTotals,
    pub recent_tenants: Vec<RecentTenant>,
    pub billing_attention: Vec<BillingAttentionItem>,
}

pub struct SysAdminDashboardUseCase;

impl SysAdminDashboardUseCase {
    pub async fn load(db: &DbConn) -> Result<SysAdminDashboard, DbErr> {
        let generated_at = Utc::now();
        let today = generated_at.date_naive();
        let attention_until = today + Duration::days(30);

        let tenants = tenant_entity::Entity::find().count(db).await?;
        let users = user_entity::Entity::find()
            .filter(user_entity::Column::TenantId.is_not_null())
            .filter(user_entity::Column::Role.ne("SysAdmin"))
            .count(db)
            .await?;

        let all_tenants = tenant_entity::Entity::find().all(db).await?;

        // Planos com faixas cobram por uso, então precisam da contagem real de
        // usuários do tenant — `available_users` neles é só o piso incluso.
        let users_by_tenant: HashMap<i32, i32> = user_entity::Entity::find()
            .select_only()
            .column(user_entity::Column::TenantId)
            .column_as(user_entity::Column::Id.count(), "total")
            .filter(user_entity::Column::TenantId.is_not_null())
            .filter(user_entity::Column::Role.ne("SysAdmin"))
            .group_by(user_entity::Column::TenantId)
            .into_tuple::<(Option<i32>, i64)>()
            .all(db)
            .await?
            .into_iter()
            .filter_map(|(tenant_id, total)| tenant_id.map(|id| (id, total as i32)))
            .collect();

        let active_plans: Vec<tenant_plan_entity::Model> = tenant_plan_entity::Entity::find()
            .filter(tenant_plan_entity::Column::Active.eq(true))
            .all(db)
            .await?;
            
        let active_plan_by_tenant: HashMap<i32, i32> = active_plans
            .iter()
            .map(|plan| (plan.tenant_id, plan.business_plan_id))
            .collect();

        let plan_ids: Vec<i32> = {
            let mut ids: Vec<i32> = active_plans
                .iter()
                .map(|plan| plan.business_plan_id)
                .collect();
            ids.sort_unstable();
            ids.dedup();
            ids
        };

        let plans_by_id: HashMap<i32, business_plan_entity::Model> = if plan_ids.is_empty() {
            HashMap::new()
        } else {
            business_plan_entity::Entity::find()
                .filter(business_plan_entity::Column::Id.is_in(plan_ids.clone()))
                .all(db)
                .await?
                .into_iter()
                .map(|plan| (plan.id, plan))
                .collect()
        };

        let tiers_by_plan: HashMap<i32, Vec<BusinessPlanTier>> = if plan_ids.is_empty() {
            HashMap::new()
        } else {
            let mut map: HashMap<i32, Vec<BusinessPlanTier>> = HashMap::new();
            let rows = business_plan_tier_entity::Entity::find()
                .filter(business_plan_tier_entity::Column::BusinessPlanId.is_in(plan_ids))
                .all(db)
                .await?;
            for tier in rows {
                map.entry(tier.business_plan_id).or_default().push(BusinessPlanTier {
                    id: Some(tier.id),
                    uuid: None,
                    business_plan_id: tier.business_plan_id,
                    up_to_users: tier.up_to_users,
                    price_per_user_in_cents: tier.price_per_user_in_cents,
                });
            }
            for tiers in map.values_mut() {
                // A faixa sem teto (`up_to_users == 0`) vai por último.
                tiers.sort_by_key(|tier| {
                    if tier.up_to_users == 0 {
                        i32::MAX
                    } else {
                        tier.up_to_users
                    }
                });
            }
            map
        };

        let plan_name_by_tenant: HashMap<i32, String> = all_tenants
            .iter()
            .filter_map(|tenant| {
                let plan = plans_by_id.get(&active_plan_by_tenant.get(&tenant.id).copied()?)?;
                Some((tenant.id, plan.name.clone()))
            })
            .collect();

        let tenants_with_plan = plan_name_by_tenant.len() as u64;

        let monthly_recurring_revenue_in_cents = all_tenants
            .iter()
            .filter_map(|tenant| Some((tenant, plans_by_id.get(&active_plan_by_tenant.get(&tenant.id).copied()?)?)))
            .try_fold(0_i64, |total, (tenant, plan)| -> Result<i64, DbErr> {
                let tiers = tiers_by_plan
                    .get(&plan.id)
                    .map(|v| v.as_slice())
                    .unwrap_or(&[]);
                let actual_users = users_by_tenant.get(&tenant.id).copied().unwrap_or(0);
                total
                    .checked_add(monthly_value_in_cents(
                        plan.price_in_cents,
                        plan.available_users,
                        actual_users,
                        plan.period_days,
                        tiers,
                    )?)
                    .ok_or_else(|| {
                        DbErr::Custom("Monthly recurring revenue overflow".to_string())
                    })
            })?;

        let mut recent_models = all_tenants.clone();
        recent_models.sort_by(|a, b| {
            b.created_at
                .cmp(&a.created_at)
                .then(b.id.cmp(&a.id))
        });
        recent_models.truncate(5);
        let recent_tenants = recent_models
            .into_iter()
            .map(|tenant| RecentTenant {
                id: tenant.id,
                uuid: tenant.uuid,
                name: tenant.name,
                email: tenant.email,
                created_at: tenant.created_at,
                active_plan_name: plan_name_by_tenant.get(&tenant.id).cloned(),
            })
            .collect();

        let mut attention: Vec<BillingAttentionItem> = all_tenants
            .iter()
            .filter_map(|tenant| {
                let plan = plans_by_id.get(&active_plan_by_tenant.get(&tenant.id).copied()?)?;
                if plan.payment_date > attention_until {
                    return None;
                }
                let tiers = tiers_by_plan
                    .get(&plan.id)
                    .map(|v| v.as_slice())
                    .unwrap_or(&[]);
                let actual_users = users_by_tenant.get(&tenant.id).copied().unwrap_or(0);
                let contract_value_in_cents = contract_value_in_cents(
                    plan.price_in_cents,
                    plan.available_users,
                    actual_users,
                    tiers,
                )
                .ok()?;
                Some(BillingAttentionItem {
                    business_plan_id: plan.id,
                    business_plan_uuid: plan.uuid.clone(),
                    tenant_id: tenant.id,
                    tenant_name: tenant.name.clone(),
                    plan_name: plan.name.clone(),
                    payment_date: plan.payment_date,
                    contract_value_in_cents,
                    overdue: plan.payment_date < today,
                })
            })
            .collect();
        attention.sort_by_key(|item| (item.payment_date, item.tenant_id));
        attention.truncate(10);

        Ok(SysAdminDashboard {
            generated_at,
            totals: SysAdminDashboardTotals {
                tenants,
                users,
                active_plans: tenants_with_plan,
                tenants_without_active_plan: tenants.saturating_sub(tenants_with_plan),
                monthly_recurring_revenue_in_cents,
            },
            recent_tenants,
            billing_attention: attention,
        })
    }
}

/// Cobrança por faixa de uso. `available_users` são os assentos inclusos no
/// preço-base; só o excedente (`actual_users` acima deles) é cobrado, faixa a
/// faixa. Sem faixas não há cobrança por usuário. As faixas precisam vir
/// ordenadas com a sem teto (`up_to_users == 0`) por último.
pub fn users_price_in_cents(
    tiers: &[BusinessPlanTier],
    available_users: i32,
    actual_users: i32,
) -> i128 {
    if tiers.is_empty() || actual_users <= available_users {
        return 0;
    }

    let mut total = 0_i128;
    let mut prev_threshold = available_users;

    for tier in tiers {
        if tier.up_to_users == 0 {
            if actual_users > prev_threshold {
                let count = actual_users - prev_threshold;
                total += i128::from(count) * i128::from(tier.price_per_user_in_cents);
            }
            break;
        }

        if actual_users <= prev_threshold {
            break;
        }
        let count = (actual_users.min(tier.up_to_users) - prev_threshold).max(0);
        total += i128::from(count) * i128::from(tier.price_per_user_in_cents);
        prev_threshold = tier.up_to_users;
    }

    total
}

fn contract_value_in_cents(
    price_in_cents: i64,
    available_users: i32,
    actual_users: i32,
    tiers: &[BusinessPlanTier],
) -> Result<i64, DbErr> {
    let extra = users_price_in_cents(tiers, available_users, actual_users);
    let value = i128::from(price_in_cents) + extra;
    i64::try_from(value).map_err(|_| DbErr::Custom("Tenant plan value overflow".to_string()))
}

fn monthly_value_in_cents(
    price_in_cents: i64,
    available_users: i32,
    actual_users: i32,
    period_days: i32,
    tiers: &[BusinessPlanTier],
) -> Result<i64, DbErr> {
    if period_days <= 0 {
        return Err(DbErr::Custom(
            "Tenant plan period must be positive".to_string(),
        ));
    }
    let contract = i128::from(contract_value_in_cents(
        price_in_cents,
        available_users,
        actual_users,
        tiers,
    )?);
    let period = i128::from(period_days);
    let monthly = (contract * 30 + period / 2) / period;
    i64::try_from(monthly).map_err(|_| DbErr::Custom("Monthly plan value overflow".to_string()))
}

#[cfg(test)]
mod tests {
    use super::{monthly_value_in_cents, users_price_in_cents};
    use crate::domain::business_plan_tier::BusinessPlanTier;

    /// `up_to_users == 0` marca a faixa sem teto (a última).
    fn tier(up_to_users: i32, price_per_user_in_cents: i64) -> BusinessPlanTier {
        BusinessPlanTier {
            id: None,
            uuid: None,
            business_plan_id: 0,
            up_to_users,
            price_per_user_in_cents,
        }
    }

    #[test]
    fn normalizes_plan_value_to_thirty_days() {
        // Sem faixas: só o preço-base, normalizado para 30 dias.
        assert_eq!(monthly_value_in_cents(10_000, 10, 10, 30, &[]).unwrap(), 10_000);
        assert_eq!(monthly_value_in_cents(12_000, 1, 1, 60, &[]).unwrap(), 6_000);
        // Sem faixas não há cobrança por usuário, não importa quantos existam.
        assert_eq!(monthly_value_in_cents(10_000, 10, 999, 30, &[]).unwrap(), 10_000);
    }

    #[test]
    fn rejects_invalid_period_and_overflow() {
        assert!(monthly_value_in_cents(100, 1, 1, 0, &[]).is_err());
        let huge = vec![tier(0, i64::MAX)];
        assert!(monthly_value_in_cents(i64::MAX, 1, i32::MAX, 1, &huge).is_err());
    }

    #[test]
    fn scenario_b_tiered_calculation() {
        let tiers = vec![tier(50, 900), tier(150, 700), tier(0, 500)];

        // Scenario B: base 24.900, inclusos 15, 40 usuários -> 25 * 900 = 22.500 extra
        let extra = users_price_in_cents(&tiers, 15, 40);
        assert_eq!(extra, 22_500);
        assert_eq!(24_900 + extra, 47_400);

        // 70 usuários -> 35 * 900 + 20 * 700 = 31.500 + 14.000 = 45.500 extra
        let extra_70 = users_price_in_cents(&tiers, 15, 70);
        assert_eq!(extra_70, 45_500);

        // 200 usuários -> 35 * 900 + 100 * 700 + 50 * 500 = 126.500 extra
        let extra_200 = users_price_in_cents(&tiers, 15, 200);
        assert_eq!(extra_200, 126_500);
    }

    #[test]
    fn tiered_plan_bills_actual_users_not_seats() {
        let tiers = vec![tier(50, 900), tier(0, 700)];

        // Cenário B: base 24.900, 15 inclusos, 40 usuários reais -> 24.900 + 25 * 900.
        assert_eq!(
            monthly_value_in_cents(24_900, 15, 40, 30, &tiers).unwrap(),
            47_400
        );

        // Ninguém acima do incluso: só a base, sem excedente.
        assert_eq!(
            monthly_value_in_cents(24_900, 15, 15, 30, &tiers).unwrap(),
            24_900
        );
    }
}
