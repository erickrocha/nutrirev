use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::tenant_subscription_json::{
    PayTenantSubscriptionCardJson, TenantSubscriptionIntentResponseJson,
    TenantSubscriptionPaymentItemJson, TenantSubscriptionPaymentSuccessJson,
    TenantSubscriptionPaymentsQuery, TenantSubscriptionPixResponseJson,
    TenantSubscriptionStatusJson, VerifyPaymentIntentJson,
};
use crate::infrastructure::mapper::TenantSubscriptionPaymentItemJsonMapper;
use crate::AppState;
use axum::extract::{Extension, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::Json;
use business::domain::enums::Role;
use business::domain::user::User;
use business::gateway::stripe_processor::{verify_webhook_signature, WEBHOOK_TOLERANCE_SECONDS};
use business::use_cases::tenant_subscription_use_case::{
    PlatformStripeContext, TenantSubscriptionCardParams, TenantSubscriptionUseCase,
};

#[utoipa::path(
    get,
    tag = "TenantSubscription",
    path = "/v1/tenant-subscription/status",
    responses(
        (status = 200, description = "Status financeiro da assinatura da clínica", body = TenantSubscriptionStatusJson),
        (status = 401, description = "Não autenticado"),
        (status = 403, description = "Apenas equipe da clínica")
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_status(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
) -> HttpResponse<Json<TenantSubscriptionStatusJson>> {
    let tenant_id = match user.tenant_id {
        Some(id) if user.role == Role::TenantOwner || user.role == Role::TenantUser => id,
        _ => return Err(ExceptionResponse::Forbidden(locale, ErrorKey::SubscriptionBlocked)),
    };

    let status = TenantSubscriptionUseCase::get_status(
        &state.conn,
        tenant_id,
        state.platform_stripe.grace_period_days,
    )
    .await
    .map_err(|e| {
        log::error!("[TenantSubscription] status error: {}", e.message);
        ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue)
    })?;

    Ok(Json(TenantSubscriptionStatusJson {
        status: status.status,
        days_overdue: status.days_overdue,
        payment_date: status.payment_date.to_string(),
        grace_period_days: status.grace_period_days,
        plan_name: status.plan_name,
        amount_cents: status.amount_cents,
        formatted_amount: status.formatted_amount,
        business_plan_id: status.business_plan_id,
        publishable_key: Some(state.platform_stripe.publishable_key.clone()),
    }))
}

#[utoipa::path(
    post,
    tag = "TenantSubscription",
    path = "/v1/tenant-subscription/intent",
    responses(
        (status = 201, description = "Intenção de pagamento criada para Stripe Payment Element", body = TenantSubscriptionIntentResponseJson),
        (status = 401, description = "Não autenticado"),
        (status = 403, description = "Apenas equipe da clínica")
    ),
    security(("bearer_auth" = []))
)]
pub async fn create_payment_intent(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
) -> HttpResponse<(StatusCode, Json<TenantSubscriptionIntentResponseJson>)> {
    let tenant_id = match user.tenant_id {
        Some(id) if user.role == Role::TenantOwner || user.role == Role::TenantUser => id,
        _ => return Err(ExceptionResponse::Forbidden(locale, ErrorKey::SubscriptionBlocked)),
    };

    let stripe_ctx = PlatformStripeContext {
        secret_key: state.platform_stripe.secret_key.clone(),
        publishable_key: state.platform_stripe.publishable_key.clone(),
        environment: state.platform_stripe.environment.clone(),
        grace_period_days: state.platform_stripe.grace_period_days,
    };

    let result = TenantSubscriptionUseCase::create_payment_intent(
        &state.conn,
        tenant_id,
        stripe_ctx,
        &user.email,
    )
    .await
    .map_err(|e| {
        log::error!("[TenantSubscription] create_payment_intent error: {}", e.message);
        ExceptionResponse::BadRequest(locale, ErrorKey::PaymentProviderUnavailable)
    })?;

    Ok((
        StatusCode::CREATED,
        Json(TenantSubscriptionIntentResponseJson {
            client_secret: result.client_secret,
            payment_intent_id: result.payment_intent_id,
            publishable_key: result.publishable_key,
            amount_cents: result.amount_cents,
            formatted_amount: result.formatted_amount,
        }),
    ))
}

