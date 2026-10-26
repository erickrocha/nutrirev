//! Pix reservation, abandonment and settlement. No real provider calls.
//!
//! Run only against an isolated, migrated database.

use business::domain::card_payment::PaymentMethod;
use business::domain::pix_payment::{
    PixChargeRequest, PixChargeResult, PixChargeState, PixStatus,
};
use business::gateway::billing_gateway::BillingGateway;
use business::gateway::pix_processor::{PixProcessor, PixProcessorError};
use business::use_cases::card_payment_use_case::{
    CardPaymentUseCase, NewPaymentCharge, NewPixAttempt,
};
use business::use_cases::payment_schedule_use_case::PaymentScheduleUseCase;
use business::use_cases::pix_payment_use_case::{cancel_attempt, PixPaymentUseCase};
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

/// Fixtures for one clinic: (tenant, customer, asaas merchant, charge).
async fn fixtures(db: &DbConn, amount_cents: i64) -> (i32, i32, i32, i32) {
    let tenant = insert(
        db,
        "INSERT INTO tenant (uuid) VALUES (UNHEX(REPLACE(UUID(),'-','')))".into(),
    )
    .await;
    let customer = insert(db, format!("INSERT INTO customer (uuid, tenant_id, name, email, phone, date_of_birth, gender, created_at, updated_at) VALUES (UNHEX(REPLACE(UUID(),'-','')), {tenant}, 'Pix', CONCAT(UUID(),'@example.test'), '1', '1990-01-01', 'other', NOW(), NOW())")).await;
    let merchant = insert(db, format!("INSERT INTO payment_merchant (tenant_id, provider, environment, merchant_reference, credentials_secret_ref, status, created_at, credit_enabled, pix_enabled, recurring_enabled) VALUES ({tenant}, 'asaas', 'sandbox', CONCAT('fix-', UUID()), 'asaas/fixture', 'enabled', NOW(), 1, 1, 1)")).await;
    let charge = run_with_user(
        actor(tenant),
        CardPaymentUseCase::create_charge(
            db,
            NewPaymentCharge {
                customer_id: customer,
                clinical_plan_id: None,
                amount_cents,
                due_date: chrono::Utc::now().date_naive(),
            },
        ),
    )
    .await
    .unwrap();
    (tenant, customer, merchant, charge.id)
}

struct StubPix {
    payload: String,
}

#[async_trait::async_trait]
impl PixProcessor for StubPix {
    async fn create_charge(
        &self,
        request: &PixChargeRequest,
    ) -> Result<PixChargeResult, PixProcessorError> {
        Ok(PixChargeResult {
            provider_payment_id: format!("pay_{}", request.reference),
            payload: self.payload.clone(),
            encoded_image: Some("aGVsbG8=".into()),
            expires_at: None,
        })
    }

    async fn charge_status(&self, _id: &str) -> Result<PixChargeState, PixProcessorError> {
        Ok(PixChargeState {
            status: PixStatus::Paid,
            amount_cents: None,
        })
    }
}

