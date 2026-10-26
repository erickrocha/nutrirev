use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::payment_settings_json::{
    OfferedMethodsJson, PaymentConnectionJson, ProvisionConnectionJson, SelectConnectionJson,
    UpdateConnectionJson,
};
use crate::AppState;
use axum::extract::{Extension, Path, Query, State};
use axum::Json;
use business::domain::card_payment::PaymentScope;
use business::domain::enums::Role;
use business::domain::merchant_capabilities::{MerchantCapabilities, Provider};
use business::domain::user::User;
use business::gateway::payment_provider_factory::active_connection;
use business::use_cases::payment_settings_use_case::{
    ConnectionEdit, NewConnection, PaymentSettingsUseCase,
};
use business::use_cases::pix_payment_use_case::provider_environment;
use entity::payment_merchant_entity as merchant;

fn json(row: merchant::Model) -> PaymentConnectionJson {
    let provider = Provider::parse(&row.provider);
    PaymentConnectionJson {
        id: row.id,
        tenant_id: row.tenant_id,
        credentials_secret_ref: None,
        active: row.status == "enabled",
        provider: row.provider,
        environment: row.environment,
        merchant_reference: row.merchant_reference,
        credit_enabled: row.credit_enabled,
        pix_enabled: row.pix_enabled,
        recurring_enabled: row.recurring_enabled,
        supports_pix: provider.is_some_and(Provider::supports_pix),
        supports_recurring: provider.is_some_and(Provider::supports_tokenization),
    }
}

#[utoipa::path(
    post,
    tag = "PaymentSettings",
    path = "/v1/payments/connections",
    request_body = ProvisionConnectionJson,
    responses(
        (status = 200, description = "Connection provisioned", body = PaymentConnectionJson),
        (status = 400, description = "Invalid connection"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Platform operator only")
    ),
    security(("bearer_auth" = []))
)]
pub async fn provision(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Json(payload): Json<ProvisionConnectionJson>,
) -> HttpResponse<Json<PaymentConnectionJson>> {
    let Some(provider) = Provider::parse(&payload.provider) else {
        return Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        ));
    };
    let created = PaymentSettingsUseCase::provision(
        &state.conn,
        &user,
        NewConnection {
            tenant_id: payload.tenant_id,
            provider,
            environment: payload.environment,
            merchant_reference: payload.merchant_reference,
            credentials_secret_ref: payload.credentials_secret_ref,
        },
    )
    .await
    .map_err(|error| map_error(locale, &error.message))?;
    Ok(Json(admin_json(created)))
}

