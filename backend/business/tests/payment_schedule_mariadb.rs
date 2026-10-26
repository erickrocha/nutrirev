//! Recurring billing against a real MariaDB. Run only on an isolated, migrated
//! database — these tests write and block user accounts.
use business::domain::card_submission::{
    AuthorizeCardPayment, CardProcessorResult, CardSubmission, SensitiveCardData,
};
use business::gateway::card_processor::{CardProcessor, CardProcessorError};
use business::use_cases::card_payment_use_case::CardPaymentUseCase;
use business::use_cases::payment_schedule_use_case::PaymentScheduleUseCase;
use chrono::{Duration, NaiveDate};
use entity::audit::{run_with_user, AuditUser};
use sea_orm::{ConnectionTrait, Database, DbConn};

async fn connect() -> DbConn {
    let url =
        std::env::var("PAYMENT_TEST_DATABASE_URL").expect("PAYMENT_TEST_DATABASE_URL required");
    assert!(
        url.rsplit('/')
            .next()
            .unwrap_or("")
            .ends_with("payment_test"),
        "Use a dedicated payment_test database"
    );
    Database::connect(url).await.unwrap()
}

async fn insert(db: &DbConn, sql: String) -> i32 {
    db.execute_unprepared(&sql).await.unwrap().last_insert_id() as i32
}

/// Reads one value as text. Everything is cast so dates, ints and NULLs all
/// decode through a single path.
async fn scalar(db: &DbConn, expr: &str, from_where: &str) -> Option<String> {
    let backend = db.get_database_backend();
    let sql = format!("SELECT CAST({expr} AS CHAR) AS value FROM {from_where}");
    let row = db
        .query_one_raw(sea_orm::Statement::from_string(backend, sql))
        .await
        .unwrap()?;
    <Option<String> as sea_orm::TryGetable>::try_get(&row, "", "value").unwrap()
}

async fn number(db: &DbConn, expr: &str, from_where: &str) -> i64 {
    scalar(db, expr, from_where)
        .await
        .map(|v| v.parse().unwrap())
        .unwrap_or(0)
}

fn actor(tenant_id: i32, user_id: i32) -> Option<AuditUser> {
    Some(AuditUser {
        id: user_id,
        email: "staff@example.test".into(),
        tenant_id: Some(tenant_id),
        enforce_tenant: true,
    })
}

/// One clinic, one plan, one customer wired to an app user.
struct Fixture {
    tenant: i32,
    plan: i32,
    customer: i32,
    user: i32,
    staff: i32,
}

async fn fixture(db: &DbConn, price_cents: i32, renew_days: i32, grace_days: i32) -> Fixture {
    let tenant = insert(
        db,
        format!("INSERT INTO tenant (uuid, payment_grace_days, created_at, updated_at) VALUES (UNHEX(REPLACE(UUID(),'-','')), {grace_days}, NOW(), NOW())"),
    )
    .await;
    let plan = insert(db, format!("INSERT INTO clinical_plan (uuid, tenant_id, name, price_in_cents, renew_period_days, created_at, updated_at) VALUES (UNHEX(REPLACE(UUID(),'-','')), {tenant}, 'Plano', {price_cents}, {renew_days}, NOW(), NOW())")).await;
    let user = insert(db, format!("INSERT INTO user (uuid, email, password, first_login, enabled, tenant_id, role, created_at, updated_at) VALUES (UNHEX(REPLACE(UUID(),'-','')), CONCAT(UUID(),'@example.test'), 'x', 0, 1, {tenant}, 'User', NOW(), NOW())")).await;
    let staff = insert(db, format!("INSERT INTO user (uuid, email, password, first_login, enabled, tenant_id, role, created_at, updated_at) VALUES (UNHEX(REPLACE(UUID(),'-','')), CONCAT(UUID(),'@example.test'), 'x', 0, 1, {tenant}, 'TenantOwner', NOW(), NOW())")).await;
    let customer = insert(db, format!("INSERT INTO customer (uuid, tenant_id, name, email, phone, date_of_birth, gender, clinical_plan_id, user_id, created_at, updated_at) VALUES (UNHEX(REPLACE(UUID(),'-','')), {tenant}, 'Paciente', CONCAT(UUID(),'@example.test'), '123', '1990-01-01', 'other', {plan}, {user}, NOW(), NOW())")).await;
    Fixture {
        tenant,
        plan,
        customer,
        user,
        staff,
    }
}

