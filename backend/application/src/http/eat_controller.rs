use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::eat_json::EatJson;
use crate::http::json::page_json::PageJson;
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::infrastructure::mapper::{EatMapper, Mapper};
use crate::AppState;
use axum::extract::{Extension, Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use business::domain::user::User;
use business::gateway::eat_gateway::EatGateway;
use business::gateway::ingredient_gateway::IngredientGateway;
use business::use_cases::eat_use_case::EatUseCase;

#[utoipa::path(
    post,
    tag = "Eat",
    path = "/eat",
    request_body = EatJson,
    responses(
        (status = 201, description = "Eat recipe created", body = EatJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn add(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Json(payload): Json<EatJson>,
) -> HttpResponse<(StatusCode, Json<EatJson>)> {
    let domain = EatMapper::domain(payload);
    let use_case = EatUseCase::new(EatGateway::new(state.conn.as_ref().clone()));
    let ingredient_gateway = IngredientGateway::new(state.conn.as_ref().clone());

    match use_case.create(domain, &ingredient_gateway).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(EatMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "Eat",
    path = "/eat/{id}",
    params(
        ("id" = i32, Path, description = "Eat Recipe ID")
    ),
    responses(
        (status = 200, description = "Eat recipe found", body = EatJson),
        (status = 404, description = "Eat recipe not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_by_id(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Path(id): Path<i32>,
) -> HttpResponse<Json<EatJson>> {
    let use_case = EatUseCase::new(EatGateway::new(state.conn.as_ref().clone()));
    let ingredient_gateway = IngredientGateway::new(state.conn.as_ref().clone());

    match use_case.find_by_id(id, &ingredient_gateway).await {
        Ok(res) => Ok(Json(EatMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "Eat",
    path = "/eat/uuid/{uuid}",
    params(
        ("uuid" = String, Path, description = "Eat Recipe UUID")
    ),
    responses(
        (status = 200, description = "Eat recipe found", body = EatJson),
        (status = 404, description = "Eat recipe not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_by_uuid(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Path(uuid): Path<String>,
) -> HttpResponse<Json<EatJson>> {
    let use_case = EatUseCase::new(EatGateway::new(state.conn.as_ref().clone()));
    let ingredient_gateway = IngredientGateway::new(state.conn.as_ref().clone());

    match use_case.find_by_uuid(uuid, &ingredient_gateway).await {
        Ok(res) => Ok(Json(EatMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[derive(Debug, serde::Deserialize)]
pub struct EatQueryParam {
    pub page: Option<u64>,
    pub size: Option<u64>,
    pub search: Option<String>,
    pub recommended_period: Option<String>,
    pub is_highlight: Option<bool>,
}

#[utoipa::path(
    get,
    tag = "Eat",
    path = "/eat/page",
    responses(
        (status = 200, description = "Paginated list of Eat recipes", body = PageJson<EatJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_paginated(
    state: State<AppState>,
    Query(params): Query<EatQueryParam>,
) -> HttpResponse<Json<crate::http::json::page_json::PageJson<EatJson>>> {
    let page = params.page.unwrap_or(1);
    let size = params.size.unwrap_or(10);
    let use_case = EatUseCase::new(EatGateway::new(state.conn.as_ref().clone()));
    let ingredient_gateway = IngredientGateway::new(state.conn.as_ref().clone());

    match use_case
        .find_paginated(
            page,
            size,
            params.search,
            params.recommended_period,
            params.is_highlight,
            &ingredient_gateway,
        )
        .await
    {
        Ok((list, total_elements, total_pages)) => {
            let content = EatMapper::json_vec(list);
            Ok(Json(crate::http::json::page_json::PageJson {
                content,
                page,
                size,
                total_elements,
                total_pages,
            }))
        }
        Err(_) => Ok(Json(crate::http::json::page_json::PageJson {
            content: Vec::new(),
            page,
            size,
            total_elements: 0,
            total_pages: 0,
        })),
    }
}

#[utoipa::path(
    get,
    tag = "Eat",
    path = "/eat",
    responses(
        (status = 200, description = "List of Eat recipes", body = Vec<EatJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<EatJson>>> {
    let use_case = EatUseCase::new(EatGateway::new(state.conn.as_ref().clone()));
    let ingredient_gateway = IngredientGateway::new(state.conn.as_ref().clone());

    match use_case.find_all(&ingredient_gateway).await {
        Ok(list) => Ok(Json(EatMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    put,
    tag = "Eat",
    path = "/eat/{id}",
    params(
        ("id" = i32, Path, description = "Eat Recipe ID")
    ),
    request_body = EatJson,
    responses(
        (status = 200, description = "Eat recipe updated", body = EatJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 404, description = "Eat recipe not found", body = NotFoundErrorJson),
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
    Json(payload): Json<EatJson>,
) -> HttpResponse<Json<EatJson>> {
    let domain = EatMapper::domain(payload);
    let use_case = EatUseCase::new(EatGateway::new(state.conn.as_ref().clone()));
    let ingredient_gateway = IngredientGateway::new(state.conn.as_ref().clone());

    match use_case.update(id, domain, &ingredient_gateway).await {
        Ok(res) => Ok(Json(EatMapper::json(res))),
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
    tag = "Eat",
    path = "/eat/{id}/view",
    params(
        ("id" = i32, Path, description = "Eat Recipe ID")
    ),
    responses(
        (status = 204, description = "View counter incremented"),
        (status = 404, description = "Eat recipe not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn increment_views(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Path(id): Path<i32>,
) -> HttpResponse<StatusCode> {
    let use_case = EatUseCase::new(EatGateway::new(state.conn.as_ref().clone()));
    match use_case.increment_views(id).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    post,
    tag = "Eat",
    path = "/eat/{id}/add",
    params(
        ("id" = i32, Path, description = "Eat Recipe ID")
    ),
    responses(
        (status = 204, description = "Addition counter incremented"),
        (status = 404, description = "Eat recipe not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn increment_additions(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Path(id): Path<i32>,
) -> HttpResponse<StatusCode> {
    let use_case = EatUseCase::new(EatGateway::new(state.conn.as_ref().clone()));
    match use_case.increment_additions(id).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    delete,
    tag = "Eat",
    path = "/eat/{id}",
    params(
        ("id" = i32, Path, description = "Eat Recipe ID")
    ),
    responses(
        (status = 204, description = "Eat recipe deleted"),
        (status = 404, description = "Eat recipe not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn delete(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Path(id): Path<i32>,
) -> HttpResponse<StatusCode> {
    let use_case = EatUseCase::new(EatGateway::new(state.conn.as_ref().clone()));
    match use_case.delete(id).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[derive(serde::Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UploadEatPhotoJson {
    pub image_base64: String,
    pub extension: Option<String>,
    pub content_type: Option<String>,
}

#[derive(serde::Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct EatPhotoResponseJson {
    pub eat: EatJson,
    pub signed_url: String,
}

#[utoipa::path(
    post,
    tag = "Eat",
    path = "/eat/{id}/photo/presigned-url",
    params(
        ("id" = i32, Path, description = "Eat Recipe ID")
    ),
    request_body = crate::http::customer_controller::PresignedUrlRequestJson,
    responses(
        (status = 200, description = "Pre-signed URL generated", body = crate::http::customer_controller::PresignedUrlResponseJson),
        (status = 404, description = "Eat recipe not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_photo_presigned_url(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(_current_user): Extension<User>,
    Path(id): Path<i32>,
    Json(payload): Json<crate::http::customer_controller::PresignedUrlRequestJson>,
) -> HttpResponse<Json<crate::http::customer_controller::PresignedUrlResponseJson>> {
    let ext = payload.file_extension.unwrap_or_else(|| "jpg".to_string());
    let content_type = payload.content_type.unwrap_or_else(|| "image/jpeg".to_string());

    let use_case = EatUseCase::new(EatGateway::new(state.conn.as_ref().clone()));
    let ingredient_gateway = IngredientGateway::new(state.conn.as_ref().clone());
    match use_case.generate_photo_presigned_url(id, &ext, &content_type, &ingredient_gateway).await {
        Ok((upload_url, object_key)) => Ok(Json(crate::http::customer_controller::PresignedUrlResponseJson { upload_url, object_key })),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    post,
    tag = "Eat",
    path = "/eat/{id}/photo/confirm",
    params(
        ("id" = i32, Path, description = "Eat Recipe ID")
    ),
    request_body = crate::http::customer_controller::ConfirmUploadRequestJson,
    responses(
        (status = 200, description = "Photo upload confirmed", body = EatPhotoResponseJson),
        (status = 404, description = "Eat recipe not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn confirm_photo_upload(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(_current_user): Extension<User>,
    Path(id): Path<i32>,
    Json(payload): Json<crate::http::customer_controller::ConfirmUploadRequestJson>,
) -> HttpResponse<Json<EatPhotoResponseJson>> {
    let use_case = EatUseCase::new(EatGateway::new(state.conn.as_ref().clone()));
    let ingredient_gateway = IngredientGateway::new(state.conn.as_ref().clone());
    match use_case.confirm_photo_upload(id, payload.object_key, &ingredient_gateway).await {
        Ok((eat, signed_url)) => Ok(Json(EatPhotoResponseJson {
            eat: EatMapper::json(eat),
            signed_url,
        })),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    post,
    tag = "Eat",
    path = "/eat/{id}/photo",
    params(
        ("id" = i32, Path, description = "Eat Recipe ID")
    ),
    request_body = UploadEatPhotoJson,
    responses(
        (status = 200, description = "Photo uploaded successfully", body = EatPhotoResponseJson),
        (status = 400, description = "Invalid payload or image data", body = BadRequestErrorJson),
        (status = 404, description = "Eat recipe not found", body = NotFoundErrorJson),
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
    Json(payload): Json<UploadEatPhotoJson>,
) -> HttpResponse<Json<EatPhotoResponseJson>> {
    use base64::Engine;

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&payload.image_base64)
        .map_err(|_| ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue))?;

    let ext = payload.extension.unwrap_or_else(|| "jpg".to_string());
    let content_type = payload.content_type.unwrap_or_else(|| "image/jpeg".to_string());

    let use_case = EatUseCase::new(EatGateway::new(state.conn.as_ref().clone()));
    let ingredient_gateway = IngredientGateway::new(state.conn.as_ref().clone());

    match use_case
        .upload_recipe_photo(id, bytes, &ext, &content_type, &ingredient_gateway)
        .await
    {
        Ok((eat, signed_url)) => Ok(Json(EatPhotoResponseJson {
            eat: EatMapper::json(eat),
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