#[utoipa::path(
    get,
    tag = "PaymentSettings",
    path = "/v1/payments/connections",
    params(("tenantId" = Option<i32>, Query, description = "Required of the platform operator, which has no clinic of its own")),
    responses(
        (status = 200, description = "The clinic's connections", body = [PaymentConnectionJson]),
        (status = 400, description = "The platform operator named no clinic"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Clinic staff only")
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_connections(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Query(query): Query<TenantQuery>,
) -> HttpResponse<Json<Vec<PaymentConnectionJson>>> {
    let tenant_id = staff_scope(&user, locale, query.tenant_id)?;
    let rows = PaymentSettingsUseCase::connections(&state.conn, tenant_id)
        .await
        .map_err(|error| map_error(locale, &error.message))?;
    Ok(Json(rows.into_iter().map(json).collect()))
}

#[utoipa::path(
    put,
    tag = "PaymentSettings",
    path = "/v1/payments/connections/selected",
    request_body = SelectConnectionJson,
    responses(
        (status = 200, description = "Acquirer and methods saved", body = PaymentConnectionJson),
        (status = 400, description = "The acquirer cannot offer those methods"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Clinic staff only")
    ),
    security(("bearer_auth" = []))
)]
pub async fn select(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Json(payload): Json<SelectConnectionJson>,
) -> HttpResponse<Json<PaymentConnectionJson>> {
    let tenant_id = staff_scope(&user, locale, payload.tenant_id)?;
    let saved = PaymentSettingsUseCase::select(
        &state.conn,
        tenant_id,
        payload.merchant_id,
        MerchantCapabilities {
            credit: payload.credit_enabled,
            pix: payload.pix_enabled,
            recurring: payload.recurring_enabled,
        },
    )
    .await
    .map_err(|error| map_error(locale, &error.message))?;
    Ok(Json(json(saved)))
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
    // Readable by any signed-in user of the clinic, patients included: the
    // checkout has to know which methods to offer, and "what does my clinic
    // accept" is not sensitive. Nothing about the connection itself is exposed.
    let scope = PaymentScope::from_current_user()
        .map_err(|_| ExceptionResponse::Forbidden(locale, ErrorKey::PaymentChargeForbidden))?;
    let connection = active_connection(
        state.conn.as_ref(),
        scope.tenant_id(),
        &provider_environment(),
    )
    .await
    .ok();

    Ok(Json(match connection {
        Some(connection) => OfferedMethodsJson {
            credit: connection.capabilities.credit,
            pix: connection.capabilities.pix,
            recurring: connection.capabilities.recurring,
        },
        // No live connection: the clinic takes nothing yet, and saying so lets
        // the checkout explain that instead of failing at the first tap.
        None => OfferedMethodsJson {
            credit: false,
            pix: false,
            recurring: false,
        },
    }))
}

#[utoipa::path(
    get,
    tag = "PaymentSettings",
    path = "/v1/payments/admin/connections",
    params(("tenantId" = Option<i32>, Query, description = "Restrict to one clinic")),
    responses(
        (status = 200, description = "Every connection", body = [PaymentConnectionJson]),
        (status = 403, description = "Platform operator only")
    ),
    security(("bearer_auth" = []))
)]
pub async fn admin_list(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Query(query): Query<TenantQuery>,
) -> HttpResponse<Json<Vec<PaymentConnectionJson>>> {
    let rows = PaymentSettingsUseCase::all_connections(&state.conn, &user, query.tenant_id)
        .await
        .map_err(|error| map_error(locale, &error.message))?;
    Ok(Json(rows.into_iter().map(admin_json).collect()))
}

/// Which clinic the caller means. Required of the platform operator on the
/// clinic-scoped endpoints, where it has no clinic of its own; an optional
/// filter on the operator's own listing.
#[derive(serde::Deserialize, utoipa::IntoParams)]
#[serde(rename_all = "camelCase")]
pub struct TenantQuery {
    pub tenant_id: Option<i32>,
}

#[utoipa::path(
    put,
    tag = "PaymentSettings",
    path = "/v1/payments/admin/connections/{id}",
    params(("id" = i32, Path, description = "Connection to correct")),
    request_body = UpdateConnectionJson,
    responses(
        (status = 200, description = "Connection updated", body = PaymentConnectionJson),
        (status = 400, description = "Invalid connection"),
        (status = 403, description = "Platform operator only")
    ),
    security(("bearer_auth" = []))
)]
pub async fn admin_update(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateConnectionJson>,
) -> HttpResponse<Json<PaymentConnectionJson>> {
    let saved = PaymentSettingsUseCase::update_connection(
        &state.conn,
        &user,
        id,
        ConnectionEdit {
            merchant_reference: payload.merchant_reference,
            credentials_secret_ref: payload.credentials_secret_ref,
            environment: payload.environment,
        },
    )
    .await
    .map_err(|error| map_error(locale, &error.message))?;
    Ok(Json(admin_json(saved)))
}

#[utoipa::path(
    post,
    tag = "PaymentSettings",
    path = "/v1/payments/admin/connections/{id}/disable",
    params(("id" = i32, Path, description = "Connection to retire")),
    responses(
        (status = 200, description = "Connection disabled", body = PaymentConnectionJson),
        (status = 403, description = "Platform operator only")
    ),
    security(("bearer_auth" = []))
)]
pub async fn admin_disable(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Path(id): Path<i32>,
) -> HttpResponse<Json<PaymentConnectionJson>> {
    let saved = PaymentSettingsUseCase::disable_connection(&state.conn, &user, id)
        .await
        .map_err(|error| map_error(locale, &error.message))?;
    Ok(Json(admin_json(saved)))
}

