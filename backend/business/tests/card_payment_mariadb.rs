//! Run only against an isolated, migrated database. No card data or provider calls.
use business::domain::card_payment::{PaymentMethod, PrepareCardPayment};
use business::use_cases::card_payment_use_case::{CardPaymentUseCase, NewPaymentCharge};
use entity::audit::{run_with_user, AuditUser};
use sea_orm::{ConnectionTrait, Database, DbConn};

async fn insert(db: &DbConn, sql: String) -> i32 {
    db.execute_unprepared(&sql).await.unwrap().last_insert_id() as i32
}

fn actor(tenant_id: i32) -> Option<AuditUser> {
    Some(AuditUser {
        id: 1,
        email: "test@example.test".into(),
        tenant_id: Some(tenant_id),
        enforce_tenant: true,
    })
}
fn request(charge_id: i32, key: &str) -> PrepareCardPayment {
    PrepareCardPayment {
        charge_id,
        idempotency_key: key.into(),
        method: PaymentMethod::Credit,
        installments: 3,
    }
}

#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn card_reservations_enforce_tenants_and_concurrent_idempotency() {
    let url =
        std::env::var("PAYMENT_TEST_DATABASE_URL").expect("PAYMENT_TEST_DATABASE_URL required");
    assert!(
        url.rsplit('/')
            .next()
            .unwrap_or("")
            .ends_with("payment_test"),
        "Use a dedicated payment_test database"
    );
    let db = Database::connect(url).await.unwrap();
    let tenant_a = insert(
        &db,
        "INSERT INTO tenant (uuid) VALUES (UNHEX(REPLACE(UUID(),'-','')))".into(),
    )
    .await;
    let tenant_b = insert(
        &db,
        "INSERT INTO tenant (uuid) VALUES (UNHEX(REPLACE(UUID(),'-','')))".into(),
    )
    .await;
    let customer = insert(&db, format!("INSERT INTO customer (uuid, tenant_id, name, email, phone, date_of_birth, gender, created_at, updated_at) VALUES (UNHEX(REPLACE(UUID(),'-','')), {tenant_a}, 'Test', CONCAT(UUID(),'@example.test'), '123', '1990-01-01', 'other', NOW(), NOW())")).await;
    let merchant_a = insert(&db, format!("INSERT INTO payment_merchant (tenant_id, provider, environment, merchant_reference, credentials_secret_ref, status, created_at) VALUES ({tenant_a}, 'rede', 'sandbox', 'fixture', 'secret/test', 'enabled', NOW())")).await;
    let merchant_b = insert(&db, format!("INSERT INTO payment_merchant (tenant_id, provider, environment, merchant_reference, credentials_secret_ref, status, created_at) VALUES ({tenant_b}, 'rede', 'sandbox', 'fixture-b', 'secret/test-b', 'enabled', NOW())")).await;
    let charge = run_with_user(
        actor(tenant_a),
        CardPaymentUseCase::create_charge(
            &db,
            NewPaymentCharge {
                customer_id: customer,
                clinical_plan_id: None,
                amount_cents: 30000,
                due_date: chrono::Utc::now().date_naive(),
            },
        ),
    )
    .await
    .unwrap();

    // The DB also rejects a cross-clinic customer, independently of service checks.
    assert!(db.execute_unprepared(&format!("INSERT INTO payment_charge (tenant_id, customer_id, amount_cents, currency, due_date, status, created_at) VALUES ({tenant_b}, {customer}, 100, 'BRL', CURDATE(), 'open', NOW())")).await.is_err());
    let key = format!("case-{}", uuid::Uuid::new_v4());
    let foreign = run_with_user(
        actor(tenant_b),
        CardPaymentUseCase::prepare(&db, request(charge.id, &key)),
    )
    .await;
    assert_eq!(foreign.unwrap_err().message, "Charge not found");

    let first = run_with_user(
        actor(tenant_a),
        CardPaymentUseCase::prepare(&db, request(charge.id, &key)),
    );
    let second = run_with_user(
        actor(tenant_a),
        CardPaymentUseCase::prepare(&db, request(charge.id, &key)),
    );
    let (first, second) = tokio::join!(first, second);
    let attempt = first.unwrap();
    assert_eq!(attempt.id, second.unwrap().id);
    assert_eq!(attempt.merchant_id, merchant_a);
    assert_eq!(attempt.amount_cents, 30000);
    assert_eq!(attempt.status, "prepared");

    assert!(db
        .execute_unprepared(&format!(
            "UPDATE payment_attempt SET merchant_id = {merchant_b} WHERE id = {}",
            attempt.id
        ))
        .await
        .is_err());
    assert!(db
        .execute_unprepared(&format!(
            "UPDATE payment_attempt SET active_charge_id = NULL WHERE id = {}",
            attempt.id
        ))
        .await
        .is_err());
    assert!(db
        .execute_unprepared(&format!(
            "UPDATE payment_attempt SET method = 'debit', installments = 3 WHERE id = {}",
            attempt.id
        ))
        .await
        .is_err());
    // A key differing only in case must remain a distinct idempotency key.
    let other_key = key.to_uppercase();
    assert!(run_with_user(
        actor(tenant_a),
        CardPaymentUseCase::prepare(&db, request(charge.id, &other_key))
    )
    .await
    .is_err());

    // Unknown results keep the reservation; a replay still returns that attempt.
    db.execute_unprepared(&format!(
        "UPDATE payment_attempt SET status = 'unknown' WHERE id = {}",
        attempt.id
    ))
    .await
    .unwrap();
    let replay = run_with_user(
        actor(tenant_a),
        CardPaymentUseCase::prepare(&db, request(charge.id, &key)),
    )
    .await
    .unwrap();
    assert_eq!(replay.status, "unknown");
    assert!(run_with_user(
        actor(tenant_a),
        CardPaymentUseCase::prepare(&db, request(charge.id, &other_key))
    )
    .await
    .is_err());

    // Only a reconciled terminal failure releases this reservation.
    db.execute_unprepared(&format!(
        "UPDATE payment_attempt SET status = 'declined', active_charge_id = NULL WHERE id = {}",
        attempt.id
    ))
    .await
    .unwrap();
    let next = run_with_user(
        actor(tenant_a),
        CardPaymentUseCase::prepare(&db, request(charge.id, &other_key)),
    )
    .await
    .unwrap();
    assert_ne!(next.id, attempt.id);
}
