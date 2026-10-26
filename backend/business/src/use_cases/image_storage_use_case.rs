use crate::domain::business_error::BusinessError;
use aws_config::BehaviorVersion;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::Client;
use cloudfront_sign::{get_signed_url, SignedOptions};
use std::borrow::Cow;
use std::env;
use uuid::Uuid;

const AWS_S3_BUCKET: &str = "AWS_S3_BUCKET";
const CLOUDFRONT_KEY_PAIR_ID: &str = "CLOUDFRONT_KEY_PAIR_ID";
const CLOUDFRONT_DOMAIN: &str = "CLOUDFRONT_DOMAIN";
const PRIVATE_KEY_RAW: &str = "PRIVATE_KEY_RAW";

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum StorageMode {
    S3,
    Base64,
}

pub struct ImageStorageUseCase;

impl ImageStorageUseCase {
    /// Returns current storage mode configured via IMAGE_STORAGE_MODE or PHOTO_STORAGE_MODE env var.
    pub fn get_storage_mode() -> StorageMode {
        let mode = env::var("IMAGE_STORAGE_MODE")
            .or_else(|_| env::var("PHOTO_STORAGE_MODE"))
            .unwrap_or_default()
            .to_lowercase();
        match mode.as_str() {
            "base64" | "db" | "database" | "binary" => StorageMode::Base64,
            _ => StorageMode::S3,
        }
    }

    /// Returns the storage mode for meal_log photos, configured via
    /// MEAL_LOG_PHOTO_STORAGE_MODE. Independent of `get_storage_mode()` (which governs
    /// customer/eat photos) and defaults to Base64 rather than S3.
    pub fn get_meal_log_storage_mode() -> StorageMode {
        let mode = env::var("MEAL_LOG_PHOTO_STORAGE_MODE").unwrap_or_default().to_lowercase();
        match mode.as_str() {
            "s3" => StorageMode::S3,
            _ => StorageMode::Base64,
        }
    }

    /// Generates an S3 object key for an entity:
    /// `uploads/{entity_type}-{entity_id}/{uuid}.{ext}`
    pub fn generate_object_key(entity_type: &str, entity_id: i32, extension: &str) -> String {
        let uuid = Uuid::new_v4();
        let ext = extension.trim_start_matches('.');
        format!("uploads/{}-{}/{}.{}", entity_type, entity_id, uuid, ext)
    }

    /// Generates an S3 object key for a customer photo:
    /// `uploads/customer-{customer_id}/{uuid}.{ext}`
    pub fn generate_customer_object_key(customer_id: i32, extension: &str) -> String {
        log::info!("[ImageStorageUseCase::generate_customer_object_key] Executing for customer_id: {}", customer_id);
        Self::generate_object_key("customer", customer_id, extension)
    }

    /// Infers correct MIME Content-Type from extension if missing or generic.
    pub fn infer_content_type(extension: &str, content_type: Option<&str>) -> String {
        if let Some(ct) = content_type {
            if !ct.trim().is_empty() && ct != "application/octet-stream" {
                return ct.to_string();
            }
        }
        let ext = extension.trim_start_matches('.').to_lowercase();
        match ext.as_str() {
            "webp" => "image/webp".to_string(),
            "png" => "image/png".to_string(),
            "gif" => "image/gif".to_string(),
            "svg" => "image/svg+xml".to_string(),
            "jpg" | "jpeg" => "image/jpeg".to_string(),
            _ => "image/jpeg".to_string(),
        }
    }

    /// Resolves the configured S3 bucket name. The bucket is provisioned out-of-band
    /// (Terraform/console), so this just validates the env var is present.
    fn bucket_name() -> Result<String, BusinessError> {
        env::var(AWS_S3_BUCKET).map_err(|_| BusinessError::new(format!("{} must be set", AWS_S3_BUCKET)))
    }

    /// Generates a Pre-Signed S3 PUT URL allowing the client to upload binary data directly to S3.
    pub async fn generate_presigned_upload_url(
        entity_type: &str,
        entity_id: i32,
        extension: &str,
        raw_content_type: &str,
    ) -> Result<(String, String), BusinessError> {
        let content_type = Self::infer_content_type(extension, Some(raw_content_type));
        log::info!(
            "[ImageStorageUseCase::generate_presigned_upload_url] Generating presigned PUT URL for {} id: {} with content_type: {}",
            entity_type, entity_id, content_type
        );
        let object_key = Self::generate_object_key(entity_type, entity_id, extension);
        let bucket = Self::bucket_name()?;
        let client = Self::create_s3_client().await;

        let presigned_url = crate::gateway::s3_gateway::S3Gateway::put_object(
            &client,
            &bucket,
            &object_key,
            &content_type,
            std::time::Duration::from_secs(900), // 15 minutes
        )
        .await?;

        Ok((presigned_url, object_key))
    }

