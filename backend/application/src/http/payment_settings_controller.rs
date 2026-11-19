use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::payment_settings_json::{
    OfferedMethodsJson, PaymentSettingsResponseJson, SavePaymentSettingsJson,
};
use crate::infrastructure::payment_credentials::StripeTenantCredentials;
use crate::AppState;
use axum::extract::{Extension, Query, State};
use axum::Json;
use business::domain::card_payment::PaymentScope;
use business::domain::enums::Role;
use business::domain::user::User;
use entity::payment_merchant_entity as merchant;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel, QueryFilter, Set};

#[derive(serde::Deserialize, utoipa::IntoParams)]
#[serde(rename_all = "camelCase")]
pub struct TenantQuery {
    pub tenant_id: Option<i32>,
}

#[utoipa::path(
    get,
    tag = "PaymentSettings",
    path = "/v1/payments/settings",
    params(("tenantId" = Option<i32>, Query, description = "Required for SysAdmin")),
    responses(
        (status = 200, description = "Clinic's Stripe payment settings", body = PaymentSettingsResponseJson),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Clinic staff only")
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_settings(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Query(query): Query<TenantQuery>,
) -> HttpResponse<Json<PaymentSettingsResponseJson>> {
    let tenant_id = staff_scope(&user, locale, query.tenant_id)?;

    let existing = merchant::Entity::find()
        .filter(merchant::Column::TenantId.eq(tenant_id))
        .filter(merchant::Column::Provider.eq("stripe"))
        .one(state.conn.as_ref())
        .await
        .map_err(|_| ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue))?;

    match existing {
        Some(row) => Ok(Json(PaymentSettingsResponseJson {
            configured: row.credentials.is_some(),
            provider: "stripe".to_owned(),
            environment: row.environment,
            publishable_key: row.publishable_key,
            credit_enabled: row.credit_enabled,
            pix_enabled: row.pix_enabled,
            recurring_enabled: row.recurring_enabled,
            supports_pix: true,
            supports_recurring: true,
        })),
        None => Ok(Json(PaymentSettingsResponseJson {
            configured: false,
            provider: "stripe".to_owned(),
            environment: "sandbox".to_owned(),
            publishable_key: None,
            credit_enabled: true,
            pix_enabled: false,
            recurring_enabled: false,
            supports_pix: true,
            supports_recurring: true,
        })),
    }
}

