//! Unattended (stored-card) billing. No real provider calls.
//!
//! Run only against an isolated, migrated database.

use business::domain::card_submission::{CardProcessorResult, SensitiveCardData};
use business::domain::card_token::{CardToken, TokenChargeRequest, TokenHolder};
use business::gateway::billing_gateway::BillingGateway;
use business::gateway::card_processor::CardProcessorError;
use business::gateway::card_tokenizer::CardTokenizer;
use business::use_cases::card_on_file_use_case::CardOnFileUseCase;
use business::use_cases::card_payment_use_case::{CardPaymentUseCase, NewPaymentCharge};
use chrono::{Duration, NaiveDate, Utc};
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

async fn scalar(db: &DbConn, sql: &str) -> String {
    let backend = db.get_database_backend();
    let row = db
        .query_one_raw(sea_orm::Statement::from_string(backend, sql.to_owned()))
        .await
        .unwrap()
        .expect("a row");
    <Option<String> as sea_orm::TryGetable>::try_get_by_index(&row, 0)
        .unwrap()
        .unwrap_or_default()
}

/// A clinic with one patient on a card-on-file subscription, and one charge due
/// on `due_date`. Returns (tenant, subscription, charge).
async fn fixtures(db: &DbConn, due_date: NaiveDate) -> (i32, i32, i32) {
    let tenant = insert(
        db,
        "INSERT INTO tenant (uuid) VALUES (UNHEX(REPLACE(UUID(),'-','')))".into(),
    )
    .await;
    let customer = insert(db, format!("INSERT INTO customer (uuid, tenant_id, name, email, phone, date_of_birth, gender, provider_customer_id, created_at, updated_at) VALUES (UNHEX(REPLACE(UUID(),'-','')), {tenant}, 'CoF', CONCAT(UUID(),'@example.test'), '1', '1990-01-01', 'other', 'cus_fixture', NOW(), NOW())")).await;
    insert(db, format!("INSERT INTO payment_merchant (tenant_id, provider, environment, merchant_reference, credentials_secret_ref, status, created_at, credit_enabled, pix_enabled, recurring_enabled) VALUES ({tenant}, 'asaas', 'sandbox', CONCAT('fix-', UUID()), 'asaas/fixture', 'enabled', NOW(), 1, 1, 1)")).await;
    let token = insert(db, format!("INSERT INTO payment_token (tenant_id, customer_id, provider, provider_token, brand, last4, status, consent_at, created_at) VALUES ({tenant}, {customer}, 'asaas', 'tok_fixture', 'VISA', '1234', 'active', NOW(), NOW())")).await;
    let subscription = insert(db, format!("INSERT INTO payment_date (uuid, tenant_id, customer_id, first_due_date, next_due_date, status, billing_mode, payment_token_id, is_active, created_at, updated_at) VALUES (UNHEX(REPLACE(UUID(),'-','')), {tenant}, {customer}, '{due_date}', '{due_date}', 'active', 'card_on_file', {token}, 1, NOW(), NOW())")).await;

    let charge = run_with_user(
        actor(tenant),
        CardPaymentUseCase::create_charge(
            db,
            NewPaymentCharge {
                customer_id: customer,
                clinical_plan_id: None,
                amount_cents: 12_000,
                due_date,
            },
        ),
    )
    .await
    .unwrap();
    db.execute_unprepared(&format!(
        "UPDATE payment_charge SET payment_date_id = {subscription} WHERE id = {}",
        charge.id
    ))
    .await
    .unwrap();

    (tenant, subscription, charge.id)
}

struct StubTokenizer {
    outcome: Outcome,
}

#[derive(Clone, Copy)]
enum Outcome {
    Captured,
    Declined,
    Unknown,
}

#[async_trait::async_trait]
impl CardTokenizer for StubTokenizer {
    async fn tokenize(
        &self,
        _card: &SensitiveCardData,
        _holder: &TokenHolder,
    ) -> Result<CardToken, CardProcessorError> {
        Ok(CardToken {
            provider_token: "tok_new".into(),
            brand: Some("VISA".into()),
            last4: Some("4242".into()),
            expiry_month: None,
            expiry_year: None,
        })
    }

