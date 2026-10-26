use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DoctorJson {
    pub id: Option<i32>,
    pub uuid: Option<String>,
    pub tenant_id: Option<i32>,
    pub name: String,
    pub document: Option<String>,
    pub date_of_birth: Option<chrono::NaiveDate>,
    pub photo_base64: Option<String>,
    pub city: Option<String>,
    pub province: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_by: Option<String>,
}