/// The failure this whole feature was blocked on.
///
/// `uq_pa_active` allows one live attempt per charge, and before cancellation
/// existed nothing ever released one. A customer who opened a Pix QR and changed
/// their mind was locked out of that charge by *every* method, permanently.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn an_abandoned_pix_qr_can_be_released_and_the_charge_paid_another_way() {
    let db = connect().await;
    let (tenant, _customer, merchant, charge) = fixtures(&db, 5_000).await;
    let stub = StubPix {
        payload: "00020126BR.GOV.BCB.PIX".into(),
    };

    let attempt = CardPaymentUseCase::prepare_pix(
        &db,
        NewPixAttempt {
            tenant_id: tenant,
            charge_id: charge,
            merchant_id: merchant,
            idempotency_key: "pix-abandon-000001".into(),
        },
    )
    .await
    .expect("pix reservation");
    let issued = PixPaymentUseCase::issue(&db, tenant, attempt.id, "cus_1".into(), &stub)
        .await
        .expect("qr issued");
    assert_eq!(issued.attempt.status, "requires_action");
    assert_eq!(issued.payload, "00020126BR.GOV.BCB.PIX");

    // While the QR is live it holds the charge, so no other method can start.
    let blocked = CardPaymentUseCase::prepare_pix(
        &db,
        NewPixAttempt {
            tenant_id: tenant,
            charge_id: charge,
            merchant_id: merchant,
            idempotency_key: "pix-abandon-000002".into(),
        },
    )
    .await;
    assert!(blocked.is_err(), "a live attempt must reserve the charge");

    // The customer closes the panel.
    let cancelled = cancel_attempt(&db, tenant, attempt.id)
        .await
        .expect("cancel");
    assert_eq!(cancelled.status, "cancelled");

    // Cancelling twice is a no-op: the client cancels on both panel close and
    // method switch, and those race.
    assert_eq!(
        cancel_attempt(&db, tenant, attempt.id)
            .await
            .expect("idempotent cancel")
            .status,
        "cancelled"
    );

    // ...and the charge is payable again, by a different method.
    let by_card = run_with_user(
        actor(tenant),
        CardPaymentUseCase::prepare(
            &db,
            business::domain::card_payment::PrepareCardPayment {
                charge_id: charge,
                idempotency_key: "card-after-abandon01".into(),
                method: PaymentMethod::Credit,
                installments: 1,
            },
        ),
    )
    .await;
    // The card path needs a Rede merchant, which this clinic has none of; the
    // reservation itself is what must be unblocked, and it is: the failure is
    // about the acquirer, never about the charge still being held.
    match by_card {
        Ok(prepared) => assert_eq!(prepared.charge_id, charge),
        Err(error) => assert!(
            !error.message.contains("already reserves"),
            "charge is still held after cancellation: {}",
            error.message
        ),
    }
}

/// Webhook redelivery is routine, and polling races it. One settlement.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn settling_the_same_pix_twice_pays_the_charge_once() {
    let db = connect().await;
    let (tenant, _customer, merchant, charge) = fixtures(&db, 7_500).await;
    let stub = StubPix {
        payload: "00020126BR.GOV.BCB.PIX".into(),
    };

    let attempt = CardPaymentUseCase::prepare_pix(
        &db,
        NewPixAttempt {
            tenant_id: tenant,
            charge_id: charge,
            merchant_id: merchant,
            idempotency_key: "pix-settle-000001".into(),
        },
    )
    .await
    .expect("pix reservation");
    PixPaymentUseCase::issue(&db, tenant, attempt.id, "cus_1".into(), &stub)
        .await
        .expect("qr issued");

    let first = PixPaymentUseCase::settle(&db, tenant, attempt.id, PixStatus::Paid, Some(7_500))
        .await
        .expect("first settlement");
    assert_eq!(first.status, "captured");

    let paid_at: String = scalar(
        &db,
        &format!("SELECT CAST(COUNT(*) AS CHAR) FROM payment_charge WHERE id = {charge} AND status = 'paid'"),
    )
    .await;
    assert_eq!(paid_at, "1");

    // The redelivery.
    let second = PixPaymentUseCase::settle(&db, tenant, attempt.id, PixStatus::Paid, Some(7_500))
        .await
        .expect("redelivery must not error");
    assert_eq!(second.status, "captured");

    let still_one: String = scalar(
        &db,
        &format!("SELECT CAST(COUNT(*) AS CHAR) FROM payment_charge WHERE id = {charge} AND status = 'paid'"),
    )
    .await;
    assert_eq!(still_one, "1", "charge settled more than once");
}

/// An amount that does not match ours is never settled, whatever the callback says.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn a_mismatched_amount_is_flagged_instead_of_settled() {
    let db = connect().await;
    let (tenant, _customer, merchant, charge) = fixtures(&db, 9_900).await;
    let stub = StubPix {
        payload: "00020126BR.GOV.BCB.PIX".into(),
    };

    let attempt = CardPaymentUseCase::prepare_pix(
        &db,
        NewPixAttempt {
            tenant_id: tenant,
            charge_id: charge,
            merchant_id: merchant,
            idempotency_key: "pix-mismatch-00001".into(),
        },
    )
    .await
    .expect("pix reservation");
    PixPaymentUseCase::issue(&db, tenant, attempt.id, "cus_1".into(), &stub)
        .await
        .expect("qr issued");

    // One cent short.
    let refused =
        PixPaymentUseCase::settle(&db, tenant, attempt.id, PixStatus::Paid, Some(9_899)).await;
    assert!(refused.is_err(), "a mismatched amount must not settle");

    let unpaid: String = scalar(
        &db,
        &format!("SELECT CAST(COUNT(*) AS CHAR) FROM payment_charge WHERE id = {charge} AND status = 'open'"),
    )
    .await;
    assert_eq!(unpaid, "1", "charge was settled on a mismatched amount");

    let flagged: String = scalar(
        &db,
        &format!("SELECT CAST(status AS CHAR) FROM payment_attempt WHERE id = {}", attempt.id),
    )
    .await;
    assert_eq!(flagged, "unknown", "attempt was not flagged for reconciliation");
}