#[utoipa::path(
    post,
    tag = "TenantSubscription",
    path = "/v1/tenant-subscription/pay/pix",
    responses(
        (status = 201, description = "Cobrança Pix gerada para a assinatura da clínica", body = TenantSubscriptionPixResponseJson),
        (status = 401, description = "Não autenticado")
    ),
    security(("bearer_auth" = []))
)]
pub async fn pay_pix(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
) -> HttpResponse<(StatusCode, Json<TenantSubscriptionPixResponseJson>)> {
    let tenant_id = match user.tenant_id {
        Some(id) if user.role == Role::TenantOwner || user.role == Role::TenantUser => id,
        _ => return Err(ExceptionResponse::Forbidden(locale, ErrorKey::SubscriptionBlocked)),
    };

    let stripe_ctx = PlatformStripeContext {
        secret_key: state.platform_stripe.secret_key.clone(),
        publishable_key: state.platform_stripe.publishable_key.clone(),
        environment: state.platform_stripe.environment.clone(),
        grace_period_days: state.platform_stripe.grace_period_days,
    };

    let result = TenantSubscriptionUseCase::create_pix(
        &state.conn,
        tenant_id,
        stripe_ctx,
        &user.email,
        user.name.as_deref().unwrap_or(""),
    )
    .await
    .map_err(|e| {
        log::error!("[TenantSubscription] create_pix error: {}", e.message);
        if e.message.contains("não está habilitado") || e.message.contains("not allowed") {
            ExceptionResponse::BadRequest(locale, ErrorKey::PaymentMethodUnavailable)
        } else {
            ExceptionResponse::BadRequest(locale, ErrorKey::PaymentProviderUnavailable)
        }
    })?;

    Ok((
        StatusCode::CREATED,
        Json(TenantSubscriptionPixResponseJson {
            payment_intent_id: result.payment_intent_id,
            payload: result.payload,
            encoded_image: result.encoded_image,
            expires_at: result.expires_at,
            amount_cents: result.amount_cents,
        }),
    ))
}

#[utoipa::path(
    post,
    tag = "TenantSubscription",
    path = "/v1/tenant-subscription/pay/card",
    request_body = PayTenantSubscriptionCardJson,
    responses(
        (status = 201, description = "Pagamento aprovado e assinatura renovada", body = TenantSubscriptionPaymentSuccessJson),
        (status = 400, description = "Cartão recusado ou inválido"),
        (status = 401, description = "Não autenticado")
    ),
    security(("bearer_auth" = []))
)]
pub async fn pay_card(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Json(payload): Json<PayTenantSubscriptionCardJson>,
) -> HttpResponse<(StatusCode, Json<TenantSubscriptionPaymentSuccessJson>)> {
    let tenant_id = match user.tenant_id {
        Some(id) if user.role == Role::TenantOwner || user.role == Role::TenantUser => id,
        _ => return Err(ExceptionResponse::Forbidden(locale, ErrorKey::SubscriptionBlocked)),
    };

    let params = TenantSubscriptionCardParams {
        cardholder_name: payload.cardholder_name,
        card_number: payload.card_number,
        expiration_month: payload.expiration_month,
        expiration_year: payload.expiration_year,
        security_code: payload.security_code,
    };

    let stripe_ctx = PlatformStripeContext {
        secret_key: state.platform_stripe.secret_key.clone(),
        publishable_key: state.platform_stripe.publishable_key.clone(),
        environment: state.platform_stripe.environment.clone(),
        grace_period_days: state.platform_stripe.grace_period_days,
    };

    let new_date = TenantSubscriptionUseCase::pay_card(
        &state.conn,
        tenant_id,
        stripe_ctx,
        &user.email,
        user.name.as_deref().unwrap_or(""),
        params,
    )
    .await
    .map_err(|e| {
        log::error!("[TenantSubscription] pay_card error: {}", e.message);
        if e.message.contains("não aprovado") || e.message.contains("recusado") || e.message.contains("declined") {
            ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue)
        } else {
            ExceptionResponse::BadRequest(locale, ErrorKey::PaymentProviderUnavailable)
        }
    })?;

    Ok((
        StatusCode::CREATED,
        Json(TenantSubscriptionPaymentSuccessJson {
            success: true,
            message: "Pagamento processado com sucesso! Sua assinatura foi renovada.".to_string(),
            new_payment_date: new_date.to_string(),
        }),
    ))
}

#[utoipa::path(
    post,
    tag = "TenantSubscription",
    path = "/v1/tenant-subscription/verify",
    request_body = VerifyPaymentIntentJson,
    responses(
        (status = 201, description = "Pagamento verificado com sucesso", body = TenantSubscriptionPaymentSuccessJson),
        (status = 400, description = "Pagamento não confirmado ou inválido")
    ),
    security(("bearer_auth" = []))
)]
pub async fn verify_payment(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Json(payload): Json<VerifyPaymentIntentJson>,
) -> HttpResponse<(StatusCode, Json<TenantSubscriptionPaymentSuccessJson>)> {
    let tenant_id = match user.tenant_id {
        Some(id) if user.role == Role::TenantOwner || user.role == Role::TenantUser => id,
        _ => return Err(ExceptionResponse::Forbidden(locale, ErrorKey::SubscriptionBlocked)),
    };

    let new_date = TenantSubscriptionUseCase::verify_payment(
        &state.conn,
        tenant_id,
        state.platform_stripe.secret_key.clone(),
        &state.platform_stripe.environment,
        &payload.payment_intent_id,
    )
    .await
    .map_err(|e| {
        log::info!("[TenantSubscription] verify_payment: {}", e.message);
        ExceptionResponse::BadRequest(locale, ErrorKey::PaymentProviderUnavailable)
    })?;

    Ok((
        StatusCode::CREATED,
        Json(TenantSubscriptionPaymentSuccessJson {
            success: true,
            message: "Pagamento confirmado com sucesso!".to_string(),
            new_payment_date: new_date.to_string(),
        }),
    ))
}

