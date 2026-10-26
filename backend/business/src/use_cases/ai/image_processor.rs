use crate::domain::ai_provider::ProviderError;
use image::codecs::jpeg::JpegEncoder;
use image::GenericImageView;
use std::io::Cursor;

pub struct ImageProcessor;

const MAX_UPLOAD_SIZE: usize = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSION: u32 = 1560; // Optimal vision model dimension
const JPEG_QUALITY: u8 = 75; // Balances vision-model detail against upload/storage size

impl ImageProcessor {
    pub fn process(raw_bytes: &[u8]) -> Result<(Vec<u8>, String), ProviderError> {
        if raw_bytes.is_empty() {
            return Err(ProviderError::invalid_image("Image bytes cannot be empty"));
        }

        if raw_bytes.len() > MAX_UPLOAD_SIZE {
            return Err(ProviderError::invalid_image(format!(
                "Image size ({} bytes) exceeds maximum allowed size of 10MB",
                raw_bytes.len()
            )));
        }

        let img = image::load_from_memory(raw_bytes).map_err(|e| {
            ProviderError::invalid_image(format!("Failed to decode image format: {}", e))
        })?;

        let (width, height) = img.dimensions();

        let processed_img = if width > MAX_DIMENSION || height > MAX_DIMENSION {
            img.resize(MAX_DIMENSION, MAX_DIMENSION, image::imageops::FilterType::Triangle)
        } else {
            img
        };

        let mut output_bytes = Vec::new();
        let mut cursor = Cursor::new(&mut output_bytes);

        processed_img
            .write_with_encoder(JpegEncoder::new_with_quality(&mut cursor, JPEG_QUALITY))
            .map_err(|e| ProviderError::invalid_image(format!("Failed to re-encode image: {}", e)))?;

        Ok((output_bytes, "image/jpeg".to_string()))
    }
}