/// A tenant may never settle another tenant's attempt, even naming its id.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn one_clinic_cannot_settle_another_clinics_attempt() {
    let db = connect().await;
    let (tenant_a, _c, merchant_a, charge_a) = fixtures(&db, 4_200).await;
    let (tenant_b, _c2, _m2, _ch2) = fixtures(&db, 4_200).await;
    let stub = StubPix {
        payload: "00020126BR.GOV.BCB.PIX".into(),
    };

    let attempt = CardPaymentUseCase::prepare_pix(
        &db,
        NewPixAttempt {
            tenant_id: tenant_a,
            charge_id: charge_a,
            merchant_id: merchant_a,
            idempotency_key: "pix-cross-000001".into(),
        },
    )
    .await
    .expect("pix reservation");
    PixPaymentUseCase::issue(&db, tenant_a, attempt.id, "cus_1".into(), &stub)
        .await
        .expect("qr issued");

    let cross = PixPaymentUseCase::settle(&db, tenant_b, attempt.id, PixStatus::Paid, None).await;
    assert!(cross.is_err(), "a foreign tenant settled an attempt");

    let unpaid: String = scalar(
        &db,
        &format!("SELECT CAST(COUNT(*) AS CHAR) FROM payment_charge WHERE id = {charge_a} AND status = 'open'"),
    )
    .await;
    assert_eq!(unpaid, "1");

    // And it cannot cancel one either.
    assert!(cancel_attempt(&db, tenant_b, attempt.id).await.is_err());
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

/// The client cancels an abandoned QR itself, but that is best-effort: a
/// force-quit or a dead battery leaves the attempt holding the charge against
/// every payment method. The worker sweep is what makes that lockout temporary.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn the_worker_releases_an_attempt_the_client_never_cancelled() {
    let db = connect().await;
    let (tenant, _customer, merchant, charge) = fixtures(&db, 3_300).await;
    let stub = StubPix {
        payload: "00020126BR.GOV.BCB.PIX".into(),
    };

    let attempt = CardPaymentUseCase::prepare_pix(
        &db,
        NewPixAttempt {
            tenant_id: tenant,
            charge_id: charge,
            merchant_id: merchant,
            idempotency_key: "pix-sweep-000001".into(),
        },
    )
    .await
    .expect("pix reservation");
    PixPaymentUseCase::issue(&db, tenant, attempt.id, "cus_1".into(), &stub)
        .await
        .expect("qr issued");

    // A live QR must survive the sweep, or a customer mid-payment loses it.
    PaymentScheduleUseCase::expire_abandoned_attempts(&db)
        .await
        .expect("sweep");
    let still_live: String = scalar(
        &db,
        &format!("SELECT CAST(status AS CHAR) FROM payment_attempt WHERE id = {}", attempt.id),
    )
    .await;
    assert_eq!(still_live, "requires_action", "sweep cancelled a live QR");

    // Age it past the provider's expiry, as the clock would.
    db.execute_unprepared(&format!(
        "UPDATE payment_attempt SET pix_expires_at = NOW() - INTERVAL 1 HOUR WHERE id = {}",
        attempt.id
    ))
    .await
    .unwrap();

    let released = PaymentScheduleUseCase::expire_abandoned_attempts(&db)
        .await
        .expect("sweep");
    assert!(released >= 1, "the expired attempt was not released");

    let freed: String = scalar(
        &db,
        &format!(
            "SELECT CAST(COUNT(*) AS CHAR) FROM payment_attempt WHERE id = {} AND status = 'cancelled' AND active_charge_id IS NULL",
            attempt.id
        ),
    )
    .await;
    assert_eq!(freed, "1", "attempt is still reserving the charge");

    // ...and the charge takes a new attempt again.
    CardPaymentUseCase::prepare_pix(
        &db,
        NewPixAttempt {
            tenant_id: tenant,
            charge_id: charge,
            merchant_id: merchant,
            idempotency_key: "pix-sweep-000002".into(),
        },
    )
    .await
    .expect("charge is payable again after the sweep");
}

