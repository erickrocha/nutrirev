use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::http::json::ingredient_json::{IngredientJson, IngredientPageJson};
use crate::infrastructure::mapper::{IngredientMapper, Mapper};
use crate::AppState;
use axum::extract::{Extension, Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use business::domain::ingredient_search::IngredientSearch;
use business::gateway::ingredient_gateway::IngredientGateway;
use serde::Deserialize;
use utoipa::IntoParams;
use business::use_cases::ingredient_use_case::IngredientUseCase;

#[derive(Debug, Deserialize, IntoParams)]
pub struct IngredientSearchParams {
    /// Palavras da busca; sem acento, em português ou inglês.
    q: Option<String>,
    /// Idioma da interface (`pt` ou `en`): define a ordenação.
    lang: Option<String>,
    /// Itens por página (padrão 20, máximo 100).
    limit: Option<u64>,
    offset: Option<u64>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct IngredientIdsParams {
    /// Ids separados por vírgula.
    ids: String,
}

#[utoipa::path(
    get,
    tag = "Ingredient",
    path = "/ingredient/search",
    params(IngredientSearchParams),
    responses(
        (status = 200, description = "Página de ingredientes que casam com a busca", body = IngredientPageJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn search(
    state: State<AppState>,
    Query(params): Query<IngredientSearchParams>,
) -> HttpResponse<Json<IngredientPageJson>> {
    let search = IngredientSearch::new(params.q.as_deref(), params.lang.as_deref(), params.limit, params.offset);
    let use_case = IngredientUseCase::new(IngredientGateway::new(state.conn.as_ref().clone()));
    match use_case.search(&search).await {
        Ok((items, total)) => Ok(Json(IngredientPageJson { items: IngredientMapper::json_vec(items), total })),
        Err(_) => Ok(Json(IngredientPageJson { items: Vec::new(), total: 0 })),
    }
}

#[utoipa::path(
    get,
    tag = "Ingredient",
    path = "/ingredient/by-ids",
    params(IngredientIdsParams),
    responses(
        (status = 200, description = "Ingredients with the given ids", body = Vec<IngredientJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_by_ids(
    state: State<AppState>,
    Query(params): Query<IngredientIdsParams>,
) -> HttpResponse<Json<Vec<IngredientJson>>> {
    let ids: Vec<i32> = params.ids.split(',').filter_map(|id| id.trim().parse().ok()).take(500).collect();
    let use_case = IngredientUseCase::new(IngredientGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_ids(&ids).await {
        Ok(list) => Ok(Json(IngredientMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    post,
    tag = "Ingredient",
    path = "/ingredient",
    request_body = IngredientJson,
    responses(
        (status = 201, description = "Ingredient created", body = IngredientJson),
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
    Json(payload): Json<IngredientJson>,
) -> HttpResponse<(StatusCode, Json<IngredientJson>)> {
    let domain = IngredientMapper::domain(payload);
    let use_case = IngredientUseCase::new(IngredientGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(IngredientMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "Ingredient",
    path = "/ingredient/{id}",
    params(
        ("id" = i32, Path, description = "Ingredient ID")
    ),
    responses(
        (status = 200, description = "Ingredient found", body = IngredientJson),
        (status = 404, description = "Ingredient not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<IngredientJson>> {
    let use_case = IngredientUseCase::new(IngredientGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_id(id).await {
        Ok(res) => Ok(Json(IngredientMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "Ingredient",
    path = "/ingredient/uuid/{uuid}",
    params(
        ("uuid" = String, Path, description = "Ingredient UUID")
    ),
    responses(
        (status = 200, description = "Ingredient found", body = IngredientJson),
        (status = 404, description = "Ingredient not found", body = NotFoundErrorJson),
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
) -> HttpResponse<Json<IngredientJson>> {
    let use_case = IngredientUseCase::new(IngredientGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_uuid(uuid).await {
        Ok(res) => Ok(Json(IngredientMapper::json(res))),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}

#[utoipa::path(
    get,
    tag = "Ingredient",
    path = "/ingredient",
    responses(
        (status = 200, description = "List of ingredients", body = Vec<IngredientJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
) -> HttpResponse<Json<Vec<IngredientJson>>> {
    let use_case = IngredientUseCase::new(IngredientGateway::new(state.conn.as_ref().clone()));
    match use_case.find_all().await {
        Ok(list) => Ok(Json(IngredientMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    put,
    tag = "Ingredient",
    path = "/ingredient/{id}",
    params(
        ("id" = i32, Path, description = "Ingredient ID")
    ),
    request_body = IngredientJson,
    responses(
        (status = 200, description = "Ingredient updated", body = IngredientJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 404, description = "Ingredient not found", body = NotFoundErrorJson),
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
    Json(payload): Json<IngredientJson>,
) -> HttpResponse<Json<IngredientJson>> {
    let domain = IngredientMapper::domain(payload);
    let use_case = IngredientUseCase::new(IngredientGateway::new(state.conn.as_ref().clone()));
    match use_case.update(id, domain).await {
        Ok(res) => Ok(Json(IngredientMapper::json(res))),
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
    delete,
    tag = "Ingredient",
    path = "/ingredient/{id}",
    params(
        ("id" = i32, Path, description = "Ingredient ID")
    ),
    responses(
        (status = 204, description = "Ingredient deleted"),
        (status = 404, description = "Ingredient not found", body = NotFoundErrorJson),
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
    let use_case = IngredientUseCase::new(IngredientGateway::new(state.conn.as_ref().clone()));
    match use_case.delete(id).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(_) => Err(ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)),
    }
}
