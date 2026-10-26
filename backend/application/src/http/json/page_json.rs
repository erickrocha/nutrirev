use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PageJson<T> {
    pub content: Vec<T>,
    pub page: u64,
    pub size: u64,
    pub total_elements: u64,
    pub total_pages: u64,
}