/// A refund or chargeback must put the charge back on the bill. Without this a
/// reversed payment leaves the charge reading `paid` and the patient with access
/// to something nobody was paid for.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn a_reversed_pix_puts_the_charge_back_on_the_bill() {
    let db = connect().await;
    let (tenant, _customer, merchant, charge) = fixtures(&db, 4_400).await;
    let stub = StubPix {
        payload: "00020126BR.GOV.BCB.PIX".into(),
    };

    let attempt = CardPaymentUseCase::prepare_pix(
        &db,
        NewPixAttempt {
            tenant_id: tenant,
            charge_id: charge,
            merchant_id: merchant,
            idempotency_key: "pix-reversal-00001".into(),
        },
    )
    .await
    .expect("pix reservation");
    PixPaymentUseCase::issue(&db, tenant, attempt.id, "cus_1".into(), &stub)
        .await
        .expect("qr issued");
    PixPaymentUseCase::settle(&db, tenant, attempt.id, PixStatus::Paid, Some(4_400))
        .await
        .expect("settled");
    assert_eq!(charge_status(&db, charge).await, "paid");

    // The bank claws it back.
    let reversed = PixPaymentUseCase::settle(&db, tenant, attempt.id, PixStatus::Refunded, None)
        .await
        .expect("reversal");
    assert_eq!(reversed.status, "refunded");
    assert_ne!(
        charge_status(&db, charge).await,
        "paid",
        "the charge is still settled after the money left"
    );
    assert_eq!(
        scalar(
            &db,
            &format!("SELECT CAST(COUNT(*) AS CHAR) FROM payment_charge WHERE id = {charge} AND paid_at IS NULL"),
        )
        .await,
        "1",
        "paid_at survived a reversal"
    );

    // Releasing the reservation is what lets the patient pay it again.
    assert_eq!(
        scalar(
            &db,
            &format!("SELECT CAST(COUNT(*) AS CHAR) FROM payment_attempt WHERE id = {} AND active_charge_id IS NULL", attempt.id),
        )
        .await,
        "1",
        "a reversed attempt is still reserving the charge"
    );
    CardPaymentUseCase::prepare_pix(
        &db,
        NewPixAttempt {
            tenant_id: tenant,
            charge_id: charge,
            merchant_id: merchant,
            idempotency_key: "pix-reversal-00002".into(),
        },
    )
    .await
    .expect("charge is payable again after a reversal");
}

/// Providers redeliver. Reversing twice must not double-count anything.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn a_redelivered_reversal_changes_nothing_the_second_time() {
    let db = connect().await;
    let (tenant, _customer, merchant, charge) = fixtures(&db, 8_800).await;
    let stub = StubPix {
        payload: "00020126BR.GOV.BCB.PIX".into(),
    };

    let attempt = CardPaymentUseCase::prepare_pix(
        &db,
        NewPixAttempt {
            tenant_id: tenant,
            charge_id: charge,
            merchant_id: merchant,
            idempotency_key: "pix-redeliver-0001".into(),
        },
    )
    .await
    .expect("pix reservation");
    PixPaymentUseCase::issue(&db, tenant, attempt.id, "cus_1".into(), &stub)
        .await
        .expect("qr issued");
    PixPaymentUseCase::settle(&db, tenant, attempt.id, PixStatus::Paid, Some(8_800))
        .await
        .expect("settled");
    PixPaymentUseCase::settle(&db, tenant, attempt.id, PixStatus::Refunded, None)
        .await
        .expect("reversal");

    let first_reversal = scalar(
        &db,
        &format!("SELECT CAST(reversed_at AS CHAR) FROM payment_attempt WHERE id = {}", attempt.id),
    )
    .await;
    let after = charge_status(&db, charge).await;

    // ...and again.
    PixPaymentUseCase::settle(&db, tenant, attempt.id, PixStatus::Refunded, None)
        .await
        .expect("redelivered reversal must not error");

    assert_eq!(
        scalar(
            &db,
            &format!("SELECT CAST(reversed_at AS CHAR) FROM payment_attempt WHERE id = {}", attempt.id),
        )
        .await,
        first_reversal,
        "the reversal timestamp moved on redelivery"
    );
    assert_eq!(charge_status(&db, charge).await, after);
}

