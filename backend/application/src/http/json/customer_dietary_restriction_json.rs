use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CustomerDietaryRestrictionJson {
    pub customer_id: i32,
    pub dietary_restriction_id: i32,
}
