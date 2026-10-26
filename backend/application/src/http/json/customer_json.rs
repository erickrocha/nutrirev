use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, Debug, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CustomerJson {
    pub id: Option<i32>,
    pub uuid: Option<String>,
    pub tenant_id: Option<i32>,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub date_of_birth: chrono::NaiveDate,
    pub gender: String,
    pub address_line1: Option<String>,
    pub address_line2: Option<String>,
    pub locality: Option<String>,
    pub administrative_area: Option<String>,
    pub postal_code: Option<String>,
    pub country_code: Option<String>,
    pub province: Option<String>,
    pub city: Option<String>,
    pub zipcode: Option<String>,
    pub clinical_plan_id: Option<i32>,
    pub prepare_meal_id: Option<i32>,
    pub mobile_enabled: Option<bool>,
    pub photo: Option<String>,
    pub photo_url: Option<String>,
    pub photo_base64: Option<String>,
    pub user_id: Option<i32>,
    /// CPF/CNPJ. Accepted in any formatting and stored digits-only.
    /// `provider_customer_id` is deliberately absent: it is provider state the
    /// server owns, and a request must never be able to set or clear it.
    pub tax_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<chrono::NaiveDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_by: Option<String>,
}