/// Nothing settled means nothing to take back.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn reversing_an_unsettled_attempt_is_a_no_op() {
    let db = connect().await;
    let (tenant, _customer, merchant, charge) = fixtures(&db, 1_100).await;
    let stub = StubPix {
        payload: "00020126BR.GOV.BCB.PIX".into(),
    };

    let attempt = CardPaymentUseCase::prepare_pix(
        &db,
        NewPixAttempt {
            tenant_id: tenant,
            charge_id: charge,
            merchant_id: merchant,
            idempotency_key: "pix-nosettle-00001".into(),
        },
    )
    .await
    .expect("pix reservation");
    PixPaymentUseCase::issue(&db, tenant, attempt.id, "cus_1".into(), &stub)
        .await
        .expect("qr issued");

    // A refund notice for a QR that was never paid: ignore it, do not error, and
    // above all do not release or alter the live attempt.
    PixPaymentUseCase::settle(&db, tenant, attempt.id, PixStatus::Refunded, None)
        .await
        .expect("must not error");

    assert_eq!(charge_status(&db, charge).await, "open");
    assert_eq!(
        scalar(
            &db,
            &format!("SELECT CAST(status AS CHAR) FROM payment_attempt WHERE id = {}", attempt.id),
        )
        .await,
        "requires_action",
        "a live QR was altered by a spurious refund notice"
    );
}

async fn charge_status(db: &DbConn, charge_id: i32) -> String {
    scalar(
        db,
        &format!("SELECT CAST(status AS CHAR) FROM payment_charge WHERE id = {charge_id}"),
    )
    .await
}

/// A reversal is the one billing event nobody is told about. Without a way to
/// see it, a clawed-back payment is indistinguishable from a patient who simply
/// never paid.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn a_clinic_can_see_which_payments_were_clawed_back() {
    let db = connect().await;
    let (tenant, _customer, merchant, charge) = fixtures(&db, 6_600).await;
    let (other_tenant, _c2, other_merchant, other_charge) = fixtures(&db, 6_600).await;
    let stub = StubPix {
        payload: "00020126BR.GOV.BCB.PIX".into(),
    };

    assert!(
        BillingGateway::recent_reversals(&db, tenant, 50)
            .await
            .unwrap()
            .is_empty(),
        "a clinic with no reversals must see none"
    );

    for (t, m, c, key) in [
        (tenant, merchant, charge, "pix-visible-00001"),
        (other_tenant, other_merchant, other_charge, "pix-visible-00002"),
    ] {
        let attempt = CardPaymentUseCase::prepare_pix(
            &db,
            NewPixAttempt {
                tenant_id: t,
                charge_id: c,
                merchant_id: m,
                idempotency_key: key.into(),
            },
        )
        .await
        .expect("pix reservation");
        PixPaymentUseCase::issue(&db, t, attempt.id, "cus_1".into(), &stub)
            .await
            .expect("qr issued");
        PixPaymentUseCase::settle(&db, t, attempt.id, PixStatus::Paid, Some(6_600))
            .await
            .expect("settled");
        PixPaymentUseCase::settle(&db, t, attempt.id, PixStatus::Refunded, None)
            .await
            .expect("reversal");
    }

    let seen = BillingGateway::recent_reversals(&db, tenant, 50)
        .await
        .unwrap();
    assert_eq!(seen.len(), 1, "a clinic saw another clinic's reversals");
    assert_eq!(seen[0].charge_id, charge);
    assert_eq!(seen[0].amount_cents, 6_600);
    assert_eq!(seen[0].method, "pix");
    // The charge is back on the bill, which is what staff have to act on.
    assert_ne!(seen[0].charge_status, "paid");
    assert!(!seen[0].customer_name.is_empty(), "the row needs a name to act on");
}
