use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::AppState;
use axum::extract::{Extension, Query, State};
use axum::http::StatusCode;
use axum::Json;
use business::domain::enums::Role;
use business::domain::user::User;
use business::use_cases::legal_consent_use_case::LegalConsentUseCase;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct LegalDocumentJson {
    pub id: i32,
    pub kind: String,
    pub version: String,
    pub locale: String,
    pub content: String,
    pub published_at: chrono::DateTime<chrono::Utc>,
}

impl From<entity::legal_document_entity::Model> for LegalDocumentJson {
    fn from(model: entity::legal_document_entity::Model) -> Self {
        Self {
            id: model.id,
            kind: model.kind,
            version: model.version,
            locale: model.locale,
            content: model.content,
            published_at: model.published_at,
        }
    }
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[serde(rename_all = "camelCase")]
pub struct LocaleQuery {
    pub locale: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AcceptLegalJson {
    pub document_ids: Vec<i32>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PublishLegalJson {
    pub kind: String,
    pub version: String,
    pub locale: Option<String>,
    pub content: String,
}

/// Documentos em vigor. Rota pública: as lojas exigem que a política de
/// privacidade possa ser lida sem instalar o app e sem ter conta.
#[utoipa::path(
    get,
    path = "/legal/documents",
    tag = "Legal",
    params(LocaleQuery),
    responses((status = 200, body = Vec<LegalDocumentJson>))
)]
pub async fn list_documents(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Query(query): Query<LocaleQuery>,
) -> HttpResponse<Json<Vec<LegalDocumentJson>>> {
    match LegalConsentUseCase::active_documents(state.conn.as_ref(), query.locale.as_deref()).await {
        Ok(docs) => Ok(Json(docs.into_iter().map(LegalDocumentJson::from).collect())),
        Err(_) => Err(ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue)),
    }
}

/// O que o usuário autenticado ainda não aceitou. Lista vazia libera o app;
/// qualquer item significa pedir o aceite antes de tratar dado de saúde.
#[utoipa::path(
    get,
    path = "/legal/pending",
    tag = "Legal",
    params(LocaleQuery),
    responses((status = 200, body = Vec<LegalDocumentJson>))
)]
pub async fn list_pending(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(current_user): Extension<User>,
    Query(query): Query<LocaleQuery>,
) -> HttpResponse<Json<Vec<LegalDocumentJson>>> {
    let user_id = current_user.id.unwrap_or(0);
    match LegalConsentUseCase::pending_for(state.conn.as_ref(), user_id, query.locale.as_deref()).await {
        Ok(docs) => Ok(Json(docs.into_iter().map(LegalDocumentJson::from).collect())),
        Err(_) => Err(ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue)),
    }
}

/// Registra o aceite, datado e amarrado à versão exata.
#[utoipa::path(
    post,
    path = "/legal/accept",
    tag = "Legal",
    request_body = AcceptLegalJson,
    responses((status = 204, description = "Aceite registrado"))
)]
pub async fn accept(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(current_user): Extension<User>,
    Json(payload): Json<AcceptLegalJson>,
) -> Result<StatusCode, ExceptionResponse> {
    let user_id = current_user.id.unwrap_or(0);
    match LegalConsentUseCase::accept(state.conn.as_ref(), user_id, &payload.document_ids).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(_) => Err(ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue)),
    }
}

/// Publica uma nova versão e aposenta a anterior. Só SysAdmin: é a decisão que
/// obriga toda a base a aceitar de novo.
#[utoipa::path(
    post,
    path = "/legal/documents",
    tag = "Legal",
    request_body = PublishLegalJson,
    responses((status = 200, body = LegalDocumentJson))
)]
pub async fn publish(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(current_user): Extension<User>,
    Json(payload): Json<PublishLegalJson>,
) -> HttpResponse<Json<LegalDocumentJson>> {
    if current_user.role != Role::SysAdmin {
        return Err(ExceptionResponse::Forbidden(locale, ErrorKey::InvalidParameterValue));
    }

    let doc_locale = payload.locale.unwrap_or_else(|| "pt-BR".to_string());
    match LegalConsentUseCase::publish(
        state.conn.as_ref(),
        &payload.kind,
        &payload.version,
        &doc_locale,
        &payload.content,
    )
    .await
    {
        Ok(doc) => Ok(Json(LegalDocumentJson::from(doc))),
        Err(_) => Err(ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue)),
    }
}