fn today() -> NaiveDate {
    chrono::Utc::now().date_naive()
}

#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn concurrent_generation_emits_each_cycle_exactly_once() {
    let db = connect().await;
    // 30-day cycle, 30-day lookahead: today's charge plus the one 30 days out.
    let f = fixture(&db, 15000, 30, 5).await;
    let subscription = run_with_user(
        actor(f.tenant, f.staff),
        PaymentScheduleUseCase::start_subscription(&db, f.customer, f.plan, today()),
    )
    .await
    .unwrap();
    let id = subscription.id.unwrap();

    // Four workers racing on the same subscription. Only uq_pc_cycle stands
    // between this and duplicate charges for the same customer.
    let (a, b, c, d) = tokio::join!(
        PaymentScheduleUseCase::generate_due_charges(&db, today()),
        PaymentScheduleUseCase::generate_due_charges(&db, today()),
        PaymentScheduleUseCase::generate_due_charges(&db, today()),
        PaymentScheduleUseCase::generate_due_charges(&db, today()),
    );
    let created = a.unwrap() + b.unwrap() + c.unwrap() + d.unwrap();

    let rows = number(
        &db,
        "COUNT(*)",
        &format!("payment_charge WHERE payment_date_id = {id}"),
    )
    .await;
    assert_eq!(rows, 2, "expected today's cycle plus the one in 30 days");
    assert_eq!(
        created as i64, rows,
        "every insert the workers reported must be a row that exists"
    );

    let amount = number(
        &db,
        "amount_cents",
        &format!("payment_charge WHERE payment_date_id = {id} AND sequence = 1"),
    )
    .await;
    assert_eq!(amount, 15000, "charge is priced from the clinical plan");

    // The cursor sits past the last emitted cycle, so a rerun is a no-op.
    let next_due = scalar(&db, "next_due_date", &format!("payment_date WHERE id = {id}"))
        .await
        .unwrap();
    assert_eq!(next_due, (today() + Duration::days(60)).to_string());
    assert_eq!(
        PaymentScheduleUseCase::generate_due_charges(&db, today())
            .await
            .unwrap(),
        0
    );
}

#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn access_is_blocked_only_after_the_grace_period_and_restored_on_payment() {
    let db = connect().await;
    let f = fixture(&db, 9900, 30, 5).await;
    let subscription = run_with_user(
        actor(f.tenant, f.staff),
        PaymentScheduleUseCase::start_subscription(&db, f.customer, f.plan, today()),
    )
    .await
    .unwrap();
    let id = subscription.id.unwrap();
    PaymentScheduleUseCase::generate_due_charges(&db, today())
        .await
        .unwrap();

    // Age the first cycle to exactly the grace boundary: due 5 days ago.
    let due = today() - Duration::days(5);
    db.execute_unprepared(&format!(
        "UPDATE payment_charge SET due_date = '{due}' WHERE payment_date_id = {id} AND sequence = 1"
    ))
    .await
    .unwrap();
    // Push the second cycle out of the way so it is not the oldest unpaid one.
    db.execute_unprepared(&format!(
        "UPDATE payment_charge SET due_date = '{}' WHERE payment_date_id = {id} AND sequence = 2",
        today() + Duration::days(25)
    ))
    .await
    .unwrap();

    PaymentScheduleUseCase::mark_overdue(&db, today()).await.unwrap();
    assert_eq!(
        scalar(
            &db,
            "status",
            &format!("payment_charge WHERE payment_date_id = {id} AND sequence = 1")
        )
        .await
        .unwrap(),
        "overdue"
    );

    // Still inside the grace window on the fifth day.
    PaymentScheduleUseCase::enforce_access(&db, today()).await.unwrap();
    assert_eq!(enabled(&db, f.user).await, 1, "grace day must keep access");

    // One day past it, access goes. The tick is clinic-wide, so the returned
    // counts cover every tenant in the database; assert on this fixture's user.
    PaymentScheduleUseCase::enforce_access(&db, today() + Duration::days(1))
        .await
        .unwrap();
    assert_eq!(enabled(&db, f.user).await, 0);
    assert_eq!(
        blocked_reason(&db, f.user)
        .await
        .unwrap(),
        "payment"
    );

    // Paying up restores it.
    db.execute_unprepared(&format!(
        "UPDATE payment_charge SET status = 'paid', paid_at = NOW(6) WHERE payment_date_id = {id} AND sequence = 1"
    ))
    .await
    .unwrap();
    PaymentScheduleUseCase::enforce_access(&db, today() + Duration::days(1))
        .await
        .unwrap();
    assert_eq!(enabled(&db, f.user).await, 1);
    assert!(
        blocked_reason(&db, f.user)
        .await
        .is_none(),
        "the worker must hand the block back when it releases it"
    );
}

