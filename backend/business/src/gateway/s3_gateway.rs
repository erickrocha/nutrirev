use std::time::Duration;
use crate::domain::business_error::BusinessError;
use aws_sdk_s3::presigning::PresigningConfig;
use aws_sdk_s3::Client;

pub struct S3Gateway {}

impl S3Gateway {
    pub async fn put_object(
        client: &Client,
        bucket: &str,
        object: &str,
        content_type: &str,
        expires_in: Duration,
    ) -> Result<String, BusinessError> {
        log::info!("[S3Gateway::put_object] Generating presigned PUT URL for key: {}", object);
        let expires_in: PresigningConfig =
            PresigningConfig::expires_in(expires_in).map_err(|err| {
                let msg = format!("Failed to convert expiration to PresigningConfig: {err:?}");
                log::error!("[S3Gateway::put_object] {}", msg);
                BusinessError::new(msg)
            })?;
        let presigned_request = client
            .put_object()
            .bucket(bucket)
            .key(object)
            .content_type(content_type)
            .presigned(expires_in)
            .await;

        match presigned_request {
            Ok(req) => Ok(req.uri().into()),
            Err(e) => {
                let msg = format!("Failed to generate pre-signed URL: {e:?}");
                log::error!("[S3Gateway::put_object] {}", msg);
                Err(BusinessError::new(msg))
            }
        }
    }

    pub async fn get_object(
        client: &Client,
        bucket: &str,
        object: &str,
        expires_in: Duration,
    ) -> Result<String, BusinessError> {
        log::info!("[S3Gateway::get_object] Generating presigned GET URL for key: {}", object);
        let expires_in: PresigningConfig =
            PresigningConfig::expires_in(expires_in).map_err(|err| {
                let msg = format!("Failed to convert expiration to PresigningConfig: {err:?}");
                log::error!("[S3Gateway::get_object] {}", msg);
                BusinessError::new(msg)
            })?;
        let presigned_request = client
            .get_object()
            .bucket(bucket)
            .key(object)
            .presigned(expires_in)
            .await;

        match presigned_request {
            Ok(req) => Ok(req.uri().into()),
            Err(e) => {
                let msg = format!("Failed to generate pre-signed URL: {e:?}");
                log::error!("[S3Gateway::get_object] {}", msg);
                Err(BusinessError::new(msg))
            }
        }
    }

    pub async fn delete_object(
        client: &Client,
        bucket: &str,
        object: &str,
    ) -> Result<(), BusinessError> {
        log::info!("[S3Gateway::delete_object] Deleting object key: {}", object);
        let result = client
            .delete_object()
            .bucket(bucket)
            .key(object)
            .send()
            .await;
        if let Err(e) = result {
            let msg = format!("Failed to delete object from S3: {e:?}");
            log::error!("[S3Gateway::delete_object] {}", msg);
            return Err(BusinessError::new(msg));
        }
        Ok(())
    }
}
