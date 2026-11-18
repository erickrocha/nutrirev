use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Salvando ou atualizando configurações e credenciais da Stripe do tenant (estilo Novgorod).
#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SavePaymentSettingsJson {
    pub tenant_id: Option<i32>,
    /// Chave secreta da Stripe (`sk_...`). Pode ser deixada vazia em atualizações para manter a existente.
    pub secret_key: Option<String>,
    /// Chave publicável da Stripe (`pk_...`).
    pub publishable_key: Option<String>,
    /// Segredo de verificação do webhook da Stripe (`whsec_...`). Pode ser deixado vazio para manter o existente.
    pub webhook_secret: Option<String>,
    pub credit_enabled: Option<bool>,
    pub pix_enabled: Option<bool>,
    pub recurring_enabled: Option<bool>,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PaymentSettingsResponseJson {
    pub configured: bool,
    pub provider: String,
    pub environment: String,
    pub publishable_key: Option<String>,
    pub credit_enabled: bool,
    pub pix_enabled: bool,
    pub recurring_enabled: bool,
    pub supports_pix: bool,
    pub supports_recurring: bool,
}

/// What the clinic currently accepts, as the checkout needs to know it.
#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct OfferedMethodsJson {
    pub credit: bool,
    pub pix: bool,
    pub recurring: bool,
}
