use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Provisioning a connection. Platform operator only.
///
/// `credentialsSecretRef` is a *pointer* to a secret held by the deployment, not
/// the secret. Credentials never travel through a request.
#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProvisionConnectionJson {
    pub tenant_id: i32,
    pub provider: String,
    pub environment: String,
    pub merchant_reference: String,
    pub credentials_secret_ref: String,
}

/// Correcting a provisioned connection. `provider` is absent on purpose: an
/// attempt records which acquirer processed it, so a different acquirer is a
/// different connection, not an edit.
#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct UpdateConnectionJson {
    pub merchant_reference: String,
    pub credentials_secret_ref: String,
    pub environment: String,
}

/// The clinic choosing its acquirer and the methods it offers.
#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SelectConnectionJson {
    /// Which clinic. Staff leave it out — theirs is the only one they may
    /// touch; the platform operator, supporting a clinic, names it.
    pub tenant_id: Option<i32>,
    pub merchant_id: i32,
    pub credit_enabled: bool,
    pub pix_enabled: bool,
    pub recurring_enabled: bool,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PaymentConnectionJson {
    pub id: i32,
    pub tenant_id: i32,
    /// Where the credentials come from — a pointer, never the secret itself.
    /// Operator-only: it names a deployment secret, so the clinic's own list
    /// leaves it null.
    pub credentials_secret_ref: Option<String>,
    pub provider: String,
    pub environment: String,
    pub merchant_reference: String,
    /// Whether this is the clinic's live acquirer. At most one is.
    pub active: bool,
    pub credit_enabled: bool,
    pub pix_enabled: bool,
    pub recurring_enabled: bool,
    /// What this acquirer is capable of, regardless of what is switched on.
    /// The UI uses it to grey out a toggle instead of letting someone set
    /// something that would be refused.
    pub supports_pix: bool,
    pub supports_recurring: bool,
}

/// What the clinic currently accepts, as the checkout needs to know it.
///
/// Deliberately says nothing about the acquirer: a patient has no business
/// knowing which processor their clinic uses.
#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct OfferedMethodsJson {
    pub credit: bool,
    pub pix: bool,
    pub recurring: bool,
}
