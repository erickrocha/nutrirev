use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CityJson {
    pub id: Option<i32>,
    pub uuid: Option<String>,
    pub province_id: i32,
    pub name: String,
}