    /// Verifies that an object was actually uploaded to S3 before trusting a client-reported key.
    pub async fn verify_object_exists(object_key: &str) -> Result<(), BusinessError> {
        let bucket = Self::bucket_name()?;
        let client = Self::create_s3_client().await;

        client
            .head_object()
            .bucket(&bucket)
            .key(object_key)
            .send()
            .await
            .map_err(|e| {
                log::warn!(
                    "[ImageStorageUseCase::verify_object_exists] Object not found in S3 ({}/{}): {:?}",
                    bucket, object_key, e
                );
                BusinessError::new(format!("Uploaded object '{}' was not found in S3 - upload may have failed", object_key))
            })?;

        Ok(())
    }

    /// Creates an AWS S3 client using the standard AWS credential/config chain.
    async fn create_s3_client() -> Client {
        let shared_config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        Client::new(&shared_config)
    }

    /// Uploads raw image bytes to S3.
    pub async fn upload_object(object_key: &str, bytes: Vec<u8>, content_type: &str) -> Result<(), BusinessError> {
        log::info!("[ImageStorageUseCase::upload_object] Executing upload_object for key: {}", object_key);
        let bucket = Self::bucket_name()?;
        let client = Self::create_s3_client().await;

        let body = ByteStream::from(bytes);
        let res = client
            .put_object()
            .bucket(&bucket)
            .key(object_key)
            .content_type(content_type)
            .body(body)
            .send()
            .await;

        match res {
            Ok(_) => {
                log::info!("[ImageStorageUseCase::upload_object] Successfully uploaded object to S3: {}/{}", bucket, object_key);
                Ok(())
            }
            Err(e) => {
                log::error!("[ImageStorageUseCase::upload_object] Error uploading object to S3: {:?}", e);
                Err(BusinessError::new(format!("Failed to upload object to S3: {}", e)))
            }
        }
    }

    /// Removes an object from S3. Usado no atendimento a pedido de exclusão de
    /// conta, onde a imagem tem de sair do armazenamento e não só do banco.
    pub async fn delete_object(object_key: &str) -> Result<(), BusinessError> {
        log::info!("[ImageStorageUseCase::delete_object] Executing delete_object for key: {}", object_key);
        let bucket = Self::bucket_name()?;
        let client = Self::create_s3_client().await;

        client
            .delete_object()
            .bucket(&bucket)
            .key(object_key)
            .send()
            .await
            .map_err(|e| {
                log::error!("[ImageStorageUseCase::delete_object] Error deleting object from S3 ({}/{}): {:?}", bucket, object_key, e);
                BusinessError::new(format!("Failed to delete object from S3: {}", e))
            })?;

        log::info!("[ImageStorageUseCase::delete_object] Deleted object from S3: {}/{}", bucket, object_key);
        Ok(())
    }

    /// Generates a CloudFront signed URL for an S3 object key.
    pub fn generate_cloudfront_signed_url(object_key: &str) -> Result<String, BusinessError> {
        log::info!("[ImageStorageUseCase::generate_cloudfront_signed_url] Executing for object_key: {}", object_key);
        let domain = env::var(CLOUDFRONT_DOMAIN).map_err(|_| BusinessError::new(format!("{} must be set", CLOUDFRONT_DOMAIN)))?;
        let key_id = env::var(CLOUDFRONT_KEY_PAIR_ID).map_err(|_| BusinessError::new(format!("{} must be set", CLOUDFRONT_KEY_PAIR_ID)))?;
        let raw_key = env::var(PRIVATE_KEY_RAW).map_err(|_| BusinessError::new(format!("{} must be set", PRIVATE_KEY_RAW)))?;

        let resource_url = format!("{}/{}", domain.trim_end_matches('/'), object_key);
        let private_key_pem = raw_key.replace("\\n", "\n");
        let options = SignedOptions {
            key_pair_id: Cow::from(key_id),
            private_key: Cow::from(private_key_pem.trim().to_string()),
            ..Default::default()
        };

        get_signed_url(&resource_url, &options).map_err(|e| {
            log::error!("[ImageStorageUseCase::generate_cloudfront_signed_url] CloudFront signing failed: {:?}", e);
            BusinessError::new(format!("Failed to generate CloudFront signed URL: {:?}", e))
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_storage_mode_resolution() {
        env::set_var("IMAGE_STORAGE_MODE", "base64");
        assert_eq!(ImageStorageUseCase::get_storage_mode(), StorageMode::Base64);

        env::set_var("IMAGE_STORAGE_MODE", "s3");
        assert_eq!(ImageStorageUseCase::get_storage_mode(), StorageMode::S3);
    }
}

