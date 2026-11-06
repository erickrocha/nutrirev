use crate::commons::exception_response::ExceptionResponse;
use crate::commons::i18n::{ErrorKey, Locale};
use crate::AppState;
use axum::extract::State;
use axum::http::header::{ACCEPT_LANGUAGE, AUTHORIZATION};
use axum::{body::Body, extract::Request, http::Response, middleware::Next};
use business::domain::enums::Role;
use business::use_cases::authentication_use_case::AuthenticationUseCase;

pub async fn authentication(
    state: State<AppState>,
    mut req: Request<Body>,
    next: Next,
) -> Result<Response<Body>, ExceptionResponse> {
    let locale = Locale::from_accept_language(
        req.headers()
            .get(ACCEPT_LANGUAGE)
            .and_then(|value| value.to_str().ok()),
    );
    req.extensions_mut().insert(locale);

    if req.uri().path().starts_with("/login")
        || req.uri().path().starts_with("/signup")
        || req.uri().path().starts_with("/refresh")
        || req.uri().path().starts_with("/accept-invite")
        || (req.method() == axum::http::Method::GET
            && matches!(req.uri().path(), "/legal/documents" | "/province"))
        || req.uri().path().starts_with("/public/")
    {
        return Ok(next.run(req).await);
    }

    let auth_header = req.headers_mut().get(AUTHORIZATION);
    let auth_header = match auth_header {
        Some(header) => header
            .to_str()
            .map_err(|_| ExceptionResponse::Forbidden(locale, ErrorKey::AuthHeaderMissing))?,
        None => {
            return Err(ExceptionResponse::Forbidden(
                locale,
                ErrorKey::RequiredHeaderValueMissing,
            ))
        }
    };

    let mut header = auth_header.split_whitespace();

    let (bearer, token) = (header.next(), header.next());

    if bearer != Some("Bearer") || token.is_none() {
        return Err(ExceptionResponse::Forbidden(
            locale,
            ErrorKey::InvalidJwtToken,
        ));
    }

    let current_user = AuthenticationUseCase::validate(&state.conn, token.unwrap().to_string())
        .await
        .map_err(|_| ExceptionResponse::Unauthorized(locale, ErrorKey::BadCredentials))?;

    if matches!(current_user.role, Role::TenantOwner | Role::TenantUser | Role::User)
        && current_user.tenant_id.is_none()
    {
        return Err(ExceptionResponse::Forbidden(
            locale,
            ErrorKey::InvalidParameterValue,
        ));
    }

    let audit_user = entity::audit::AuditUser {
        id: current_user.id.unwrap_or(0),
        email: current_user.email.clone(),
        tenant_id: current_user.tenant_id,
        enforce_tenant: current_user.tenant_id.is_some() || current_user.role != Role::SysAdmin,
    };

    record_data_access(&state, &audit_user, req.method().as_str(), req.uri().path());

    req.extensions_mut().insert(current_user);
    Ok(entity::audit::run_with_user(Some(audit_user), next.run(req)).await)
}

/// Prefixos que expõem dado pessoal sensível de saúde. Só o que passa por aqui
/// entra no registro — catálogo (ingrediente, cidade, fórmula) é dado de
/// referência e logá-lo só afogaria o que importa em ruído.
const CLINICAL_PATH_PREFIXES: &[&str] = &[
    "/customer",
    "/meal-log",
    "/meal-analysis",
    "/body-analysis",
    "/meal-plan",
    "/clinical-plan",
    "/clinical-conditions",
    "/points",
    "/tenant-dashboard",
];

/// Grava o acesso a dado de saúde — LGPD art. 37, registro das operações de
/// tratamento. Fica no middleware porque é o único ponto por onde toda
/// requisição passa: instrumentar caso de uso por caso de uso deixaria buracos
/// a cada rota nova, e este registro só vale se for completo.
///
/// A escrita vai para uma tarefa em segundo plano: o log não pode atrasar nem
/// derrubar o atendimento ao paciente. Falha aqui é logada, não propagada.
fn record_data_access(
    state: &AppState,
    user: &entity::audit::AuditUser,
    method: &str,
    path: &str,
) {
    if !CLINICAL_PATH_PREFIXES
        .iter()
        .any(|prefix| path.starts_with(prefix))
    {
        return;
    }

    let entry = entity::data_access_log_entity::ActiveModel {
        user_id: sea_orm::Set(Some(user.id)),
        tenant_id: sea_orm::Set(user.tenant_id),
        user_email: sea_orm::Set(user.email.clone()),
        method: sea_orm::Set(method.to_string()),
        path: sea_orm::Set(path.chars().take(500).collect::<String>()),
        occurred_at: sea_orm::Set(chrono::Utc::now()),
        ..Default::default()
    };

    let conn = state.conn.clone();
    tokio::spawn(async move {
        use sea_orm::ActiveModelTrait;
        if let Err(e) = entry.insert(conn.as_ref()).await {
            log::warn!("[authentication] Failed to record data access: {}", e);
        }
    });
}
