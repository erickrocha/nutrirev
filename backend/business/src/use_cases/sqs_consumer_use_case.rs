use crate::domain::business_error::BusinessError;
use crate::gateway::sqs_gateway::SqsGateway;
use aws_config::BehaviorVersion;
use aws_sdk_sqs::Client as SqsClient;
use entity::{customer_entity, eat_entity};
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, EntityTrait, QueryFilter, Set};
use serde::Deserialize;
use std::env;

const AWS_SQS_QUEUE_URL: &str = "AWS_SQS_QUEUE_URL";

#[derive(Debug, Deserialize)]
struct S3Event {
    #[serde(rename = "Records")]
    records: Vec<S3EventRecord>,
}

#[derive(Debug, Deserialize)]
struct S3EventRecord {
    #[serde(rename = "eventName")]
    event_name: String,
    s3: S3EventData,
}

#[derive(Debug, Deserialize)]
struct S3EventData {
    bucket: S3BucketData,
    object: S3ObjectData,
}

#[derive(Debug, Deserialize)]
struct S3BucketData {
    name: String,
}

#[derive(Debug, Deserialize)]
struct S3ObjectData {
    key: String
}

#[derive(Debug, Deserialize)]
struct SnsEnvelope {
    #[serde(rename = "Message")]
    message: String,
}

pub struct SqsConsumerUseCase {}

impl SqsConsumerUseCase {
    async fn create_sqs_client() -> SqsClient {
        let shared_config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        SqsClient::new(&shared_config)
    }

    pub async fn poll_and_process(db: &DbConn) -> Result<usize, BusinessError> {
        let queue_url = match env::var(AWS_SQS_QUEUE_URL) {
            Ok(v) if !v.is_empty() => v,
            _ => {
                log::debug!("[SqsConsumerUseCase::poll_and_process] AWS_SQS_QUEUE_URL not set - SQS consumer sleeping");
                return Ok(0);
            }
        };

        let sqs_client = Self::create_sqs_client().await;

        let messages = SqsGateway::receive_messages(&sqs_client, &queue_url, 10, 20).await?;
        if messages.is_empty() {
            return Ok(0);
        }

        let mut processed = 0usize;

        for message in messages {
            let receipt_handle = match message.receipt_handle() {
                Some(rh) => rh.to_string(),
                None => continue,
            };

            let body = match message.body() {
                Some(b) => b.to_string(),
                None => {
                    let _ = SqsGateway::delete_message(&sqs_client, &queue_url, &receipt_handle).await;
                    continue;
                }
            };

            match Self::process_message(db, &body).await {
                Ok(_) => {
                    let _ = SqsGateway::delete_message(&sqs_client, &queue_url, &receipt_handle).await;
                    processed += 1;
                }
                Err(e) => {
                    log::error!("[SqsConsumerUseCase::poll_and_process] Failed to process SQS message: {:?}", e);
                }
            }
        }

        Ok(processed)
    }

    async fn process_message(db: &DbConn, body: &str) -> Result<(), BusinessError> {
        let event_json = Self::unwrap_sns_envelope(body);

        let event: S3Event = match serde_json::from_str(&event_json) {
            Ok(e) => e,
            Err(e) => {
                log::error!("[SqsConsumerUseCase::process_message] Malformed S3 event body: {}", e);
                return Ok(());
            }
        };

        for record in event.records {
            if !record.event_name.starts_with("ObjectCreated") {
                continue;
            }

            let raw_key = &record.s3.object.key;
            let object_key = urlencoding::decode(raw_key)
                .map(|cow| cow.into_owned())
                .unwrap_or_else(|_| raw_key.clone());

            log::info!(
                "[SqsConsumerUseCase::process_message] Processing S3 ObjectCreated: bucket={} key={}",
                record.s3.bucket.name,
                object_key
            );

            Self::update_entity_photo(db, &object_key).await?;
        }

        Ok(())
    }

    async fn update_entity_photo(db: &DbConn, object_key: &str) -> Result<(), BusinessError> {
        // Expected patterns:
        // uploads/customer-{id}/{uuid}.{ext}
        // uploads/eat-{id}/{uuid}.{ext}
        let parts: Vec<&str> = object_key.split('/').collect();
        if parts.len() < 3 || parts[0] != "uploads" {
            log::warn!("[SqsConsumerUseCase::update_entity_photo] Ignoring key format: {}", object_key);
            return Ok(());
        }

        let target_folder = parts[1]; // e.g. "customer-12" or "eat-5"
        if let Some(id_str) = target_folder.strip_prefix("customer-") {
            if let Ok(customer_id) = id_str.parse::<i32>() {
                if let Ok(Some(model)) = customer_entity::Entity::find()
                    .filter(customer_entity::Column::Id.eq(customer_id))
                    .one(db)
                    .await
                {
                    let mut active: customer_entity::ActiveModel = model.into();
                    active.photo = Set(Some(object_key.to_string()));
                    let _ = active.update(db).await;
                    log::info!("[SqsConsumerUseCase::update_entity_photo] Updated customer id={} photo to '{}'", customer_id, object_key);
                }
            }
        } else if let Some(id_str) = target_folder.strip_prefix("eat-") {
            if let Ok(eat_id) = id_str.parse::<i32>() {
                if let Ok(Some(model)) = eat_entity::Entity::find()
                    .filter(eat_entity::Column::Id.eq(eat_id))
                    .one(db)
                    .await
                {
                    let mut active: eat_entity::ActiveModel = model.into();
                    active.photo = Set(Some(object_key.to_string()));
                    let _ = active.update(db).await;
                    log::info!("[SqsConsumerUseCase::update_entity_photo] Updated eat id={} photo to '{}'", eat_id, object_key);
                }
            }
        }

        Ok(())
    }

    fn unwrap_sns_envelope(body: &str) -> String {
        if let Ok(envelope) = serde_json::from_str::<SnsEnvelope>(body) {
            if envelope.message.trim_start().starts_with('{') {
                return envelope.message;
            }
        }
        body.to_string()
    }
}
