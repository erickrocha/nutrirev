use crate::http::json::tenant_subscription_json::TenantSubscriptionStatusJson;
use business::domain::enums::Role;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AccessTokenJson {
    pub access_token: String,
    pub token_type: String,
    pub expire_in: i64,
    pub refresh_token: Option<String>,
    pub email: String,
    pub uuid: String,
    pub name: String,
    pub user_id: i32,
    pub role: Role,
    pub tenant_id: Option<i32>,
    pub first_login: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscription_status: Option<TenantSubscriptionStatusJson>,
}
