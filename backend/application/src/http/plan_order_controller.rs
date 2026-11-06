use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::business_plan_json::BusinessPlanTierJson;
use crate::http::json::plan_order_json::{
    ConvertPlanOrderJson, CreatePlanOrderJson, PlanOrderCreatedJson, PlanOrderJson,
    PublicPlanDetailJson,
};
use crate::infrastructure::mailer::{notify_order_created, OrderMail};
use crate::AppState;
use axum::extract::{Extension, Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use business::commons::functions::bytes_para_string;
use business::domain::enums::Role;
use business::domain::user::User;
use business::use_cases::plan_order_use_case::{NewPlanOrder, PlanOrderUseCase};
use entity::plan_order_entity;
use serde::Deserialize;

fn authorize(user: &User, locale: Locale) -> Result<(), ExceptionResponse> {
    if user.role != Role::SysAdmin || user.tenant_id.is_some() {
        return Err(ExceptionResponse::Forbidden(locale, ErrorKey::PlanOrderForbidden));
    }
    Ok(())
}

fn use_case(state: &AppState) -> PlanOrderUseCase {
    PlanOrderUseCase::new(state.conn.as_ref().clone())
}

fn map_error(locale: Locale, message: &str) -> ExceptionResponse {
    if message.contains("not found") {
        ExceptionResponse::NotFound(locale, ErrorKey::PlanOrderNotFound)
    } else if message.contains("not pending") {
        ExceptionResponse::BadRequest(locale, ErrorKey::PlanOrderNotPending)
    } else {
        ExceptionResponse::BadRequest(locale, ErrorKey::PlanOrderInvalid)
    }
}

fn response(order: plan_order_entity::Model) -> PlanOrderJson {
    PlanOrderJson {
        uuid: bytes_para_string(order.uuid),
        plan_name: order.plan_name,
        price_in_cents: order.price_in_cents,
        status: order.status,
        tax_id: order.tax_id,
        name: order.name,
        email: order.email,
        phone: order.phone,
        address_line1: order.address_line1,
        address_line2: order.address_line2,
        locality: order.locality,
        administrative_area: order.administrative_area,
        postal_code: order.postal_code,
        tenant_id: order.tenant_id,
        created_at: order.created_at.naive_utc(),
        updated_at: order.updated_at.naive_utc(),
    }
}

fn format_price(cents: i64, english: bool) -> String {
    let (reais, centavos) = (cents / 100, cents % 100);
    if english {
        format!("R$ {}.{:02}/month", reais, centavos)
    } else {
        format!("R$ {},{:02}/mês", reais, centavos)
    }
}

#[utoipa::path(
    get,
    tag = "Plan Order",
    path = "/public/business-plans/{uuid}",
    params(("uuid" = String, Path)),
    responses((status = 200, body = PublicPlanDetailJson))
)]
pub async fn get_public_plan(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Path(uuid): Path<String>,
) -> HttpResponse<Json<PublicPlanDetailJson>> {
    let use_case = use_case(&state);
    let plan = use_case.find_plan(&uuid).await.map_err(|e| map_error(locale, &e.message))?;
    let tiers = business::use_cases::business_plan_use_case::BusinessPlanUseCase::new(
        business::gateway::business_plan_gateway::BusinessPlanGateway::new(state.conn.as_ref().clone()),
    )
    .find_by_uuid(&uuid)
    .await
    .map(|p| {
        p.tiers
            .into_iter()
            .map(|t| BusinessPlanTierJson {
                id: None,
                up_to_users: t.up_to_users,
                price_per_user_in_cents: t.price_per_user_in_cents,
            })
            .collect()
    })
    .unwrap_or_default();

    Ok(Json(PublicPlanDetailJson {
        uuid,
        name: plan.name,
        price_in_cents: plan.price_in_cents,
        available_users: plan.available_users,
        period_days: plan.period_days,
        daily_ai_quota: plan.daily_ai_quota,
        tiers,
    }))
}