#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn a_hand_disabled_account_is_never_re_enabled_by_billing() {
    let db = connect().await;
    let f = fixture(&db, 9900, 30, 0).await;
    // The clinic switched this patient off itself: enabled = 0, no reason set.
    db.execute_unprepared(&format!(
        "UPDATE user SET enabled = 0, blocked_reason = NULL WHERE id = {}",
        f.user
    ))
    .await
    .unwrap();

    let subscription = run_with_user(
        actor(f.tenant, f.staff),
        PaymentScheduleUseCase::start_subscription(&db, f.customer, f.plan, today()),
    )
    .await
    .unwrap();
    let id = subscription.id.unwrap();
    PaymentScheduleUseCase::generate_due_charges(&db, today())
        .await
        .unwrap();

    // Owes money and is well past a zero-day grace, so the worker would block —
    // but the account is already someone else's to own.
    db.execute_unprepared(&format!(
        "UPDATE payment_charge SET due_date = '{}' WHERE payment_date_id = {id}",
        today() - Duration::days(30)
    ))
    .await
    .unwrap();
    PaymentScheduleUseCase::enforce_access(&db, today()).await.unwrap();
    assert!(
        blocked_reason(&db, f.user)
        .await
        .is_none(),
        "billing must not claim a block it did not make"
    );

    // Now everything is settled. The worker still has no business re-enabling it.
    db.execute_unprepared(&format!(
        "UPDATE payment_charge SET status = 'paid' WHERE payment_date_id = {id}"
    ))
    .await
    .unwrap();
    PaymentScheduleUseCase::enforce_access(&db, today()).await.unwrap();
    assert_eq!(enabled(&db, f.user).await, 0, "hand-disabled must stay disabled");
    assert!(blocked_reason(&db, f.user).await.is_none());
}

struct StubProcessor {
    approve: bool,
}

#[async_trait::async_trait]
impl CardProcessor for StubProcessor {
    async fn authorize(
        &self,
        _submission: &CardSubmission,
    ) -> Result<CardProcessorResult, CardProcessorError> {
        let result = CardProcessorResult {
            provider_transaction_id: "stub-tx".into(),
            return_code: if self.approve { "00" } else { "51" }.into(),
            return_message: "stub".into(),
            approved: self.approve,
            // The stub stands in for a processor that authorizes and captures in
            // one call, which is what the real adapters now do.
            captured: self.approve,
            last4: Some("0000".into()),
            brand: Some("Visa".into()),
        };
        if self.approve {
            Ok(result)
        } else {
            Err(CardProcessorError::Declined(result))
        }
    }
}

