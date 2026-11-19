use crate::domain::business_error::BusinessError;
use base64::Engine;
use chrono::{Duration, NaiveDate, Utc};
use entity::{
    business_plan_entity, plan_order_entity, tenant_entity, tenant_plan_entity,
    tenant_subscription_payment_entity,
};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbConn, DbErr, EntityTrait, QueryFilter, QueryOrder, Set,
};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TenantSubscriptionPaymentHistoryItem {
    pub id: i32,
    pub uuid: String,
    pub tenant_id: i32,
    pub tenant_name: Option<String>,
    pub business_plan_id: i32,
    pub plan_name: String,
    pub amount_cents: i64,
    pub currency: String,
    pub payment_method: String,
    pub payment_intent_id: Option<String>,
    pub status: String,
    pub paid_at: chrono::DateTime<Utc>,
    pub created_at: chrono::DateTime<Utc>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TenantSubscriptionStatus {
    pub status: String, // "ok", "warning", "blocked"
    pub days_overdue: i64,
    pub payment_date: NaiveDate,
    pub grace_period_days: i64,
    pub plan_name: String,
    pub amount_cents: i64,
    pub formatted_amount: String,
    pub business_plan_id: i32,
}

#[derive(Clone, Debug)]
pub struct TenantSubscriptionPixResult {
    pub payment_intent_id: String,
    pub payload: String,
    pub encoded_image: Option<String>,
    pub expires_at: Option<String>,
    pub amount_cents: i64,
}

#[derive(Clone, Debug)]
pub struct PlatformStripeContext {
    pub secret_key: String,
    pub publishable_key: String,
    pub environment: String,
    pub grace_period_days: i64,
}

#[derive(Clone, Debug)]
pub struct TenantSubscriptionIntentResult {
    pub client_secret: String,
    pub payment_intent_id: String,
    pub publishable_key: String,
    pub amount_cents: i64,
    pub formatted_amount: String,
}

pub struct TenantSubscriptionCardParams {
    pub cardholder_name: String,
    pub card_number: String,
    pub expiration_month: u32,
    pub expiration_year: u32,
    pub security_code: String,
}

pub struct TenantSubscriptionUseCase;

fn db_err(e: DbErr) -> BusinessError {
    log::error!("[TenantSubscriptionUseCase] database error: {}", e);
    BusinessError::new(format!("Database error: {}", e))
}

pub fn calculate_subscription_status(
    today: NaiveDate,
    payment_date: NaiveDate,
    grace_period_days: i64,
) -> (String, i64) {
    if today >= payment_date {
        let days = (today - payment_date).num_days();
        if days > grace_period_days {
            ("blocked".to_string(), days)
        } else {
            ("warning".to_string(), days)
        }
    } else {
        ("ok".to_string(), 0)
    }
}

impl TenantSubscriptionUseCase {
    /// Avalia a situação financeira da assinatura da clínica.
    pub async fn get_status(
        db: &DbConn,
        tenant_id: i32,
        grace_period_days: i64,
    ) -> Result<TenantSubscriptionStatus, BusinessError> {
        let tenant = tenant_entity::Entity::find_by_id(tenant_id)
            .one(db)
            .await
            .map_err(db_err)?
            .ok_or_else(|| BusinessError::new("Tenant not found".to_string()))?;

        // Busca o plano ativo do tenant
        let active_plan = tenant_plan_entity::Entity::find()
            .filter(tenant_plan_entity::Column::TenantId.eq(tenant_id))
            .filter(tenant_plan_entity::Column::Active.eq(true))
            .order_by_desc(tenant_plan_entity::Column::Id)
            .one(db)
            .await
            .map_err(db_err)?;

        let plan_model = match active_plan {
            Some(p) => p,
            None => {
                // Se não há plano ativo, busca o último registrado ou primeiro plano comercial disponível
                let last = tenant_plan_entity::Entity::find()
                    .filter(tenant_plan_entity::Column::TenantId.eq(tenant_id))
                    .order_by_desc(tenant_plan_entity::Column::Id)
                    .one(db)
                    .await
                    .map_err(db_err)?;

                match last {
                    Some(p) => p,
                    None => {
                        // Se nunca teve plano atribuído, pega o primeiro BusinessPlan
                        let default_bp = business_plan_entity::Entity::find()
                            .order_by_asc(business_plan_entity::Column::PriceInCents)
                            .one(db)
                            .await
                            .map_err(db_err)?
                            .ok_or_else(|| BusinessError::new("No business plan available".to_string()))?;

                        let now = Utc::now().date_naive();
                        tenant_plan_entity::ActiveModel {
                            tenant_id: Set(tenant.id),
                            business_plan_id: Set(default_bp.id),
                            payment_date: Set(now),
                            active: Set(true),
                            ..Default::default()
                        }
                        .insert(db)
                        .await
                        .map_err(db_err)?
                    }
                }
            }
        };

        let bp = business_plan_entity::Entity::find_by_id(plan_model.business_plan_id)
            .one(db)
            .await
            .map_err(db_err)?
            .ok_or_else(|| BusinessError::new("Business plan not found".to_string()))?;

        let today = Utc::now().date_naive();
        let payment_date = plan_model.payment_date;
        let (status, days_overdue) = calculate_subscription_status(today, payment_date, grace_period_days);

        let amount_cents = bp.price_in_cents;
        let reais = (amount_cents as f64) / 100.0;
        let formatted_amount = format!("R$ {:.2}", reais).replace('.', ",");

        Ok(TenantSubscriptionStatus {
            status,
            days_overdue,
            payment_date,
            grace_period_days,
            plan_name: bp.name,
            amount_cents,
            formatted_amount,
            business_plan_id: bp.id,
        })
    }

    /// Cria uma intenção de pagamento (PaymentIntent) na Stripe para uso com o Payment Element no frontend.
    pub async fn create_payment_intent(
        db: &DbConn,
        tenant_id: i32,
        stripe: PlatformStripeContext,
        user_email: &str,
    ) -> Result<TenantSubscriptionIntentResult, BusinessError> {
        let status = Self::get_status(db, tenant_id, stripe.grace_period_days).await?;
        if stripe.secret_key.is_empty() {
            return Err(BusinessError::new("Platform Stripe secret key not configured".to_string()));
        }

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(20))
            .build()
            .map_err(|e| BusinessError::new(format!("HTTP client error: {}", e)))?;

        let reference = format!("nutrirev-sub-intent-{}-{}", tenant_id, Utc::now().timestamp());

        let mut form: Vec<(String, String)> = vec![
            ("amount".to_string(), status.amount_cents.to_string()),
            ("currency".to_string(), "brl".to_string()),
            ("automatic_payment_methods[enabled]".to_string(), "true".to_string()),
            ("description".to_string(), format!("NutriRev Assinatura - Clínica #{} ({})", tenant_id, status.plan_name)),
            ("metadata[tenant_id]".to_string(), tenant_id.to_string()),
            ("metadata[reference]".to_string(), reference.clone()),
        ];

        let email_to_use = if !user_email.is_empty() {
            user_email
        } else {
            "clinica@nutrirev.com"
        };
        form.push(("receipt_email".to_string(), email_to_use.to_string()));

        let resp = client
            .post("https://api.stripe.com/v1/payment_intents")
            .bearer_auth(&stripe.secret_key)
            .header("Idempotency-Key", &reference)
            .form(&form)
            .send()
            .await
            .map_err(|e| BusinessError::new(format!("Stripe request error: {}", e)))?;

        let status_code = resp.status();
        let body: serde_json::Value = resp.json().await.unwrap_or(serde_json::Value::Null);

        if !status_code.is_success() {
            let msg = body.pointer("/error/message")
                .and_then(|m| m.as_str())
                .unwrap_or("Erro ao criar intenção de pagamento na Stripe");
            log::warn!("[TenantSubscriptionUseCase] Stripe PaymentIntent error: {}", msg);
            return Err(BusinessError::new(msg.to_string()));
        }

        let payment_intent_id = body.get("id").and_then(|s| s.as_str()).unwrap_or_default().to_string();
        let client_secret = body.get("client_secret").and_then(|s| s.as_str()).unwrap_or_default().to_string();

        Ok(TenantSubscriptionIntentResult {
            client_secret,
            payment_intent_id,
            publishable_key: stripe.publishable_key,
            amount_cents: status.amount_cents,
            formatted_amount: status.formatted_amount,
        })
    }

    /// Gera cobrança Pix para renovação da assinatura da clínica via Stripe.
    pub async fn create_pix(
        db: &DbConn,
        tenant_id: i32,
        stripe: PlatformStripeContext,
        user_email: &str,
        user_name: &str,
    ) -> Result<TenantSubscriptionPixResult, BusinessError> {
        let status = Self::get_status(db, tenant_id, stripe.grace_period_days).await?;
        if stripe.secret_key.is_empty() {
            return Err(BusinessError::new("Platform Stripe secret key not configured".to_string()));
        }

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(20))
            .build()
            .map_err(|e| BusinessError::new(format!("HTTP client error: {}", e)))?;

        let reference = format!("nutrirev-sub-pix-{}-{}", tenant_id, Utc::now().timestamp());

        // Cria ou busca customer na Stripe
        let cust_form: Vec<(String, String)> = vec![
            ("name".to_string(), if user_name.is_empty() { "Clinica".to_string() } else { user_name.to_string() }),
            ("email".to_string(), if user_email.is_empty() { "clinica@nutrirev.com".to_string() } else { user_email.to_string() }),
        ];

        let cust_resp = client
            .post("https://api.stripe.com/v1/customers")
            .bearer_auth(&stripe.secret_key)
            .form(&cust_form)
            .send()
            .await
            .map_err(|e| BusinessError::new(format!("Stripe customer error: {}", e)))?;

        let cust_body: serde_json::Value = cust_resp.json().await.unwrap_or(serde_json::Value::Null);
        let customer_id = cust_body.get("id").and_then(|s| s.as_str()).unwrap_or_default();

        let mut form: Vec<(String, String)> = vec![
            ("amount".to_string(), status.amount_cents.to_string()),
            ("currency".to_string(), "brl".to_string()),
            ("confirm".to_string(), "true".to_string()),
            ("payment_method_data[type]".to_string(), "pix".to_string()),
            ("payment_method_options[pix][expires_after_seconds]".to_string(), "3600".to_string()),
            ("description".to_string(), format!("NutriRev Assinatura - Clínica #{} ({})", tenant_id, status.plan_name)),
            ("metadata[tenant_id]".to_string(), tenant_id.to_string()),
            ("metadata[reference]".to_string(), reference.clone()),
        ];
        if !customer_id.is_empty() {
            form.push(("customer".to_string(), customer_id.to_string()));
        }

        let resp = client
            .post("https://api.stripe.com/v1/payment_intents")
            .bearer_auth(&stripe.secret_key)
            .header("Idempotency-Key", &reference)
            .form(&form)
            .send()
            .await
            .map_err(|e| BusinessError::new(format!("Stripe Pix request error: {}", e)))?;

        let status_code = resp.status();
        let body: serde_json::Value = resp.json().await.unwrap_or(serde_json::Value::Null);

        if !status_code.is_success() {
            let msg = body.pointer("/error/message")
                .and_then(|m| m.as_str())
                .unwrap_or("Não foi possível gerar a cobrança Pix na Stripe");
            log::warn!("[TenantSubscriptionUseCase] Stripe Pix error: {}", msg);
            return Err(BusinessError::new(msg.to_string()));
        }

        let payment_intent_id = body.get("id").and_then(|s| s.as_str()).unwrap_or_default().to_string();
        let qr_data = body.pointer("/next_action/pix_display_qr_code/data")
            .and_then(|s| s.as_str())
            .unwrap_or_default()
            .to_string();

        let image_url = body.pointer("/next_action/pix_display_qr_code/image_url_png")
            .and_then(|s| s.as_str());

        let encoded_image = if let Some(url) = image_url {
            match client.get(url).send().await {
                Ok(img_resp) if img_resp.status().is_success() => {
                    img_resp.bytes().await.ok().map(|b| base64::engine::general_purpose::STANDARD.encode(b))
                }
                _ => None,
            }
        } else {
            None
        };

        let expires_at = body.pointer("/next_action/pix_display_qr_code/expires_at")
            .and_then(|v| v.as_i64())
            .and_then(|ts| chrono::DateTime::from_timestamp(ts, 0))
            .map(|dt| dt.to_rfc3339());

        log::info!(
            "[TenantSubscriptionUseCase] Pix gerado para tenant #{} - intent: {}",
            tenant_id,
            payment_intent_id
        );

        Ok(TenantSubscriptionPixResult {
            payment_intent_id,
            payload: qr_data,
            encoded_image,
            expires_at,
            amount_cents: status.amount_cents,
        })
    }

    /// Processa pagamento com cartão de crédito via Stripe e renova a assinatura se aprovado.
    pub async fn pay_card(
        db: &DbConn,
        tenant_id: i32,
        stripe: PlatformStripeContext,
        user_email: &str,
        _user_name: &str,
        params: TenantSubscriptionCardParams,
    ) -> Result<NaiveDate, BusinessError> {
        let status = Self::get_status(db, tenant_id, stripe.grace_period_days).await?;
        if stripe.secret_key.is_empty() {
            return Err(BusinessError::new("Platform Stripe secret key not configured".to_string()));
        }

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(20))
            .build()
            .map_err(|e| BusinessError::new(format!("HTTP client error: {}", e)))?;

        let mut form: Vec<(String, String)> = vec![
            ("amount".to_string(), status.amount_cents.to_string()),
            ("currency".to_string(), "brl".to_string()),
            ("confirm".to_string(), "true".to_string()),
            ("automatic_payment_methods[enabled]".to_string(), "true".to_string()),
            ("automatic_payment_methods[allow_redirects]".to_string(), "never".to_string()),
        ];

        let num = params.card_number.trim();
        let is_sandbox = stripe.secret_key.starts_with("sk_test_") || stripe.secret_key.starts_with("rk_test_");

        if num.starts_with("pm_") || num.starts_with("tok_") {
            form.push(("payment_method".to_string(), num.to_string()));
        } else if is_sandbox {
            // Mapeia para os tokens de teste padrão da Stripe no ambiente sandbox
            let test_pm = if num == "4000000000000002" {
                "pm_card_chargeCustomerFail"
            } else if num.starts_with('4') {
                "pm_card_visa"
            } else if num.starts_with('5') {
                "pm_card_mastercard"
            } else if num.starts_with("34") || num.starts_with("37") {
                "pm_card_amex"
            } else {
                "pm_card_visa"
            };
            form.push(("payment_method".to_string(), test_pm.to_string()));
        } else {
            form.push(("payment_method_data[type]".to_string(), "card".to_string()));
            form.push(("payment_method_data[card][number]".to_string(), num.to_string()));
            form.push(("payment_method_data[card][exp_month]".to_string(), params.expiration_month.to_string()));
            form.push(("payment_method_data[card][exp_year]".to_string(), params.expiration_year.to_string()));
            form.push(("payment_method_data[card][cvc]".to_string(), params.security_code.trim().to_string()));
            form.push(("payment_method_data[billing_details][name]".to_string(), params.cardholder_name.trim().to_string()));
        }

        let email_to_use = if !user_email.is_empty() {
            user_email
        } else {
            "clinica@nutrirev.com"
        };
        form.push(("receipt_email".to_string(), email_to_use.to_string()));

        let reference = format!("nutrirev-sub-card-{}-{}", tenant_id, Utc::now().timestamp());
        form.push(("description".to_string(), format!("NutriRev Assinatura - Clínica #{} ({})", tenant_id, status.plan_name)));
        form.push(("metadata[tenant_id]".to_string(), tenant_id.to_string()));
        form.push(("metadata[reference]".to_string(), reference.clone()));
        form.push(("expand[]".to_string(), "latest_charge".to_string()));

        let resp = client
            .post("https://api.stripe.com/v1/payment_intents")
            .bearer_auth(&stripe.secret_key)
            .header("Idempotency-Key", &reference)
            .form(&form)
            .send()
            .await
            .map_err(|e| BusinessError::new(format!("Stripe request error: {}", e)))?;

        let status_code = resp.status();
        let body: serde_json::Value = resp.json().await.unwrap_or(serde_json::Value::Null);

        if !status_code.is_success() {
            let msg = body.pointer("/error/message")
                .and_then(|m| m.as_str())
                .unwrap_or("Pagamento não aprovado pela operadora");
            log::warn!("[TenantSubscriptionUseCase] Stripe card error: {}", msg);
            return Err(BusinessError::new(msg.to_string()));
        }

        let intent_status = body.get("status").and_then(|s| s.as_str()).unwrap_or_default();
        if intent_status == "succeeded" || intent_status == "requires_capture" {
            let pi_id = body.get("id").and_then(|s| s.as_str());
            log::info!(
                "[TenantSubscriptionUseCase] Cartão aprovado para tenant #{}. Renovando plano...",
                tenant_id
            );
            Self::renew_after_payment(db, tenant_id, Some("card"), Some(status.amount_cents), pi_id).await
        } else {
            let msg = body.pointer("/last_payment_error/message")
                .and_then(|m| m.as_str())
                .unwrap_or("Pagamento não aprovado");
            log::warn!(
                "[TenantSubscriptionUseCase] Cartão recusado para tenant #{}: {}",
                tenant_id,
                msg
            );
            Err(BusinessError::new(msg.to_string()))
        }
    }

    /// Verifica o status de um pagamento na Stripe e renova a assinatura se compensado.
    pub async fn verify_payment(
        db: &DbConn,
        tenant_id: i32,
        secret_key: String,
        _environment: &str,
        payment_intent_id: &str,
    ) -> Result<NaiveDate, BusinessError> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .map_err(|e| BusinessError::new(format!("HTTP client error: {}", e)))?;

        let resp = client
            .get(format!("https://api.stripe.com/v1/payment_intents/{}?expand[]=latest_charge", payment_intent_id))
            .bearer_auth(&secret_key)
            .send()
            .await
            .map_err(|e| BusinessError::new(format!("Stripe request error: {}", e)))?;

        if !resp.status().is_success() {
            return Err(BusinessError::new("Erro ao consultar pagamento na Stripe".to_string()));
        }

        let body: serde_json::Value = resp.json().await.unwrap_or(serde_json::Value::Null);
        let status = body.get("status").and_then(|s| s.as_str()).unwrap_or_default();
        if status == "succeeded" {
            log::info!(
                "[TenantSubscriptionUseCase] Pagamento {} confirmado como liquidado. Renovando plano do tenant #{}...",
                payment_intent_id,
                tenant_id
            );
            let amount = body.get("amount").and_then(|a| a.as_i64());
            let pm_type = body.pointer("/latest_charge/payment_method_details/type")
                .and_then(|t| t.as_str())
                .unwrap_or("card");
            Self::renew_after_payment(db, tenant_id, Some(pm_type), amount, Some(payment_intent_id)).await
        } else {
            Err(BusinessError::new("Pagamento ainda não foi confirmado".to_string()))
        }
    }

    /// Renova o plano do tenant após confirmação de pagamento e registra o histórico.
    pub async fn renew_after_payment(
        db: &DbConn,
        tenant_id: i32,
        payment_method: Option<&str>,
        amount_cents: Option<i64>,
        payment_intent_id: Option<&str>,
    ) -> Result<NaiveDate, BusinessError> {
        let active_plan = tenant_plan_entity::Entity::find()
            .filter(tenant_plan_entity::Column::TenantId.eq(tenant_id))
            .filter(tenant_plan_entity::Column::Active.eq(true))
            .order_by_desc(tenant_plan_entity::Column::Id)
            .one(db)
            .await
            .map_err(db_err)?;

        let plan_model = match active_plan {
            Some(p) => p,
            None => tenant_plan_entity::Entity::find()
                .filter(tenant_plan_entity::Column::TenantId.eq(tenant_id))
                .order_by_desc(tenant_plan_entity::Column::Id)
                .one(db)
                .await
                .map_err(db_err)?
                .ok_or_else(|| BusinessError::new("Tenant plan not found".to_string()))?,
        };

        let bp = business_plan_entity::Entity::find_by_id(plan_model.business_plan_id)
            .one(db)
            .await
            .map_err(db_err)?
            .ok_or_else(|| BusinessError::new("Business plan not found".to_string()))?;

        // Idempotency: se esse payment_intent já foi registrado, não renova nem duplica histórico
        if let Some(pi_id) = payment_intent_id
            && !pi_id.is_empty()
        {
            let existing = tenant_subscription_payment_entity::Entity::find()
                .filter(tenant_subscription_payment_entity::Column::PaymentIntentId.eq(pi_id))
                .one(db)
                .await
                .map_err(db_err)?;

            if existing.is_some() {
                log::info!(
                    "[TenantSubscriptionUseCase] Pagamento {} já registrado para tenant #{}. Ignorando duplicação.",
                    pi_id,
                    tenant_id
                );
                return Ok(plan_model.payment_date);
            }
        }

        let today = Utc::now().date_naive();
        let base_date = if plan_model.payment_date > today {
            plan_model.payment_date
        } else {
            today
        };
        let period_days = if bp.period_days > 0 { bp.period_days } else { 30 };
        let new_payment_date = base_date + Duration::days(period_days as i64);

        let mut active: tenant_plan_entity::ActiveModel = plan_model.clone().into();
        active.payment_date = Set(new_payment_date);
        active.active = Set(true);
        active.update(db).await.map_err(db_err)?;

        // Se houver pedidos pendentes para este tenant, marca como convertidos
        let pending_orders = plan_order_entity::Entity::find()
            .filter(plan_order_entity::Column::TenantId.eq(tenant_id))
            .filter(plan_order_entity::Column::Status.eq("pending"))
            .all(db)
            .await
            .unwrap_or_default();

        for order in pending_orders {
            let mut o: plan_order_entity::ActiveModel = order.into();
            o.status = Set("converted".to_string());
            let _ = o.update(db).await;
        }

        // Registra no histórico de pagamentos de assinatura
        let paid_at = Utc::now();
        let payment_record = tenant_subscription_payment_entity::ActiveModel {
            uuid: Set(uuid::Uuid::new_v4().as_bytes().to_vec()),
            tenant_id: Set(tenant_id),
            business_plan_id: Set(plan_model.business_plan_id),
            plan_name: Set(bp.name.clone()),
            amount_cents: Set(amount_cents.unwrap_or(bp.price_in_cents)),
            currency: Set("BRL".to_string()),
            payment_method: Set(payment_method.unwrap_or("card").to_string()),
            payment_intent_id: Set(payment_intent_id.map(|s| s.to_string())),
            status: Set("paid".to_string()),
            paid_at: Set(paid_at),
            created_at: Set(paid_at),
            created_by: Set(Some("system".to_string())),
            updated_at: Set(paid_at),
            updated_by: Set(Some("system".to_string())),
            ..Default::default()
        };
        if let Err(e) = payment_record.insert(db).await {
            log::error!("[TenantSubscriptionUseCase] Erro ao registrar histórico de pagamento: {}", e);
        }

        log::info!(
            "[TenantSubscriptionUseCase] Assinatura do tenant #{} renovada até {}",
            tenant_id,
            new_payment_date
        );

        Ok(new_payment_date)
    }

    /// Lista o histórico de pagamentos com filtros opcionais.
    pub async fn list_payments(
        db: &DbConn,
        tenant_id: Option<i32>,
        payment_method: Option<String>,
        start_date: Option<NaiveDate>,
        end_date: Option<NaiveDate>,
    ) -> Result<Vec<TenantSubscriptionPaymentHistoryItem>, BusinessError> {
        log::info!(
            "[TenantSubscriptionUseCase] list_payments: tenant={:?}, method={:?}, start={:?}, end={:?}",
            tenant_id,
            payment_method,
            start_date,
            end_date
        );

        let mut query = tenant_subscription_payment_entity::Entity::find();

        if let Some(tid) = tenant_id {
            query = query.filter(tenant_subscription_payment_entity::Column::TenantId.eq(tid));
        }

        if let Some(ref method) = payment_method {
            let m = method.trim().to_lowercase();
            if !m.is_empty() && m != "all" {
                query = query.filter(tenant_subscription_payment_entity::Column::PaymentMethod.eq(m));
            }
        }

        if let Some(start) = start_date
            && let Some(dt) = start.and_hms_opt(0, 0, 0)
        {
            query = query.filter(tenant_subscription_payment_entity::Column::PaidAt.gte(dt.and_utc()));
        }

        if let Some(end) = end_date
            && let Some(dt) = end.and_hms_opt(23, 59, 59)
        {
            query = query.filter(tenant_subscription_payment_entity::Column::PaidAt.lte(dt.and_utc()));
        }

        query = query.order_by_desc(tenant_subscription_payment_entity::Column::PaidAt);

        let payments = query.all(db).await.map_err(db_err)?;

        let tenant_ids: Vec<i32> = payments.iter().map(|p| p.tenant_id).collect();
        let tenants_map: std::collections::HashMap<i32, String> = if !tenant_ids.is_empty() {
            tenant_entity::Entity::find()
                .filter(tenant_entity::Column::Id.is_in(tenant_ids))
                .all(db)
                .await
                .map_err(db_err)?
                .into_iter()
                .map(|t| (t.id, t.name.unwrap_or_else(|| format!("Clínica #{}", t.id))))
                .collect()
        } else {
            std::collections::HashMap::new()
        };

        let items = payments
            .into_iter()
            .map(|p| {
                let uuid_str = uuid::Uuid::from_slice(&p.uuid)
                    .map(|u| u.to_string())
                    .unwrap_or_else(|_| hex::encode(&p.uuid));
                let tenant_name = tenants_map.get(&p.tenant_id).cloned();

                TenantSubscriptionPaymentHistoryItem {
                    id: p.id,
                    uuid: uuid_str,
                    tenant_id: p.tenant_id,
                    tenant_name,
                    business_plan_id: p.business_plan_id,
                    plan_name: p.plan_name,
                    amount_cents: p.amount_cents,
                    currency: p.currency,
                    payment_method: p.payment_method,
                    payment_intent_id: p.payment_intent_id,
                    status: p.status,
                    paid_at: p.paid_at,
                    created_at: p.created_at,
                }
            })
            .collect();

        Ok(items)
    }
}
