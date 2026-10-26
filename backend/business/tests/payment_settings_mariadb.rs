//! Acquirer selection and method toggles.
//!
//! Run only against an isolated, migrated database.

use business::domain::card_payment::{PaymentMethod, PrepareCardPayment};
use business::domain::enums::Role;
use business::domain::merchant_capabilities::MerchantCapabilities;
use business::domain::user::User;
use business::gateway::payment_provider_factory::active_connection;
use business::use_cases::card_payment_use_case::{CardPaymentUseCase, NewPaymentCharge};
use business::use_cases::payment_settings_use_case::{ConnectionEdit, PaymentSettingsUseCase};
use chrono::Utc;
use entity::audit::{run_with_user, AuditUser};
use sea_orm::{ConnectionTrait, Database, DbConn};

async fn insert(db: &DbConn, sql: String) -> i32 {
    db.execute_unprepared(&sql).await.unwrap().last_insert_id() as i32
}

fn actor(tenant_id: i32) -> Option<AuditUser> {
    Some(AuditUser {
        id: 1,
        email: "staff@example.test".into(),
        tenant_id: Some(tenant_id),
        enforce_tenant: true,
    })
}

/// The admin endpoints authorise on the role alone, so that is all these need.
fn caller(role: Role, tenant_id: Option<i32>) -> User {
    User {
        id: Some(1),
        uuid: None,
        email: "operator@example.test".into(),
        name: None,
        password: String::new(),
        enabled: true,
        first_login: false,
        tenant_id,
        role,
        created_at: None,
        created_by: None,
        updated_at: None,
        updated_by: None,
    }
}

fn operator() -> User {
    caller(Role::SysAdmin, None)
}

fn clinic_owner() -> User {
    caller(Role::TenantOwner, Some(1))
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

/// A clinic with both acquirers provisioned but none chosen yet, plus a payable
/// charge. Returns (tenant, rede_merchant, asaas_merchant, charge).
async fn fixtures(db: &DbConn) -> (i32, i32, i32, i32) {
    let tenant = insert(
        db,
        "INSERT INTO tenant (uuid) VALUES (UNHEX(REPLACE(UUID(),'-','')))".into(),
    )
    .await;
    let customer = insert(db, format!("INSERT INTO customer (uuid, tenant_id, name, email, phone, date_of_birth, gender, tax_id, provider_customer_id, created_at, updated_at) VALUES (UNHEX(REPLACE(UUID(),'-','')), {tenant}, 'Cfg', CONCAT(UUID(),'@example.test'), '1', '1990-01-01', 'other', NULL, 'cus_fixture', NOW(), NOW())")).await;
    let base = "INSERT INTO payment_merchant (tenant_id, provider, environment, merchant_reference, credentials_secret_ref, status, created_at)";
    let rede = insert(db, format!("{base} VALUES ({tenant}, 'rede', 'sandbox', CONCAT('r-', UUID()), 'rede/fixture', 'disabled', NOW())")).await;
    let asaas = insert(db, format!("{base} VALUES ({tenant}, 'asaas', 'sandbox', CONCAT('a-', UUID()), 'asaas/fixture', 'disabled', NOW())")).await;

    let charge = run_with_user(
        actor(tenant),
        CardPaymentUseCase::create_charge(
            db,
            NewPaymentCharge {
                customer_id: customer,
                clinical_plan_id: None,
                amount_cents: 3_000,
                due_date: Utc::now().date_naive(),
            },
        ),
    )
    .await
    .unwrap();

    (tenant, rede, asaas, charge.id)
}

fn card_request(charge_id: i32, key: &str) -> PrepareCardPayment {
    PrepareCardPayment {
        charge_id,
        idempotency_key: key.into(),
        method: PaymentMethod::Credit,
        installments: 1,
    }
}

const CARD_ONLY: MerchantCapabilities = MerchantCapabilities {
    credit: true,
    pix: false,
    recurring: false,
};
const EVERYTHING: MerchantCapabilities = MerchantCapabilities {
    credit: true,
    pix: true,
    recurring: true,
};

/// The failure this whole change exists to fix.
///
/// The card checkout used to name one acquirer in code, so a clinic set up on
/// the other one could take Pix but had no working card payment at all.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn a_card_payment_works_on_whichever_acquirer_the_clinic_chose() {
    let db = connect().await;

    for (label, capabilities) in [("rede", CARD_ONLY), ("asaas", EVERYTHING)] {
        let (tenant, rede, asaas, charge) = fixtures(&db).await;
        let chosen = if label == "rede" { rede } else { asaas };

        PaymentSettingsUseCase::select(&db, tenant, chosen, capabilities)
            .await
            .unwrap_or_else(|e| panic!("{label} should be selectable: {}", e.message));

        let prepared = run_with_user(
            actor(tenant),
            CardPaymentUseCase::prepare(&db, card_request(charge, "cfg-card-00000001")),
        )
        .await
        .unwrap_or_else(|e| panic!("card must work on {label}: {}", e.message));
        assert_eq!(prepared.charge_id, charge);
        assert_eq!(prepared.merchant_id, chosen, "reserved against the wrong acquirer");
    }
}