#[utoipa::path(
    delete,
    tag = "PaymentSettings",
    path = "/v1/payments/admin/connections/{id}",
    params(("id" = i32, Path, description = "Connection to delete")),
    responses(
        (status = 204, description = "Connection deleted"),
        (status = 400, description = "Connection has processed payments"),
        (status = 403, description = "Platform operator only")
    ),
    security(("bearer_auth" = []))
)]
pub async fn admin_delete(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Path(id): Path<i32>,
) -> HttpResponse<axum::http::StatusCode> {
    PaymentSettingsUseCase::delete_connection(&state.conn, &user, id)
        .await
        .map_err(|error| map_error(locale, &error.message))?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}

/// The operator's view of a connection: the same row, plus the credential
/// pointer the clinic has no use for.
fn admin_json(row: merchant::Model) -> PaymentConnectionJson {
    let credentials_secret_ref = Some(row.credentials_secret_ref.clone());
    PaymentConnectionJson {
        credentials_secret_ref,
        ..json(row)
    }
}

/// The clinic whose settings this request may touch.
///
/// Staff work on their own clinic and cannot reach another by naming it. The
/// platform operator has no clinic of its own, so it says which one it is
/// supporting — the same rule the catalog import already applies. A patient is
/// refused outright: which acquirer their clinic uses is none of their business.
fn staff_scope(
    user: &User,
    locale: Locale,
    requested_tenant_id: Option<i32>,
) -> Result<i32, ExceptionResponse> {
    let forbidden = || ExceptionResponse::Forbidden(locale, ErrorKey::PaymentChargeForbidden);
    match user.role {
        Role::SysAdmin => requested_tenant_id.filter(|id| *id > 0).ok_or_else(|| {
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
        Role::User => Err(forbidden()),
    }
}

fn map_error(locale: Locale, message: &str) -> ExceptionResponse {
    match message {
        "Forbidden" => ExceptionResponse::Forbidden(locale, ErrorKey::PaymentChargeForbidden),
        "Connection not found" => {
            ExceptionResponse::NotFound(locale, ErrorKey::PaymentChargeNotFound)
        }
        _ => ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue),
    }
}

#[cfg(test)]
mod tests {
    use super::staff_scope;
    use crate::commons::exception_response::ExceptionResponse;
    use crate::commons::i18n::Locale;
    use business::domain::enums::Role;
    use business::domain::user::User;
    use entity::audit::{run_with_user, AuditUser};

    fn user(role: Role, tenant_id: Option<i32>) -> User {
        User {
            id: Some(1),
            uuid: None,
            tenant_id,
            name: Some("Staff".into()),
            email: "staff@example.test".into(),
            password: "secret".into(),
            role,
            enabled: true,
            first_login: false,
            created_at: None,
            updated_at: None,
            created_by: None,
            updated_by: None,
        }
    }

    /// The identity the request handler would be running under.
    fn signed_in(tenant_id: Option<i32>) -> Option<AuditUser> {
        Some(AuditUser {
            id: 1,
            email: "staff@example.test".into(),
            tenant_id,
            enforce_tenant: tenant_id.is_some(),
        })
    }

    #[tokio::test]
    async fn the_operator_supports_the_clinic_it_names() {
        // No clinic of its own, so it has to say which one — and then it is in.
        assert!(matches!(
            staff_scope(&user(Role::SysAdmin, None), Locale::En, None),
            Err(ExceptionResponse::BadRequest(..))
        ));
        assert_eq!(
            staff_scope(&user(Role::SysAdmin, None), Locale::En, Some(9)).ok(),
            Some(9)
        );
        assert!(staff_scope(&user(Role::SysAdmin, None), Locale::En, Some(0)).is_err());
    }

    #[tokio::test]
    async fn staff_are_held_to_their_own_clinic() {
        run_with_user(signed_in(Some(7)), async {
            let owner = user(Role::TenantOwner, Some(7));
            assert_eq!(staff_scope(&owner, Locale::En, None).ok(), Some(7));
            assert_eq!(staff_scope(&owner, Locale::En, Some(7)).ok(), Some(7));
            // Naming another clinic does not reach it.
            assert!(matches!(
                staff_scope(&owner, Locale::En, Some(8)),
                Err(ExceptionResponse::Forbidden(..))
            ));
            // And a patient never gets here at all.
            assert!(staff_scope(&user(Role::User, Some(7)), Locale::En, None).is_err());
        })
        .await;
    }
}
