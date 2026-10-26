use business::gateway::asaas_processor::AsaasProcessor;
use business::gateway::billing_gateway::BillingGateway;
use business::gateway::payment_provider_factory::{active_connection, asaas_client};
use business::gateway::payment_secret_resolver::EnvironmentPaymentSecretResolver;
use business::sea_orm::{ConnectionTrait, DatabaseConnection, Statement, TryGetable};
use business::use_cases::card_on_file_use_case::{CardOnFileUseCase, UnattendedReport};
use business::use_cases::payment_schedule_use_case::PaymentScheduleUseCase;
use business::use_cases::pix_payment_use_case::provider_environment;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::time::{sleep, Duration};

/// How often a tick runs. Hourly rather than daily so a payment made in the
/// morning restores access the same day; the work itself is keyed on dates, so
/// running it more often changes nothing but the latency.
const TICK_INTERVAL: Duration = Duration::from_secs(60 * 60);
const BACKOFF: Duration = Duration::from_secs(60);

/// Advisory lock name. Best-effort only — see the note in `run_tick`.
const LOCK_NAME: &str = "nutrirev_billing";

/// Spawns the recurring billing job: generate the charges each subscription
/// owes, age the past-due ones, and block or restore app access accordingly.
pub fn start(db: Arc<DatabaseConnection>) {
    tokio::spawn(async move {
        log::info!("Billing worker starting...");

        loop {
            match run_tick(&db).await {
                Ok(Some(report)) => {
                    if report.charges_created > 0
                        || report.charges_marked_overdue > 0
                        || report.users_blocked > 0
                        || report.users_unblocked > 0
                        || report.attempts_expired > 0
                    {
                        log::info!(
                            "Billing tick: {} charge(s) created, {} marked overdue, {} user(s) blocked, {} unblocked, {} abandoned attempt(s) released",
                            report.charges_created,
                            report.charges_marked_overdue,
                            report.users_blocked,
                            report.users_unblocked,
                            report.attempts_expired
                        );
                    }
                    sleep(TICK_INTERVAL).await;
                }
                Ok(None) => {
                    // Another instance holds the lock; try again shortly.
                    sleep(BACKOFF).await;
                }
                Err(e) => {
                    log::error!("Billing worker tick failed - backing off 60 s: {:?}", e);
                    sleep(BACKOFF).await;
                }
            }
        }
    });
}

/// Runs one tick, returning `None` when another instance already holds the lock.
///
/// The lock is a courtesy, not a guarantee: `GET_LOCK` is scoped to a single
/// connection and SeaORM hands out pooled ones, so two instances can hold it at
/// once. Correctness comes from the database instead — `uq_pc_cycle` makes
/// charge generation idempotent, and the overdue/blocking passes are conditional
/// set-based updates that converge on the same result however many times they
/// run.
async fn run_tick(
    db: &DatabaseConnection,
) -> Result<Option<business::use_cases::payment_schedule_use_case::BillingTickReport>, business::sea_orm::DbErr>
{
    if !try_lock(db).await? {
        return Ok(None);
    }

    let today = chrono::Utc::now().date_naive();
    let result = PaymentScheduleUseCase::run_tick(db, today).await;

    // After the tick, never before: the charges owed today have to exist and be
    // aged before anything tries to collect them. A stored-card failure here is
    // not an emergency — the charge stays open and the clinic's grace period
    // decides access, exactly as it does for a patient who never pays.
    if result.is_ok() {
        match charge_stored_cards(db, today).await {
            Ok(report) if report.charged > 0 || report.declined > 0 || report.uncertain > 0 => {
                log::info!(
                    "Stored-card billing: {} charged, {} declined, {} needing reconciliation",
                    report.charged,
                    report.declined,
                    report.uncertain
                );
            }
            Ok(_) => {}
            Err(e) => log::error!("Stored-card billing pass failed: {:?}", e),
        }
    }

    // Released even when the tick failed, so a transient error does not park the
    // lock until this connection is recycled.
    if let Err(e) = db
        .execute_unprepared(&format!("SELECT RELEASE_LOCK('{}')", LOCK_NAME))
        .await
    {
        log::warn!("Billing worker could not release its lock: {:?}", e);
    }

    result.map(Some)
}

/// Charges every subscription set to pay itself.
///
/// The provider client is built per clinic, from that clinic's own merchant row
/// and secret — never one shared connection. A clinic with no usable connection
/// is skipped rather than failing the pass for everyone else.
async fn charge_stored_cards(
    db: &DatabaseConnection,
    today: chrono::NaiveDate,
) -> Result<UnattendedReport, business::sea_orm::DbErr> {
    let environment = provider_environment();
    // One client per clinic, resolved from that clinic's live connection and its
    // own secret. A clinic usually owes more than one charge, and each would
    // otherwise re-read the same secret.
    let mut clients: HashMap<i32, Option<Arc<AsaasProcessor>>> = HashMap::new();

    for due in BillingGateway::card_on_file_due(db, today).await? {
        if clients.contains_key(&due.tenant_id) {
            continue;
        }
        let client = match active_connection(db, due.tenant_id, &environment).await {
            Ok(connection) if connection.capabilities.recurring => {
                asaas_client(&connection, &EnvironmentPaymentSecretResolver)
                    .ok()
                    .map(Arc::new)
            }
            // The clinic turned recurring off, or moved to an acquirer that
            // cannot store cards. Skipped rather than failing the pass for
            // everyone else: the charge stays open and the grace period decides.
            Ok(_) => None,
            Err(_) => None,
        };
        if client.is_none() {
            log::warn!(
                "Stored-card billing: no usable connection for tenant {}",
                due.tenant_id
            );
        }
        clients.insert(due.tenant_id, client);
    }

    CardOnFileUseCase::charge_due_subscriptions(db, today, |due| {
        clients.get(&due.tenant_id).cloned().flatten()
    })
    .await
}

async fn try_lock(db: &DatabaseConnection) -> Result<bool, business::sea_orm::DbErr> {
    let row = db
        .query_one_raw(Statement::from_string(
            db.get_database_backend(),
            format!("SELECT GET_LOCK('{}', 0) AS acquired", LOCK_NAME),
        ))
        .await?;
    let Some(row) = row else {
        return Ok(false);
    };
    Ok(i64::try_get(&row, "", "acquired").unwrap_or(0) == 1)
}