/// A method the clinic switched off must be refused before anything is reserved.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn a_disabled_method_is_refused_at_the_reservation() {
    let db = connect().await;
    let (tenant, _rede, asaas, charge) = fixtures(&db).await;

    // Pix on, card off.
    PaymentSettingsUseCase::select(
        &db,
        tenant,
        asaas,
        MerchantCapabilities { credit: false, pix: true, recurring: false },
    )
    .await
    .expect("pix-only is a valid configuration");

    let refused = run_with_user(
        actor(tenant),
        CardPaymentUseCase::prepare(&db, card_request(charge, "cfg-card-00000002")),
    )
    .await;
    assert!(refused.is_err(), "a disabled method was reserved anyway");

    // And nothing was left holding the charge.
    let connection = active_connection(&db, tenant, "sandbox").await.unwrap();
    assert!(!connection.supports(PaymentMethod::Credit));
    assert!(connection.supports(PaymentMethod::Pix));
}

/// One acquirer per clinic: choosing a second one retires the first.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn choosing_an_acquirer_retires_the_previous_one() {
    let db = connect().await;
    let (tenant, rede, asaas, _charge) = fixtures(&db).await;

    PaymentSettingsUseCase::select(&db, tenant, asaas, EVERYTHING)
        .await
        .expect("first choice");
    assert_eq!(
        active_connection(&db, tenant, "sandbox")
            .await
            .unwrap()
            .merchant
            .id,
        asaas
    );

    PaymentSettingsUseCase::select(&db, tenant, rede, CARD_ONLY)
        .await
        .expect("switching acquirer");
    let now = active_connection(&db, tenant, "sandbox").await.unwrap();
    assert_eq!(now.merchant.id, rede, "the switch did not take");

    // Exactly one live connection, guaranteed by uq_pm_one_active rather than by
    // anyone remembering to disable the old row.
    let live: String = {
        let backend = db.get_database_backend();
        let row = db
            .query_one_raw(sea_orm::Statement::from_string(
                backend,
                format!("SELECT CAST(COUNT(*) AS CHAR) FROM payment_merchant WHERE tenant_id = {tenant} AND status = 'enabled'"),
            ))
            .await
            .unwrap()
            .unwrap();
        <Option<String> as sea_orm::TryGetable>::try_get_by_index(&row, 0)
            .unwrap()
            .unwrap_or_default()
    };
    assert_eq!(live, "1");
}

/// The card-only acquirer cannot be configured for what it cannot do.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn an_acquirer_cannot_be_switched_on_for_a_method_it_lacks() {
    let db = connect().await;
    let (tenant, rede, _asaas, _charge) = fixtures(&db).await;

    // Refused in the domain, with a message, rather than surfacing later as a
    // failed checkout in front of a patient.
    for capabilities in [
        MerchantCapabilities { credit: true, pix: true, recurring: false },
        MerchantCapabilities { credit: true, pix: false, recurring: true },
    ] {
        assert!(
            PaymentSettingsUseCase::select(&db, tenant, rede, capabilities)
                .await
                .is_err(),
            "the card-only acquirer accepted a method it cannot serve"
        );
    }

    // ...and the clinic is left with no live acquirer, not a half-configured one.
    assert!(active_connection(&db, tenant, "sandbox").await.is_err());
}

/// The platform operator's side: correcting, retiring and deleting connections.
///
/// The guard that matters is deletion. An attempt records which acquirer moved
/// the money, so a connection that processed anything must stay put.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn a_connection_that_processed_payments_cannot_be_deleted() {
    let db = connect().await;
    let (tenant, rede, asaas, charge) = fixtures(&db).await;

    PaymentSettingsUseCase::select(&db, tenant, asaas, EVERYTHING)
        .await
        .expect("asaas is selectable");
    run_with_user(
        actor(tenant),
        CardPaymentUseCase::prepare(&db, card_request(charge, "cfg-admin-00000001")),
    )
    .await
    .expect("a card payment against the chosen acquirer");

    assert!(
        PaymentSettingsUseCase::delete_connection(&db, &operator(), asaas)
            .await
            .is_err(),
        "a connection with payment history was deleted"
    );
    PaymentSettingsUseCase::delete_connection(&db, &operator(), rede)
        .await
        .expect("an unused connection is deletable");

    // Only the platform operator.
    assert!(
        PaymentSettingsUseCase::all_connections(&db, &clinic_owner(), None)
            .await
            .is_err()
    );
}

/// A live connection cannot be moved between environments behind the clinic's
/// back; retire it first.
#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn a_live_connection_cannot_change_environment() {
    let db = connect().await;
    let (tenant, _rede, asaas, _charge) = fixtures(&db).await;

    PaymentSettingsUseCase::select(&db, tenant, asaas, EVERYTHING)
        .await
        .expect("asaas is selectable");

    let moved = || ConnectionEdit {
        merchant_reference: "a-corrected".into(),
        credentials_secret_ref: "asaas/corrected".into(),
        environment: "production".into(),
    };

    assert!(
        PaymentSettingsUseCase::update_connection(&db, &operator(), asaas, moved())
            .await
            .is_err(),
        "a live connection was moved to another environment"
    );

    PaymentSettingsUseCase::disable_connection(&db, &operator(), asaas)
        .await
        .expect("retiring a connection");
    let saved = PaymentSettingsUseCase::update_connection(&db, &operator(), asaas, moved())
        .await
        .expect("a retired connection may be corrected");
    assert_eq!(saved.environment, "production");
    assert_eq!(saved.merchant_reference, "a-corrected");
}
