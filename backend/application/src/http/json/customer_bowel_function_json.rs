use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CustomerBowelFunctionJson {
    pub customer_id: i32,
    pub bowel_function_id: i32,
}
