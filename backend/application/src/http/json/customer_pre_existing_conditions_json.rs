use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CustomerPreExistingConditionsJson {
    pub customer_id: i32,
    pub pre_existing_conditions_id: i32,
}
