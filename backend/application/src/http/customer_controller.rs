use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::customer_json::CustomerJson;
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::infrastructure::mapper::{CustomerMapper, Mapper};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::Json;
use business::domain::user::User;
use business::gateway::customer_gateway::CustomerGateway;
use business::gateway::user_gateway::UserGateway;
use business::use_cases::account_invite_use_case::AccountInviteUseCase;
use business::use_cases::customer_use_case::CustomerUseCase;
use sea_orm::EntityTrait;

#[utoipa::path(
    post,
    tag = "Customer",
    path = "/customer",
    request_body = CustomerJson,
    responses(
        (status = 201, description = "Customer created", body = CustomerJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn add(state: State<AppState>,Extension(locale): Extension<Locale>,Json(payload): Json<CustomerJson>) -> HttpResponse<(StatusCode, Json<CustomerJson>)> {
    let domain = CustomerMapper::domain(payload);
    let use_case = CustomerUseCase::new(CustomerGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(CustomerMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "Customer",
    path = "/customer/{id}",
    params(
        ("id" = i32, Path, description = "Customer ID")
    ),
    responses(
        (status = 200, description = "Customer found", body = CustomerJson),
        (status = 404, description = "Customer not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_by_id(state: State<AppState>,Extension(locale): Extension<Locale>,Path(id): Path<i32>) -> HttpResponse<Json<CustomerJson>> {
    let use_case = CustomerUseCase::new(CustomerGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_id(id).await {
        Ok(res) => Ok(Json(CustomerMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "Customer",
    path = "/customer/uuid/{uuid}",
    params(
        ("uuid" = String, Path, description = "Customer UUID")
    ),
    responses(
        (status = 200, description = "Customer found", body = CustomerJson),
        (status = 404, description = "Customer not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_by_uuid(state: State<AppState>,Extension(locale): Extension<Locale>,Path(uuid): Path<String>,) -> HttpResponse<Json<CustomerJson>> {
    let use_case = CustomerUseCase::new(CustomerGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_uuid(uuid).await {
        Ok(res) => Ok(Json(CustomerMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "Customer",
    path = "/customer",
    responses(
        (status = 200, description = "List of customers", body = Vec<CustomerJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(state: State<AppState>) -> HttpResponse<Json<Vec<CustomerJson>>> {
    let use_case = CustomerUseCase::new(CustomerGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all().await {
        Ok(list) => Ok(Json(CustomerMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    put,
    tag = "Customer",
    path = "/customer/{id}",
    params(
        ("id" = i32, Path, description = "Customer ID")
    ),
    request_body = CustomerJson,
    responses(
        (status = 200, description = "Customer updated", body = CustomerJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 404, description = "Customer not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn update(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Path(id): Path<i32>,
    Json(payload): Json<CustomerJson>,
) -> HttpResponse<Json<CustomerJson>> {
    let domain = CustomerMapper::domain(payload);
    let use_case = CustomerUseCase::new(CustomerGateway::new(state.conn.as_ref().clone()));
    match use_case.update(id, domain).await {
        Ok(res) => Ok(Json(CustomerMapper::json(res))),
        Err(err) => {
            if err.message.contains("not found") {
                Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing))
            } else {
                Err(ExceptionResponse::BadRequest(
                    locale,
                    ErrorKey::InvalidParameterValue,
                ))
            }
        }
    }
}

#[utoipa::path(
    post,
    tag = "Customer",
    path = "/customer/{id}/enable-mobile",
    params(
        ("id" = i32, Path, description = "Customer ID")
    ),
    responses(
        (status = 200, description = "Customer mobile access enabled", body = CustomerJson),
        (status = 404, description = "Customer not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn enable_mobile(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(_current_user): Extension<User>,
    Path(id): Path<i32>,
) -> HttpResponse<Json<CustomerJson>> {
    let use_case = CustomerUseCase::new(CustomerGateway::new(state.conn.as_ref().clone()));
    let user_gateway = UserGateway::new(state.conn.as_ref().clone());

    match use_case.enable_mobile(id, &user_gateway).await {
        Ok(res) => Ok(Json(CustomerMapper::json(res))),
        Err(err) => {
            if err.message.contains("not found") {
                Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing))
            } else {
                Err(ExceptionResponse::BadRequest(
                    locale,
                    ErrorKey::InvalidParameterValue,
                ))
            }
        }
    }
}

#[utoipa::path(
    get,
    tag = "Customer",
    path = "/customer/user/{user_id}",
    params(
        ("user_id" = i32, Path, description = "User ID associated with customer")
    ),
    responses(
        (status = 200, description = "Customer found", body = CustomerJson),
        (status = 404, description = "Customer not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_by_user_id(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Path(user_id): Path<i32>,
) -> HttpResponse<Json<CustomerJson>> {
    let use_case = CustomerUseCase::new(CustomerGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_user_id(user_id).await {
        Ok(res) => Ok(Json(CustomerMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "Customer",
    path = "/customer/me",
    responses(
        (status = 200, description = "Current logged in customer profile", body = CustomerJson),
        (status = 404, description = "Customer not found for logged in user", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_me(state: State<AppState>,Extension(locale): Extension<Locale>,Extension(current_user): Extension<User>) -> HttpResponse<Json<CustomerJson>> {
    let user_id = current_user.id.unwrap();

    let use_case = CustomerUseCase::new(CustomerGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_user_id(user_id).await {
        Ok(res) => Ok(Json(CustomerMapper::json(res))),
        Err(_) => {
            match use_case.find_by_email(current_user.email.clone()).await {
                Ok(mut customer) => {
                    if customer.user_id.is_none() {
                        customer.user_id = Some(user_id);
                        let _ = use_case.update(customer.id.unwrap(), customer.clone()).await;
                    }
                    Ok(Json(CustomerMapper::json(customer)))
                }
                Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
            }
        }
    }
}

#[derive(serde::Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AccountInviteJson {
    /// Token de uso único. A clínica entrega ao paciente; o backend não guarda cópia.
    pub token: String,
    pub expires_at: chrono::DateTime<chrono::Utc>,
}

/// Emite um convite para o paciente definir a própria senha.
///
/// Substitui a senha padrão compartilhada: emitir um convite novo invalida o
/// anterior, e aceitar invalida o usado.
#[utoipa::path(
    post,
    path = "/customer/{id}/invite",
    tag = "Customers",
    responses((status = 200, description = "Convite emitido", body = AccountInviteJson))
)]
pub async fn issue_invite(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Path(id): Path<i32>,
) -> HttpResponse<Json<AccountInviteJson>> {
    let use_case = CustomerUseCase::new(CustomerGateway::new(state.conn.as_ref().clone()));
    let customer = use_case
        .find_by_id(id)
        .await
        .map_err(|_| ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing))?;

    let user_id = customer
        .user_id
        .ok_or_else(|| ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue))?;

    let user = entity::user_entity::Entity::find_by_id(user_id)
        .one(state.conn.as_ref())
        .await
        .map_err(|_| ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue))?
        .ok_or_else(|| ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing))?;

    match AccountInviteUseCase::issue(&user) {
        Ok(invite) => Ok(Json(AccountInviteJson {
            token: invite.token,
            expires_at: invite.expires_at,
        })),
        Err(_) => Err(ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue)),
    }
}

#[derive(serde::Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AccountDeletionJson {
    /// Itens removidos de imediato. O app usa as chaves para renderizar o texto localizado.
    pub deleted: Vec<String>,
    /// O que permanece sob guarda da clínica, controladora dos dados.
    pub retained: Vec<String>,
    /// Data até a qual o registro nutricional fica retido.
    pub retention_until: chrono::NaiveDate,
    /// Base legal da retenção, para exibição ao titular.
    pub retention_basis: String,
    /// Verdadeiro quando a conta já havia sido excluída antes.
    pub already_requested: bool,
}

/// Exclui a conta do próprio titular: encerra o acesso e apaga o que não está
/// sob dever de guarda. O registro nutricional permanece com a clínica pelo
/// prazo legal — ver `CustomerUseCase::delete_account`.
#[utoipa::path(
    delete,
    path = "/customers/me",
    tag = "Customers",
    responses((status = 200, description = "Conta excluída", body = AccountDeletionJson))
)]
pub async fn delete_me(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(current_user): Extension<User>,
) -> HttpResponse<Json<AccountDeletionJson>> {
    let user_id = current_user.id.unwrap();
    let use_case = CustomerUseCase::new(CustomerGateway::new(state.conn.as_ref().clone()));

    let customer = use_case
        .find_by_user_id(user_id)
        .await
        .map_err(|_| ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing))?;

    let customer_id = customer
        .id
        .ok_or_else(|| ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing))?;

    match use_case.delete_account(state.conn.as_ref(), customer_id).await {
        Ok(receipt) => Ok(Json(AccountDeletionJson {
            deleted: vec![
                "account.credentials".to_string(),
                "account.sessions".to_string(),
                "account.profilePhoto".to_string(),
                "account.mealPhotos".to_string(),
                "account.aiUsage".to_string(),
            ],
            retained: vec![
                "record.meals".to_string(),
                "record.measurements".to_string(),
                "record.clinicalConditions".to_string(),
            ],
            retention_until: receipt.retention_until,
            retention_basis: "LGPD art. 16, I; Lei 13.787/2018".to_string(),
            already_requested: receipt.already_requested,
        })),
        Err(_) => Err(ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue)),
    }
}

#[derive(serde::Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UploadPhotoJson {
    pub image_base64: String,
    pub extension: Option<String>,
    pub content_type: Option<String>,
}

#[derive(serde::Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CustomerPhotoResponseJson {
    pub customer: CustomerJson,
    pub signed_url: String,
}

#[derive(serde::Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PresignedUrlRequestJson {
    pub file_extension: Option<String>,
    pub content_type: Option<String>,
}

#[derive(serde::Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PresignedUrlResponseJson {
    pub upload_url: String,
    pub object_key: String,
}

#[derive(serde::Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmUploadRequestJson {
    pub object_key: String,
}

#[utoipa::path(
    post,
    tag = "Customer",
    path = "/customer/{id}/photo/presigned-url",
    params(
        ("id" = i32, Path, description = "Customer ID")
    ),
    request_body = PresignedUrlRequestJson,
    responses(
        (status = 200, description = "Pre-signed URL generated", body = PresignedUrlResponseJson),
        (status = 404, description = "Customer not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_photo_presigned_url(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(_current_user): Extension<User>,
    Path(id): Path<i32>,
    Json(payload): Json<PresignedUrlRequestJson>,
) -> HttpResponse<Json<PresignedUrlResponseJson>> {
    let ext = payload.file_extension.unwrap_or_else(|| "jpg".to_string());
    let content_type = payload.content_type.unwrap_or_else(|| "image/jpeg".to_string());

    let use_case = CustomerUseCase::new(CustomerGateway::new(state.conn.as_ref().clone()));
    match use_case.generate_photo_presigned_url(id, &ext, &content_type).await {
        Ok((upload_url, object_key)) => Ok(Json(PresignedUrlResponseJson { upload_url, object_key })),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    post,
    tag = "Customer",
    path = "/customer/{id}/photo/confirm",
    params(
        ("id" = i32, Path, description = "Customer ID")
    ),
    request_body = ConfirmUploadRequestJson,
    responses(
        (status = 200, description = "Photo upload confirmed", body = CustomerPhotoResponseJson),
        (status = 404, description = "Customer not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn confirm_photo_upload(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(_current_user): Extension<User>,
    Path(id): Path<i32>,
    Json(payload): Json<ConfirmUploadRequestJson>,
) -> HttpResponse<Json<CustomerPhotoResponseJson>> {
    let use_case = CustomerUseCase::new(CustomerGateway::new(state.conn.as_ref().clone()));
    match use_case.confirm_photo_upload(id, payload.object_key).await {
        Ok((customer, signed_url)) => Ok(Json(CustomerPhotoResponseJson {
            customer: CustomerMapper::json(customer),
            signed_url,
        })),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    post,
    tag = "Customer",
    path = "/customer/{id}/photo",
    params(
        ("id" = i32, Path, description = "Customer ID")
    ),
    request_body = UploadPhotoJson,
    responses(
        (status = 200, description = "Photo uploaded successfully", body = CustomerPhotoResponseJson),
        (status = 400, description = "Invalid payload or image data", body = BadRequestErrorJson),
        (status = 404, description = "Customer not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn upload_photo(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(_current_user): Extension<User>,
    Path(id): Path<i32>,
    Json(payload): Json<UploadPhotoJson>,
) -> HttpResponse<Json<CustomerPhotoResponseJson>> {
    use base64::Engine;

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&payload.image_base64)
        .map_err(|_| ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue))?;

    let ext = payload.extension.unwrap_or_else(|| "jpg".to_string());
    let content_type = payload.content_type.unwrap_or_else(|| "image/jpeg".to_string());

    let use_case = CustomerUseCase::new(CustomerGateway::new(state.conn.as_ref().clone()));
    match use_case.update_profile_photo(id, bytes, &ext, &content_type).await {
        Ok((customer, signed_url)) => Ok(Json(CustomerPhotoResponseJson {
            customer: CustomerMapper::json(customer),
            signed_url,
        })),
        Err(err) => {
            if err.message.contains("not found") {
                Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing))
            } else {
                Err(ExceptionResponse::BadRequest(
                    locale,
                    ErrorKey::InvalidParameterValue,
                ))
            }
        }
    }
}


