use chrono::{NaiveDate, NaiveDateTime};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreatePlanOrderJson {
    pub plan_uuid: String,
    pub tax_id: String,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub street: String,
    pub number: String,
    pub complement: Option<String>,
    pub neighborhood: Option<String>,
    pub city: String,
    pub state: String,
    pub postal_code: String,
    /// `en` envia o e-mail de confirmação em inglês; qualquer outro valor, em português.
    pub language: Option<String>,
    /// Campo-isca: humanos não preenchem. Se vier preenchido, o pedido é descartado.
    pub website: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PlanOrderCreatedJson {
    pub uuid: String,
}

/// Plano exibido na tela de contratação (uuid incluído, ao contrário da vitrine da landing).
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PublicPlanDetailJson {
    pub uuid: String,
    pub name: String,
    pub price_in_cents: i64,
    pub available_users: i32,
    pub period_days: i32,
    pub daily_ai_quota: i32,
    pub tiers: Vec<super::business_plan_json::BusinessPlanTierJson>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PlanOrderJson {
    pub uuid: String,
    pub plan_name: String,
    pub price_in_cents: i64,
    pub status: String,
    pub tax_id: String,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub address_line1: String,
    pub address_line2: Option<String>,
    pub locality: String,
    pub administrative_area: String,
    pub postal_code: String,
    pub tenant_id: Option<i32>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ConvertPlanOrderJson {
    /// Primeiro vencimento da mensalidade da clínica.
    pub payment_date: NaiveDate,
}