fn test_card() -> SensitiveCardData {
    // 4111111111111111 is the canonical Luhn-valid test PAN; no provider is called.
    SensitiveCardData::new(
        "4111111111111111".into(),
        "123".into(),
        12,
        2030,
        "TEST HOLDER".into(),
    )
    .unwrap()
}

#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn a_captured_card_settles_its_charge_and_a_declined_one_does_not() {
    use business::domain::card_payment::{PaymentMethod, PrepareCardPayment};

    let db = connect().await;
    let f = fixture(&db, 12500, 30, 5).await;
    insert(&db, format!("INSERT INTO payment_merchant (tenant_id, provider, environment, merchant_reference, credentials_secret_ref, status, created_at) VALUES ({}, 'rede', 'sandbox', 'fixture', 'secret/test', 'enabled', NOW())", f.tenant)).await;

    let subscription = run_with_user(
        actor(f.tenant, f.staff),
        PaymentScheduleUseCase::start_subscription(&db, f.customer, f.plan, today()),
    )
    .await
    .unwrap();
    let id = subscription.id.unwrap();
    PaymentScheduleUseCase::generate_due_charges(&db, today())
        .await
        .unwrap();
    let charge_id = number(
        &db,
        "id",
        &format!("payment_charge WHERE payment_date_id = {id} AND sequence = 1"),
    )
    .await as i32;

    // A decline leaves the charge owing.
    let declined = run_with_user(actor(f.tenant, f.user), async {
        let attempt = CardPaymentUseCase::prepare(
            &db,
            PrepareCardPayment {
                charge_id,
                idempotency_key: format!("decline-{}", uuid::Uuid::new_v4()),
                method: PaymentMethod::Credit,
                installments: 1,
            },
        )
        .await
        .unwrap();
        CardPaymentUseCase::authorize(
            &db,
            f.user,
            AuthorizeCardPayment {
                attempt_id: attempt.id,
                card: test_card(),
            },
            &StubProcessor { approve: false },
            // The card-only acquirer takes no payer context.
            None,
        )
        .await
        .unwrap()
    })
    .await;
    assert_eq!(declined.status, "declined");
    assert_eq!(charge_status(&db, charge_id).await, "open");

    // An authorization settles it, in the same transaction as the attempt.
    let authorized = run_with_user(actor(f.tenant, f.user), async {
        let attempt = CardPaymentUseCase::prepare(
            &db,
            PrepareCardPayment {
                charge_id,
                idempotency_key: format!("approve-{}", uuid::Uuid::new_v4()),
                method: PaymentMethod::Credit,
                installments: 1,
            },
        )
        .await
        .unwrap();
        CardPaymentUseCase::authorize(
            &db,
            f.user,
            AuthorizeCardPayment {
                attempt_id: attempt.id,
                card: test_card(),
            },
            &StubProcessor { approve: true },
            None,
        )
        .await
        .unwrap()
    })
    .await;
    // `captured`, not `authorized`: a charge settles only against money that
    // actually moved. This assertion used to read "authorized" alongside a paid
    // charge, which was the defect itself written down as an expectation — an
    // authorization that is never captured expires, and because `enforce_access`
    // only blocks on overdue charges, the customer kept access for free.
    assert_eq!(authorized.status, "captured");
    assert_eq!(charge_status(&db, charge_id).await, "paid");
    assert!(
        scalar(&db, "paid_at", &format!("payment_charge WHERE id = {charge_id}"))
            .await
            .is_some(),
        "a settled charge records when it was settled"
    );
}

async fn enabled(db: &DbConn, user_id: i32) -> i64 {
    number(db, "enabled", &format!("user WHERE id = {user_id}")).await
}

async fn blocked_reason(db: &DbConn, user_id: i32) -> Option<String> {
    scalar(db, "blocked_reason", &format!("user WHERE id = {user_id}")).await
}

async fn charge_status(db: &DbConn, charge_id: i32) -> String {
    scalar(db, "status", &format!("payment_charge WHERE id = {charge_id}"))
        .await
        .unwrap()
}