    async fn charge_token(
        &self,
        _provider_token: &str,
        _request: &TokenChargeRequest,
    ) -> Result<CardProcessorResult, CardProcessorError> {
        let result = CardProcessorResult {
            provider_transaction_id: "pay_stub".into(),
            return_code: "00".into(),
            return_message: "stub".into(),
            approved: matches!(self.outcome, Outcome::Captured),
            captured: matches!(self.outcome, Outcome::Captured),
            last4: Some("1234".into()),
            brand: Some("VISA".into()),
        };
        match self.outcome {
            Outcome::Captured => Ok(result),
            Outcome::Declined => Err(CardProcessorError::Declined(result)),
            Outcome::Unknown => Err(CardProcessorError::Unknown),
        }
    }
}

/// Charges are generated a month ahead of their due date. Billing every open
/// charge would have taken a month's money from every patient on the first tick
/// after deploy.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn a_charge_that_is_not_due_yet_is_never_charged_early() {
    let db = connect().await;
    let today = Utc::now().date_naive();
    let (_tenant, _subscription, charge) = fixtures(&db, today + Duration::days(30)).await;

    let due = BillingGateway::card_on_file_due(&db, today).await.unwrap();
    assert!(
        !due.iter().any(|row| row.charge_id == charge),
        "a charge due in 30 days was queued for an unattended charge"
    );

    let _report = CardOnFileUseCase::charge_due_subscriptions(&db, today, |_| {
        Some(StubTokenizer { outcome: Outcome::Captured })
    })
    .await
    .unwrap();
    // The report counts the whole pass, and the pass sweeps every clinic. This
    // suite shares a database by design (fixtures are left for inspection), so
    // the aggregate is only ever a lower bound — the per-charge assertions below
    // are the actual invariant, so this one only checks our own charge below.

    let status = scalar(
        &db,
        &format!("SELECT CAST(status AS CHAR) FROM payment_charge WHERE id = {charge}"),
    )
    .await;
    assert_eq!(status, "open", "an undue charge was settled");
}

/// The happy path, and the proof that a second tick on the same day is a no-op.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn a_due_charge_is_charged_once_however_many_ticks_run() {
    let db = connect().await;
    let today = Utc::now().date_naive();
    let (_tenant, _subscription, charge) = fixtures(&db, today).await;

    let first = CardOnFileUseCase::charge_due_subscriptions(&db, today, |_| {
        Some(StubTokenizer { outcome: Outcome::Captured })
    })
    .await
    .unwrap();
    // The report counts the whole pass, and the pass sweeps every clinic. This
    // suite shares a database by design (fixtures are left for inspection), so
    // the aggregate is only ever a lower bound — the per-charge assertions below
    // are the actual invariant.
    assert!(first.charged >= 1);
    assert_eq!(
        scalar(
            &db,
            &format!("SELECT CAST(status AS CHAR) FROM payment_charge WHERE id = {charge}")
        )
        .await,
        "paid"
    );

    // A second tick the same day — another instance, or a retry after a crash.
    CardOnFileUseCase::charge_due_subscriptions(&db, today, |_| {
        Some(StubTokenizer { outcome: Outcome::Captured })
    })
    .await
    .unwrap();

    let attempts = scalar(
        &db,
        &format!("SELECT CAST(COUNT(*) AS CHAR) FROM payment_attempt WHERE charge_id = {charge}"),
    )
    .await;
    assert_eq!(attempts, "1", "the same cycle was attempted twice");
    assert_eq!(
        scalar(
            &db,
            &format!("SELECT CAST(initiator AS CHAR) FROM payment_attempt WHERE charge_id = {charge}")
        )
        .await,
        "mit",
        "an unattended charge was recorded as customer-initiated"
    );
}