#[utoipa::path(
    put,
    tag = "PaymentSettings",
    path = "/v1/payments/settings",
    request_body = SavePaymentSettingsJson,
    responses(
        (status = 200, description = "Settings saved", body = PaymentSettingsResponseJson),
        (status = 400, description = "Invalid credentials or options"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Clinic staff only")
    ),
    security(("bearer_auth" = []))
)]
pub async fn save_settings(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Json(payload): Json<SavePaymentSettingsJson>,
) -> HttpResponse<Json<PaymentSettingsResponseJson>> {
    let tenant_id = staff_scope(&user, locale, payload.tenant_id)?;

    let existing = merchant::Entity::find()
        .filter(merchant::Column::TenantId.eq(tenant_id))
        .filter(merchant::Column::Provider.eq("stripe"))
        .one(state.conn.as_ref())
        .await
        .map_err(|_| ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue))?;

    // Descriptografar credenciais existentes, se houver
    let current_creds = if let Some(ref m) = existing {
        if let (Some(bytes), Some(ver)) = (&m.credentials, &m.key_version) {
            state.payment_keys.decrypt(tenant_id, ver, bytes).ok()
        } else {
            None
        }
    } else {
        None
    };

    // Montar as novas credenciais
    let secret_key = payload
        .secret_key
        .map(|s| s.trim().to_owned())
        .filter(|s| !s.is_empty())
        .or_else(|| current_creds.as_ref().map(|c| c.secret_key.clone()))
        .unwrap_or_default();

    let publishable_key = payload
        .publishable_key
        .map(|s| s.trim().to_owned())
        .filter(|s| !s.is_empty())
        .or_else(|| current_creds.as_ref().map(|c| c.publishable_key.clone()))
        .unwrap_or_default();

    let webhook_secret = payload
        .webhook_secret
        .map(|s| s.trim().to_owned())
        .filter(|s| !s.is_empty())
        .or_else(|| current_creds.as_ref().map(|c| c.webhook_secret.clone()))
        .unwrap_or_default();

    let creds = StripeTenantCredentials {
        secret_key: secret_key.clone(),
        publishable_key: publishable_key.clone(),
        webhook_secret,
    };

    creds.validate().map_err(|e| {
        log::warn!("[PaymentSettings] validation error: {}", e.message);
        ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue)
    })?;

    let environment = creds.environment().to_owned();

    // Criptografar
    let (key_version, encrypted_bytes) = state
        .payment_keys
        .encrypt(tenant_id, &creds)
        .map_err(|e| {
            log::error!("[PaymentSettings] encryption error: {}", e.message);
            ExceptionResponse::BadRequest(locale, ErrorKey::PaymentProviderUnavailable)
        })?;

    let credit_enabled = payload.credit_enabled.unwrap_or(true);
    let pix_enabled = payload.pix_enabled.unwrap_or(false);
    let recurring_enabled = payload.recurring_enabled.unwrap_or(false) && credit_enabled;

    let now = chrono::Utc::now();

    let saved = match existing {
        Some(row) => {
            let mut active = row.into_active_model();
            active.environment = Set(environment.clone());
            active.credentials = Set(Some(encrypted_bytes));
            active.key_version = Set(Some(key_version));
            active.publishable_key = Set(Some(publishable_key.clone()));
            active.credit_enabled = Set(credit_enabled);
            active.pix_enabled = Set(pix_enabled);
            active.recurring_enabled = Set(recurring_enabled);
            active.status = Set("enabled".to_owned());
            active
                .update(state.conn.as_ref())
                .await
                .map_err(|_| ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue))?
        }
        None => {
            merchant::ActiveModel {
                tenant_id: Set(tenant_id),
                provider: Set("stripe".to_owned()),
                environment: Set(environment.clone()),
                merchant_reference: Set(format!("stripe-tenant-{}", tenant_id)),
                credentials_secret_ref: Set(None),
                credentials: Set(Some(encrypted_bytes)),
                key_version: Set(Some(key_version)),
                publishable_key: Set(Some(publishable_key.clone())),
                status: Set("enabled".to_owned()),
                credit_enabled: Set(credit_enabled),
                pix_enabled: Set(pix_enabled),
                recurring_enabled: Set(recurring_enabled),
                created_at: Set(now),
                ..Default::default()
            }
            .insert(state.conn.as_ref())
            .await
            .map_err(|_| ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue))?
        }
    };

    Ok(Json(PaymentSettingsResponseJson {
        configured: saved.credentials.is_some(),
        provider: "stripe".to_owned(),
        environment: saved.environment,
        publishable_key: saved.publishable_key,
        credit_enabled: saved.credit_enabled,
        pix_enabled: saved.pix_enabled,
        recurring_enabled: saved.recurring_enabled,
        supports_pix: true,
        supports_recurring: true,
    }))
}

#[utoipa::path(
    get,
    tag = "PaymentSettings",
    path = "/v1/payments/methods",
    responses(
        (status = 200, description = "Methods this clinic offers", body = OfferedMethodsJson),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = []))
)]
pub async fn offered_methods(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
) -> HttpResponse<Json<OfferedMethodsJson>> {
    let scope = PaymentScope::from_current_user()
        .map_err(|_| ExceptionResponse::Forbidden(locale, ErrorKey::PaymentChargeForbidden))?;

    let connection = merchant::Entity::find()
        .filter(merchant::Column::TenantId.eq(scope.tenant_id()))
        .filter(merchant::Column::Status.eq("enabled"))
        .one(state.conn.as_ref())
        .await
        .ok()
        .flatten();

    Ok(Json(match connection {
        Some(m) if m.credentials.is_some() => OfferedMethodsJson {
            credit: m.credit_enabled,
            pix: m.pix_enabled,
            recurring: m.recurring_enabled,
        },
        _ => OfferedMethodsJson {
            credit: false,
            pix: false,
            recurring: false,
        },
    }))
}

fn staff_scope(
    user: &User,
    locale: Locale,
    requested_tenant_id: Option<i32>,
) -> Result<i32, ExceptionResponse> {
    let forbidden = || ExceptionResponse::Forbidden(locale, ErrorKey::PaymentChargeForbidden);
    match user.role {
        Role::SysAdmin => requested_tenant_id.filter(|id| *id > 0).ok_or({
            ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue)
        }),
        Role::TenantOwner | Role::TenantUser => {
            let own = PaymentScope::from_current_user()
                .map(|scope| scope.tenant_id())
                .map_err(|_| forbidden())?;
            if requested_tenant_id.is_some_and(|id| id != own) {
                return Err(forbidden());
            }
            Ok(own)
        }
        _ => Err(forbidden()),
    }
}
