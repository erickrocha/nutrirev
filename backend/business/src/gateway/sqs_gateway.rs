use crate::domain::business_error::BusinessError;
use aws_sdk_sqs::Client;

pub struct SqsGateway {}

impl SqsGateway {
    /// Long-polls the queue and returns up to `max_messages` (<= 10) messages.
    /// `wait_time_seconds` controls the long-poll duration (1-20 s).
    pub async fn receive_messages(
        client: &Client,
        queue_url: &str,
        max_messages: i32,
        wait_time_seconds: i32,
    ) -> Result<Vec<aws_sdk_sqs::types::Message>, BusinessError> {
        let output = client
            .receive_message()
            .queue_url(queue_url)
            .max_number_of_messages(max_messages)
            .wait_time_seconds(wait_time_seconds)
            .send()
            .await
            .map_err(|e| {
                let msg = format!("Failed to receive SQS messages: {e:?}");
                log::error!("[SqsGateway::receive_messages] {}", msg);
                BusinessError::new(msg)
            })?;

        Ok(output.messages.unwrap_or_default())
    }

    /// Acknowledges (deletes) a successfully processed message from the queue.
    pub async fn delete_message(
        client: &Client,
        queue_url: &str,
        receipt_handle: &str,
    ) -> Result<(), BusinessError> {
        client
            .delete_message()
            .queue_url(queue_url)
            .receipt_handle(receipt_handle)
            .send()
            .await
            .map_err(|e| {
                let msg = format!("Failed to delete SQS message: {e:?}");
                log::error!("[SqsGateway::delete_message] {}", msg);
                BusinessError::new(msg)
            })?;
        Ok(())
    }
}
