//! Run only against an isolated, migrated MariaDB database.
use business::use_cases::ai::quota_manager::QuotaManager;
use entity::audit::{run_with_user, AuditUser};
use sea_orm::{ConnectionTrait, Database, DbConn};
use std::sync::Arc;

async fn insert(db: &DbConn, sql: String) -> i32 {
    db.execute_unprepared(&sql).await.unwrap().last_insert_id() as i32
}

fn actor(tenant_id: i32) -> Option<AuditUser> {
    Some(AuditUser {
        id: 1,
        email: "test_ai@example.test".into(),
        tenant_id: Some(tenant_id),
        enforce_tenant: true,
    })
}

#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn concurrent_ai_quota_enforces_limit_without_race() {
    let url = std::env::var("PAYMENT_TEST_DATABASE_URL")
        .or_else(|_| std::env::var("AI_QUOTA_TEST_DATABASE_URL"))
        .expect("PAYMENT_TEST_DATABASE_URL or AI_QUOTA_TEST_DATABASE_URL required");

    let db = Arc::new(Database::connect(url).await.unwrap());
    let tenant_id = insert(
        &db,
        "INSERT INTO tenant (uuid) VALUES (UNHEX(REPLACE(UUID(),'-','')))".into(),
    )
    .await;

    let quota_limit: i32 = 5;

    // Shared catalog plan with daily_ai_quota = 5, linked to the tenant.
    let plan_id = insert(
        &db,
        format!(
            "INSERT INTO business_plan (uuid, name, price_in_cents, available_users, period_days, payment_date, daily_ai_quota, created_at, updated_at) \
             VALUES (UNHEX(REPLACE(UUID(),'-','')), 'Quota Test Plan', 1000, 10, 30, CURDATE(), {quota_limit}, NOW(), NOW())"
        ),
    )
    .await;

    insert(
        &db,
        format!("UPDATE tenant SET business_plan_id = {plan_id} WHERE id = {tenant_id}"),
    )
    .await;

    let user_id = insert(
        &db,
        format!(
            "INSERT INTO user (uuid, tenant_id, email, name, role, password, created_at, updated_at) \
             VALUES (UNHEX(REPLACE(UUID(),'-','')), {tenant_id}, CONCAT(UUID(),'@example.test'), 'Quota User', 'Admin', 'hash', NOW(), NOW())"
        ),
    )
    .await;

    let quota_manager = QuotaManager::new();
    let total_concurrent = quota_limit + 3; // N + 3 requests

    let mut handles = Vec::new();
    for _ in 0..total_concurrent {
        let db_clone = Arc::clone(&db);
        let qm_clone = quota_manager.clone();
        let user = actor(tenant_id);

        let handle = tokio::spawn(async move {
            run_with_user(user, async move {
                qm_clone.check_and_increment(&db_clone, user_id).await
            })
            .await
        });
        handles.push(handle);
    }

    let mut successes = 0;
    let mut failures = 0;

    for handle in handles {
        match handle.await.unwrap() {
            Ok(()) => successes += 1,
            Err(_) => failures += 1,
        }
    }

    assert_eq!(successes, quota_limit as usize);
    assert_eq!(failures, (total_concurrent - quota_limit) as usize);
}