#[utoipa::path(
    get,
    tag = "TenantSubscription",
    path = "/v1/tenant-subscription/payments",
    params(TenantSubscriptionPaymentsQuery),
    responses(
        (status = 200, description = "Histórico de pagamentos de assinaturas", body = Vec<TenantSubscriptionPaymentItemJson>),
        (status = 401, description = "Não autenticado"),
        (status = 403, description = "Sem permissão")
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_payments(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
    Query(query): Query<TenantSubscriptionPaymentsQuery>,
) -> HttpResponse<Json<Vec<TenantSubscriptionPaymentItemJson>>> {
    let target_tenant_id = if user.role == Role::SysAdmin {
        query.tenant_id
    } else if user.role == Role::TenantOwner || user.role == Role::TenantUser {
        user.tenant_id
    } else {
        return Err(ExceptionResponse::Forbidden(locale, ErrorKey::SubscriptionBlocked));
    };

    let start_date = query
        .start_date
        .as_deref()
        .and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
    let end_date = query
        .end_date
        .as_deref()
        .and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

    let payments = TenantSubscriptionUseCase::list_payments(
        &state.conn,
        target_tenant_id,
        query.payment_method,
        start_date,
        end_date,
    )
    .await
    .map_err(|e| {
        log::error!("[TenantSubscription] list_payments error: {}", e.message);
        ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue)
    })?;

    let items = TenantSubscriptionPaymentItemJsonMapper::json_vec(payments);

    Ok(Json(items))
}

pub async fn platform_stripe_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: String,
) -> Result<StatusCode, StatusCode> {
    let signature = match headers.get("Stripe-Signature").and_then(|v| v.to_str().ok()) {
        Some(sig) => sig,
        None => return Err(StatusCode::BAD_REQUEST),
    };

    let secret = &state.platform_stripe.webhook_secret;
    if secret.is_empty() {
        log::warn!("[PlatformStripeWebhook] Webhook secret not configured");
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    if !verify_webhook_signature(signature, &body, secret, WEBHOOK_TOLERANCE_SECONDS) {
        log::warn!("[PlatformStripeWebhook] Invalid webhook signature");
        return Err(StatusCode::BAD_REQUEST);
    }

    let val: serde_json::Value = match serde_json::from_str(&body) {
        Ok(v) => v,
        Err(e) => {
            log::warn!("[PlatformStripeWebhook] Could not parse event: {}", e);
            return Err(StatusCode::BAD_REQUEST);
        }
    };

    let event_type = val.get("type").and_then(|v| v.as_str()).unwrap_or_default();
    if event_type == "payment_intent.succeeded" {
        let data_obj = val.pointer("/data/object");
        let intent_id = data_obj.and_then(|o| o.get("id")).and_then(|v| v.as_str()).unwrap_or_default();
        let amount = data_obj.and_then(|o| o.get("amount")).and_then(|v| v.as_i64());
        let pm_type = data_obj
            .and_then(|o| o.pointer("/charges/data/0/payment_method_details/type"))
            .and_then(|v| v.as_str())
            .unwrap_or("card");

        let tenant_id = data_obj
            .and_then(|o| o.pointer("/metadata/tenant_id"))
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<i32>().ok())
            .or_else(|| {
                let reference = data_obj
                    .and_then(|o| o.pointer("/metadata/reference"))
                    .and_then(|v| v.as_str())?;
                let parts: Vec<&str> = reference.split('-').collect();
                if parts.len() >= 4 && parts[0] == "nutrirev" && parts[1] == "sub" {
                    parts[3].parse::<i32>().ok()
                } else {
                    None
                }
            });

        if let Some(tenant_id) = tenant_id {
            let pi_opt = if !intent_id.is_empty() { Some(intent_id) } else { None };
            let _ = TenantSubscriptionUseCase::renew_after_payment(
                &state.conn,
                tenant_id,
                Some(pm_type),
                amount,
                pi_opt,
            )
            .await;
            log::info!("[PlatformStripeWebhook] Tenant #{} renewed via webhook (PI: {})", tenant_id, intent_id);
        } else {
            log::warn!("[PlatformStripeWebhook] payment_intent.succeeded received without identifiable tenant_id");
        }
    }

    Ok(StatusCode::OK)
}