/// A refusal must release the charge. Holding it would turn one declined card
/// into a charge nobody — not the worker, not the patient — can ever pay.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn a_declined_card_releases_the_charge_for_another_try() {
    let db = connect().await;
    let today = Utc::now().date_naive();
    let (_tenant, _subscription, charge) = fixtures(&db, today).await;

    let report = CardOnFileUseCase::charge_due_subscriptions(&db, today, |_| {
        Some(StubTokenizer { outcome: Outcome::Declined })
    })
    .await
    .unwrap();
    // The report counts the whole pass, and the pass sweeps every clinic. This
    // suite shares a database by design (fixtures are left for inspection), so
    // the aggregate is only ever a lower bound — the per-charge assertions below
    // are the actual invariant.
    assert!(report.declined >= 1);

    assert_eq!(
        scalar(
            &db,
            &format!("SELECT CAST(status AS CHAR) FROM payment_charge WHERE id = {charge}")
        )
        .await,
        "open",
        "a declined charge was settled"
    );
    let held = scalar(
        &db,
        &format!("SELECT CAST(COUNT(*) AS CHAR) FROM payment_attempt WHERE charge_id = {charge} AND active_charge_id IS NOT NULL"),
    )
    .await;
    assert_eq!(held, "0", "a declined attempt is still reserving the charge");
}

/// An outcome we could not read keeps holding the charge on purpose — the money
/// may have moved. What must not happen is the *next day* being blocked too.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn an_uncertain_outcome_is_held_for_reconciliation_not_retried_blindly() {
    let db = connect().await;
    let today = Utc::now().date_naive();
    let (_tenant, _subscription, charge) = fixtures(&db, today).await;

    let report = CardOnFileUseCase::charge_due_subscriptions(&db, today, |_| {
        Some(StubTokenizer { outcome: Outcome::Unknown })
    })
    .await
    .unwrap();
    // The report counts the whole pass, and the pass sweeps every clinic. This
    // suite shares a database by design (fixtures are left for inspection), so
    // the aggregate is only ever a lower bound — the per-charge assertions below
    // are the actual invariant.
    assert!(report.uncertain >= 1);
    assert_eq!(
        scalar(
            &db,
            &format!("SELECT CAST(status AS CHAR) FROM payment_attempt WHERE charge_id = {charge}")
        )
        .await,
        "unknown"
    );
    assert_eq!(
        scalar(
            &db,
            &format!("SELECT CAST(status AS CHAR) FROM payment_charge WHERE id = {charge}")
        )
        .await,
        "open",
        "an uncertain outcome settled a charge"
    );

    // Same day again: the key is identical, so no second attempt is made and the
    // uncertain one is left exactly where a human can find it.
    CardOnFileUseCase::charge_due_subscriptions(&db, today, |_| {
        Some(StubTokenizer { outcome: Outcome::Captured })
    })
    .await
    .unwrap();
    assert_eq!(
        scalar(
            &db,
            &format!("SELECT CAST(COUNT(*) AS CHAR) FROM payment_attempt WHERE charge_id = {charge}")
        )
        .await,
        "1",
        "an uncertain attempt was retried blindly on the same day"
    );
}

/// Turning recurrence off must revoke the card, not merely stop using it.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn disabling_recurrence_revokes_the_stored_card() {
    let db = connect().await;
    let today = Utc::now().date_naive();
    let (tenant, subscription, charge) = fixtures(&db, today).await;

    CardOnFileUseCase::disable_for_subscription(&db, tenant, subscription)
        .await
        .expect("disable");

    assert_eq!(
        scalar(
            &db,
            &format!("SELECT CAST(billing_mode AS CHAR) FROM payment_date WHERE id = {subscription}")
        )
        .await,
        "manual"
    );
    assert_eq!(
        scalar(
            &db,
            &format!("SELECT CAST(COUNT(*) AS CHAR) FROM payment_token WHERE tenant_id = {tenant} AND status = 'active'")
        )
        .await,
        "0",
        "the card is still chargeable after the customer opted out"
    );

    // And the worker leaves it alone from now on.
    let _report = CardOnFileUseCase::charge_due_subscriptions(&db, today, |_| {
        Some(StubTokenizer { outcome: Outcome::Captured })
    })
    .await
    .unwrap();
    assert_eq!(
        scalar(
            &db,
            &format!("SELECT CAST(status AS CHAR) FROM payment_charge WHERE id = {charge}")
        )
        .await,
        "open"
    );
}