#[utoipa::path(
    post,
    tag = "Plan Order",
    path = "/public/orders",
    request_body = CreatePlanOrderJson,
    responses((status = 201, body = PlanOrderCreatedJson), (status = 400))
)]
pub async fn create_order(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Json(payload): Json<CreatePlanOrderJson>,
) -> HttpResponse<(StatusCode, Json<PlanOrderCreatedJson>)> {
    // Robô preencheu o campo-isca: responde como se tivesse dado certo, sem gravar nada.
    if payload.website.as_deref().is_some_and(|v| !v.trim().is_empty()) {
        return Ok((
            StatusCode::CREATED,
            Json(PlanOrderCreatedJson { uuid: uuid::Uuid::new_v4().to_string() }),
        ));
    }

    let english = payload.language.as_deref() == Some("en");
    let order = use_case(&state)
        .create(NewPlanOrder {
            plan_uuid: payload.plan_uuid,
            tax_id: payload.tax_id,
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            street: payload.street,
            number: payload.number,
            complement: payload.complement,
            neighborhood: payload.neighborhood,
            city: payload.city,
            state: payload.state,
            postal_code: payload.postal_code,
        })
        .await
        .map_err(|e| map_error(locale, &e.message))?;

    let uuid = bytes_para_string(order.uuid.clone());
    notify_order_created(OrderMail {
        uuid: uuid.clone(),
        name: order.name,
        email: order.email,
        plan_name: order.plan_name,
        price: format_price(order.price_in_cents, english),
        english,
    });
    Ok((StatusCode::CREATED, Json(PlanOrderCreatedJson { uuid })))
}

#[derive(Deserialize)]
pub struct OrderListQuery {
    pub status: Option<String>,
}

#[utoipa::path(
    get,
    tag = "Plan Order",
    path = "/plan-order",
    responses((status = 200, body = Vec<PlanOrderJson>), (status = 403)),
    security(("bearer_auth" = []))
)]
pub async fn list_orders(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Query(query): Query<OrderListQuery>,
) -> HttpResponse<Json<Vec<PlanOrderJson>>> {
    authorize(&user, locale)?;
    use_case(&state)
        .list(query.status.as_deref())
        .await
        .map(|orders| Json(orders.into_iter().map(response).collect()))
        .map_err(|e| map_error(locale, &e.message))
}

#[utoipa::path(
    get,
    tag = "Plan Order",
    path = "/plan-order/{uuid}",
    params(("uuid" = String, Path)),
    responses((status = 200, body = PlanOrderJson), (status = 404)),
    security(("bearer_auth" = []))
)]
pub async fn get_order(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Path(uuid): Path<String>,
) -> HttpResponse<Json<PlanOrderJson>> {
    authorize(&user, locale)?;
    use_case(&state)
        .find_by_uuid(&uuid)
        .await
        .map(|order| Json(response(order)))
        .map_err(|e| map_error(locale, &e.message))
}

#[utoipa::path(
    post,
    tag = "Plan Order",
    path = "/plan-order/{uuid}/convert",
    params(("uuid" = String, Path)),
    request_body = ConvertPlanOrderJson,
    responses((status = 200, body = PlanOrderJson), (status = 400), (status = 404)),
    security(("bearer_auth" = []))
)]
pub async fn convert_order(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Path(uuid): Path<String>,
    Json(payload): Json<ConvertPlanOrderJson>,
) -> HttpResponse<Json<PlanOrderJson>> {
    authorize(&user, locale)?;
    use_case(&state)
        .convert(&uuid, payload.payment_date)
        .await
        .map(|order| Json(response(order)))
        .map_err(|e| map_error(locale, &e.message))
}

#[utoipa::path(
    post,
    tag = "Plan Order",
    path = "/plan-order/{uuid}/cancel",
    params(("uuid" = String, Path)),
    responses((status = 200, body = PlanOrderJson), (status = 400), (status = 404)),
    security(("bearer_auth" = []))
)]
pub async fn cancel_order(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Path(uuid): Path<String>,
) -> HttpResponse<Json<PlanOrderJson>> {
    authorize(&user, locale)?;
    use_case(&state)
        .cancel(&uuid)
        .await
        .map(|order| Json(response(order)))
        .map_err(|e| map_error(locale, &e.message))
}
