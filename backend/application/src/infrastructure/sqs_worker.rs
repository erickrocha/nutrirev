use business::sea_orm::DatabaseConnection;
use business::use_cases::sqs_consumer_use_case::SqsConsumerUseCase;
use std::sync::Arc;
use tokio::time::{sleep, Duration};

/// Spawns a background Tokio task that continuously polls SQS and processes
/// `ObjectCreated` S3 event notifications.
pub fn start(db: Arc<DatabaseConnection>) {
    tokio::spawn(async move {
        log::info!("SQS consumer worker starting...");

        loop {
            match SqsConsumerUseCase::poll_and_process(&db).await {
                Ok(0) => {
                    // Queue was empty or not configured.
                    sleep(Duration::from_secs(5)).await;
                }
                Ok(count) => {
                    log::info!("SQS consumer processed {} message(s)", count);
                }
                Err(e) => {
                    log::error!(
                        "SQS consumer encountered an error - backing off 5 s: {:?}",
                        e
                    );
                    sleep(Duration::from_secs(5)).await;
                }
            }
        }
    });
}
