use crate::commons::entity_mapper::EntityMapper;
use crate::domain::business_error::BusinessError;
use crate::domain::card_payment::{error, PaymentMethod, PaymentScope, PrepareCardPayment};
use crate::domain::card_submission::{AuthorizeCardPayment, CardSubmission};
use crate::domain::payment_schedule::ChargeStatus;
use crate::domain::payment_records::{
    CardPaymentAttempt, CardPaymentAttemptMapper, PaymentCharge, PaymentChargeMapper,
};
use crate::gateway::card_payment_gateway::CardPaymentGateway;
use crate::gateway::card_processor::{CardProcessor, CardProcessorError};
use crate::gateway::payment_secret_resolver::PaymentSecretResolver;
use crate::domain::merchant_capabilities::{MerchantCapabilities, Provider};
use crate::gateway::payment_provider_factory::{
    active_connection, asaas_client, card_client, ActiveConnection,
};
use crate::use_cases::pix_payment_use_case::holder_for_customer;
use chrono::{NaiveDate, Utc};
use entity::{
    clinical_plan_entity, customer_entity, payment_attempt_entity as attempt,
    payment_charge_entity as charge,
};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbConn, EntityTrait, IntoActiveModel, QueryFilter, Set,
    TransactionTrait,
};

/// A Pix reservation whose merchant the caller already resolved.
pub struct NewPixAttempt {
    pub tenant_id: i32,
    pub charge_id: i32,
    pub merchant_id: i32,
    pub idempotency_key: String,
}

pub struct NewPaymentCharge {
    pub customer_id: i32,
    pub clinical_plan_id: Option<i32>,
    pub amount_cents: i64,
    pub due_date: NaiveDate,
}

pub struct CardPaymentUseCase;

impl CardPaymentUseCase {
    /// Submits a card through whichever acquirer the clinic uses.
    ///
    /// Was `authorize_rede_sandbox`, which is exactly what it did: a clinic on
    /// the PSP had no working card checkout at all.
    pub async fn authorize_with_clinic_acquirer<R: PaymentSecretResolver>(
        db: &DbConn,
        user: &crate::domain::user::User,
        input: AuthorizeCardPayment,
        remote_ip: String,
        tax_id: Option<&str>,
        secrets: &R,
    ) -> Result<CardPaymentAttempt, BusinessError> {
        let scope = PaymentScope::from_current_user()?;
        let user_id = user
            .id
            .filter(|id| *id > 0)
            .ok_or_else(|| error("Forbidden"))?;
        let attempt = attempt::Entity::find_by_id(input.attempt_id)
            .filter(attempt::Column::TenantId.eq(scope.tenant_id()))
            .one(db)
            .await
            .map_err(|_| error("Unable to validate payment access"))?
            .ok_or_else(|| error("Payment attempt not found"))?;
        let charge = charge::Entity::find_by_id(attempt.charge_id)
            .filter(charge::Column::TenantId.eq(scope.tenant_id()))
            .one(db)
            .await
            .map_err(|_| error("Unable to validate payment access"))?
            .ok_or_else(|| error("Payment attempt not found"))?;
        if user.role == crate::domain::enums::Role::User {
            let owns_charge = customer_entity::Entity::find_by_id(charge.customer_id)
                .filter(customer_entity::Column::TenantId.eq(scope.tenant_id()))
                .filter(customer_entity::Column::UserId.eq(user_id))
                .one(db)
                .await
                .map_err(|_| error("Unable to validate payment access"))?
                .is_some();
            if !owns_charge {
                return Err(error("Forbidden"));
            }
        } else if !matches!(
            user.role,
            crate::domain::enums::Role::TenantOwner | crate::domain::enums::Role::TenantUser
        ) {
            return Err(error("Forbidden"));
        }
        // Resolved from the attempt's own merchant, not the clinic's current one:
        // an attempt reserved before the clinic switched acquirer must still be
        // submitted to the acquirer that reserved it.
        let merchant = CardPaymentGateway::merchant_by_id(db, scope.tenant_id(), attempt.merchant_id)
            .await
            .map_err(|_| error("Unable to load payment merchant"))?
            .ok_or_else(|| error("Payment merchant is unavailable"))?;
        let provider = Provider::parse(&merchant.provider)
            .ok_or_else(|| error("Payment connection uses an unknown provider"))?;
        let capabilities = MerchantCapabilities {
            credit: merchant.credit_enabled,
            pix: merchant.pix_enabled,
            recurring: merchant.recurring_enabled,
        };
        let connection = ActiveConnection {
            merchant,
            provider,
            capabilities,
        };
        let processor = card_client(&connection, secrets)?;

        // The PSP attaches every payment to a registered payer; the card-only
        // acquirer takes the card and nothing else. Filling this in is what lets
        // one checkout serve both.
        let holder = match provider {
            Provider::Rede => None,
            Provider::Asaas => {
                let registry = asaas_client(&connection, secrets)?;
                Some(
                    holder_for_customer(
                        db,
                        scope.tenant_id(),
                        charge.customer_id,
                        remote_ip,
                        tax_id,
                        &registry,
                    )
                    .await?,
                )
            }
        };
        Self::authorize(db, user_id, input, &processor, holder).await
    }

    /// Marks ownership durably before the provider call. Any ambiguous transport
    /// outcome remains `unknown` and must be reconciled, never blindly retried.
    pub async fn authorize<P: CardProcessor>(
        db: &DbConn,
        submitted_by_user_id: i32,
        input: AuthorizeCardPayment,
        processor: &P,
        holder: Option<crate::domain::card_token::TokenHolder>,
    ) -> Result<CardPaymentAttempt, BusinessError> {
        let scope = PaymentScope::from_current_user()?;
        if submitted_by_user_id <= 0 || input.attempt_id <= 0 {
            return Err(error("Invalid payment submission"));
        }
        let tx = db
            .begin()
            .await
            .map_err(|_| error("Unable to submit payment"))?;
        let attempt = CardPaymentGateway::attempt_for_update(&tx, scope.tenant_id(), input.attempt_id)
            .await
            .map_err(|_| error("Unable to read payment attempt"))?
            .ok_or_else(|| error("Payment attempt not found"))?;
        if attempt.status != "prepared" || attempt.active_charge_id != Some(attempt.charge_id) {
            return Err(error("Payment attempt cannot be submitted"));
        }
        let mut active = attempt.clone().into_active_model();
        active.status = Set("submitting".into());
        active.submitted_by_user_id = Set(Some(submitted_by_user_id));
        active.submitted_at = Set(Some(Utc::now()));
        let submitting = active
            .update(&tx)
            .await
            .map_err(|_| error("Unable to reserve payment submission"))?;
        tx.commit()
            .await
            .map_err(|_| error("Payment submission reservation outcome unknown"))?;

        let submission = CardSubmission {
            attempt_id: submitting.id,
            reference: submitting.reference.clone(),
            amount_cents: submitting.amount_cents,
            method: if submitting.method == "debit" {
                crate::domain::card_payment::CardMethod::Debit
            } else {
                crate::domain::card_payment::CardMethod::Credit
            },
            installments: submitting.installments,
            card: input.card,
            holder,
        };
        let outcome = processor.authorize(&submission).await;
        let charge_id = submitting.charge_id;
        let mut active = submitting.into_active_model();
        active.completed_at = Set(Some(Utc::now()));
        let mut settles_charge = false;
        match outcome {
            Ok(result) => {
                let (status, settles) = approved_outcome(&result);
                active.status = Set(status.into());
                settles_charge = settles;
                apply_processor_result(&mut active, result);
            }
            Err(CardProcessorError::Declined(result)) => {
                active.status = Set("declined".into());
                active.active_charge_id = Set(None);
                apply_processor_result(&mut active, result);
            }
            Err(CardProcessorError::Unknown) => {
                active.status = Set("unknown".into());
                active.completed_at = Set(None);
            }
            Err(CardProcessorError::Configuration) => {
                // The processor is constructed before this method in production;
                // treat any later configuration failure as non-retryable ambiguity.
                active.status = Set("unknown".into());
                active.completed_at = Set(None);
            }
        }

        // The attempt outcome and the charge settlement land together: a
        // customer must never see an authorized card against a charge that still
        // reads as owing.
        let tx = db
            .begin()
            .await
            .map_err(|_| error("Payment provider outcome could not be persisted"))?;
        let persisted = active
            .update(&tx)
            .await
            .map_err(|_| error("Payment provider outcome could not be persisted"))?;
        if settles_charge {
            Self::settle_charge(&tx, scope.tenant_id(), charge_id).await?;
            Self::restore_access(&tx, scope.tenant_id(), charge_id).await?;
        }
        tx.commit()
            .await
            .map_err(|_| error("Payment provider outcome could not be persisted"))?;

        Ok(CardPaymentAttemptMapper::from_model(persisted))
    }

    /// Marks a charge paid once its card authorization succeeded.
    ///
    /// The subscription's `next_due_date` is deliberately left alone — it moved
    /// when the charge was generated, so settlement only closes this cycle.
    pub(crate) async fn settle_charge<C: sea_orm::ConnectionTrait>(
        tx: &C,
        tenant_id: i32,
        charge_id: i32,
    ) -> Result<(), BusinessError> {
        let charge = CardPaymentGateway::charge_for_update(tx, tenant_id, charge_id)
            .await
            .map_err(|_| error("Unable to read payment charge"))?
            .ok_or_else(|| error("Charge not found"))?;

        let current = ChargeStatus::parse(&charge.status)
            .ok_or_else(|| error("Charge is in an unknown state"))?;
        if current == ChargeStatus::Paid {
            // A retried authorization of an already settled charge is a no-op,
            // not an error.
            return Ok(());
        }
        if !current.can_transition_to(ChargeStatus::Paid) {
            return Err(error("Charge can no longer be settled"));
        }

        let mut settled = charge.into_active_model();
        settled.status = Set(ChargeStatus::Paid.as_str().to_owned());
        settled.paid_at = Set(Some(Utc::now()));
        settled
            .update(tx)
            .await
            .map_err(|_| error("Charge settlement could not be persisted"))?;
        Ok(())
    }
    /// Internal service API. HTTP callers must additionally enforce staff/customer
    /// authorization; a clinic scope is not proof of access to every customer.
    pub async fn create_charge(
        db: &DbConn,
        input: NewPaymentCharge,
    ) -> Result<PaymentCharge, BusinessError> {
        let scope = PaymentScope::from_current_user()?;
        if input.amount_cents <= 0 || input.customer_id <= 0 {
            return Err(error("Invalid charge amount or customer"));
        }
        let customer = customer_entity::Entity::find_by_id(input.customer_id)
            .filter(customer_entity::Column::TenantId.eq(scope.tenant_id()))
            .one(db)
            .await
            .map_err(|_| error("Unable to validate customer"))?;
        if customer.is_none() {
            return Err(error("Customer not found"));
        }
        if let Some(id) = input.clinical_plan_id {
            let plan = clinical_plan_entity::Entity::find_by_id(id)
                .filter(clinical_plan_entity::Column::TenantId.eq(scope.tenant_id()))
                .one(db)
                .await
                .map_err(|_| error("Unable to validate clinical plan"))?;
            if plan.is_none() {
                return Err(error("Clinical plan not found"));
            }
        }
        charge::ActiveModel {
            tenant_id: Set(scope.tenant_id()),
            customer_id: Set(input.customer_id),
            clinical_plan_id: Set(input.clinical_plan_id),
            amount_cents: Set(input.amount_cents),
            currency: Set("BRL".into()),
            due_date: Set(input.due_date),
            status: Set("open".into()),
            created_at: Set(Utc::now()),
            ..Default::default()
        }
        .insert(db)
        .await
        .map(PaymentChargeMapper::from_model)
        .map_err(|_| error("Unable to create payment charge"))
    }

/// Records that settled money went back out, and puts the charge back on the bill.
    ///
    /// Driven by the provider, never by us: this runs when a refund or chargeback
    /// notification arrives. The customer keeps their app access for now — the
    /// charge returns with its original due date and the clinic's existing grace
    /// period decides from there. Cutting someone off the instant a dispute is
    /// raised would punish them for a payment their bank is still deciding about.
    ///
    /// Idempotent: `reversed_at` is set once, so a redelivered notification is a
    /// no-op rather than a second reversal.
    ///
    /// Treats every reversal as total. Partial refunds are out of scope, and
    /// until they are handled a partly-refunded charge is put back on the bill
    /// in full — over-correcting toward the clinic being owed, which a human can
    /// see and undo, rather than toward money quietly written off.
    pub async fn reverse_payment(
        db: &DbConn,
        tenant_id: i32,
        attempt_id: i32,
        today: NaiveDate,
    ) -> Result<crate::domain::card_payment::AttemptStatus, BusinessError> {
        use crate::domain::card_payment::AttemptStatus;

        let tx = db
            .begin()
            .await
            .map_err(|_| error("Unable to reverse payment"))?;
        let attempt = CardPaymentGateway::attempt_for_update(&tx, tenant_id, attempt_id)
            .await
            .map_err(|_| error("Unable to read payment attempt"))?
            .ok_or_else(|| error("Payment attempt not found"))?;

        let current = AttemptStatus::parse(&attempt.status)
            .ok_or_else(|| error("Payment attempt is in an unknown state"))?;
        if current == AttemptStatus::Refunded || attempt.reversed_at.is_some() {
            tx.commit()
                .await
                .map_err(|_| error("Unable to reverse payment"))?;
            return Ok(AttemptStatus::Refunded);
        }
        if !current.can_transition_to(AttemptStatus::Refunded) {
            // Nothing settled here, so there is nothing to take back.
            tx.commit()
                .await
                .map_err(|_| error("Unable to reverse payment"))?;
            return Ok(current);
        }

        let charge_id = attempt.charge_id;
        let mut active = attempt.into_active_model();
        active.status = Set(AttemptStatus::Refunded.as_str().to_owned());
        active.reversed_at = Set(Some(Utc::now()));
        // Frees the charge so it can be paid again, by any method. Required by
        // ck_pa_active for this status, and the behaviour we want regardless.
        active.active_charge_id = Set(None);
        active
            .update(&tx)
            .await
            .map_err(|_| error("Reversal could not be persisted"))?;

        Self::unsettle_charge(&tx, tenant_id, charge_id, today).await?;
        tx.commit()
            .await
            .map_err(|_| error("Reversal could not be persisted"))?;
        Ok(AttemptStatus::Refunded)
    }

    /// Puts a charge back on the bill after its payment was reversed.
    async fn unsettle_charge<C: sea_orm::ConnectionTrait>(
        tx: &C,
        tenant_id: i32,
        charge_id: i32,
        today: NaiveDate,
    ) -> Result<(), BusinessError> {
        let charge = CardPaymentGateway::charge_for_update(tx, tenant_id, charge_id)
            .await
            .map_err(|_| error("Unable to read payment charge"))?
            .ok_or_else(|| error("Charge not found"))?;
        let current = ChargeStatus::parse(&charge.status)
            .ok_or_else(|| error("Charge is in an unknown state"))?;
        let Some(next) = current.reversed(charge.due_date, today) else {
            // Already unpaid, or cancelled. Nothing to undo.
            return Ok(());
        };

        let mut active = charge.into_active_model();
        active.status = Set(next.as_str().to_owned());
        active.paid_at = Set(None);
        active
            .update(tx)
            .await
            .map_err(|_| error("Reversal could not be persisted"))?;
        Ok(())
    }

        /// Gives back app access the moment the last overdue charge is settled.
    ///
    /// `enforce_access` already does this, but only on the next hourly worker
    /// tick. A customer who is locked out and pays to get back in should not wait
    /// up to an hour — and with Pix, which settles in seconds, that wait is the
    /// slowest part of the whole flow.
    ///
    /// Deliberately conservative: it unblocks only when nothing is left overdue.
    /// A customer who still owes something stays blocked and is picked up by the
    /// worker, which is the behaviour that already exists.
    pub(crate) async fn restore_access<C: sea_orm::ConnectionTrait>(
        tx: &C,
        tenant_id: i32,
        charge_id: i32,
    ) -> Result<(), BusinessError> {
        let Some(charge) = charge::Entity::find_by_id(charge_id)
            .filter(charge::Column::TenantId.eq(tenant_id))
            .one(tx)
            .await
            .map_err(|_| error("Unable to read payment charge"))?
        else {
            return Ok(());
        };

        let still_overdue = charge::Entity::find()
            .filter(charge::Column::TenantId.eq(tenant_id))
            .filter(charge::Column::CustomerId.eq(charge.customer_id))
            .filter(charge::Column::Status.eq(ChargeStatus::Overdue.as_str()))
            .one(tx)
            .await
            .map_err(|_| error("Unable to read payment charges"))?
            .is_some();
        if still_overdue {
            return Ok(());
        }

        let user_id = customer_entity::Entity::find_by_id(charge.customer_id)
            .filter(customer_entity::Column::TenantId.eq(tenant_id))
            .one(tx)
            .await
            .map_err(|_| error("Unable to read customer"))?
            .and_then(|customer| customer.user_id);
        if let Some(user_id) = user_id {
            // A no-op unless the billing worker is what blocked them: the gateway
            // filters on blocked_reason, so a hand-disabled account stays disabled.
            crate::gateway::billing_gateway::BillingGateway::unblock_for_payment(tx, user_id)
                .await
                .map_err(|_| error("Unable to restore access"))?;
        }
        Ok(())
    }

    /// Reserves a sandbox attempt only. Does not authorize cards or collect PAN/CVV.
    /// No production override exists until the provider/security integration is reviewed.
    pub async fn prepare(
        db: &DbConn,
        input: PrepareCardPayment,
    ) -> Result<CardPaymentAttempt, BusinessError> {
        let scope = PaymentScope::from_current_user()?;
        input.validate()?;
        let tenant_id = scope.tenant_id();
        // The clinic's own acquirer, whichever it chose. This used to name Rede
        // in code, which meant a clinic set up on the PSP could take Pix but not
        // a card.
        let connection = active_connection(
            db,
            tenant_id,
            &crate::use_cases::pix_payment_use_case::provider_environment(),
        )
        .await?;
        if !connection.supports(input.method) {
            return Err(error("This payment method is not enabled for this clinic"));
        }
        Self::reserve_attempt(
            db,
            tenant_id,
            connection.merchant.id,
            input.charge_id,
            input.method,
            input.installments,
            input.idempotency_key,
            "cit",
        )
        .await
    }

    /// Reserves a Pix attempt against an already-resolved merchant.
    ///
    /// Takes an explicit tenant id rather than reading a `PaymentScope`, so the
    /// same reservation is reachable from a context without an authenticated
    /// user. The caller is responsible for having authorised access to the charge.
    pub async fn prepare_pix(
        db: &DbConn,
        input: NewPixAttempt,
    ) -> Result<CardPaymentAttempt, BusinessError> {
        let request = PrepareCardPayment {
            charge_id: input.charge_id,
            idempotency_key: input.idempotency_key.clone(),
            method: PaymentMethod::Pix,
            installments: 1,
        };
        request.validate()?;
        Self::reserve_attempt(
            db,
            input.tenant_id,
            input.merchant_id,
            input.charge_id,
            PaymentMethod::Pix,
            1,
            input.idempotency_key,
            "cit",
        )
        .await
    }

    /// Reserves an attempt the billing worker will submit, with nobody present.
    ///
    /// Explicit tenant id and no `PaymentScope`: the worker has no authenticated
    /// user, and `PaymentScope` is built to refuse in exactly that situation.
    pub async fn prepare_unattended(
        db: &DbConn,
        tenant_id: i32,
        charge_id: i32,
        merchant_id: i32,
        idempotency_key: String,
    ) -> Result<CardPaymentAttempt, BusinessError> {
        Self::reserve_attempt(
            db,
            tenant_id,
            merchant_id,
            charge_id,
            PaymentMethod::Credit,
            1,
            idempotency_key,
            "mit",
        )
        .await
    }

    /// Charges a stored card against a reserved attempt.
    ///
    /// The customer-present path's ordering, minus the customer: the attempt is
    /// moved to `submitting` and committed before the provider is called, so an
    /// outcome that never comes back still leaves a durable record instead of a
    /// charge that looks untouched.
    ///
    /// `submitted_by_user_id` stays NULL. Nobody submitted this.
    pub async fn submit_unattended<T: crate::gateway::card_tokenizer::CardTokenizer>(
        db: &DbConn,
        tenant_id: i32,
        attempt_id: i32,
        request: crate::domain::card_token::TokenChargeRequest,
        provider_token: &str,
        tokenizer: &T,
    ) -> Result<crate::domain::card_payment::AttemptStatus, BusinessError> {
        use crate::domain::card_payment::AttemptStatus;

        let tx = db
            .begin()
            .await
            .map_err(|_| error("Unable to submit payment"))?;
        let reserved = CardPaymentGateway::attempt_for_update(&tx, tenant_id, attempt_id)
            .await
            .map_err(|_| error("Unable to read payment attempt"))?
            .ok_or_else(|| error("Payment attempt not found"))?;
        if reserved.active_charge_id != Some(reserved.charge_id) {
            return Err(error("Payment attempt cannot be submitted"));
        }
        let submitting = AttemptStatus::advance(&reserved.status, AttemptStatus::Submitting)?;
        let charge_id = reserved.charge_id;
        let mut active = reserved.into_active_model();
        active.status = Set(submitting.to_owned());
        active.submitted_at = Set(Some(Utc::now()));
        let submitting = active
            .update(&tx)
            .await
            .map_err(|_| error("Unable to reserve payment submission"))?;
        tx.commit()
            .await
            .map_err(|_| error("Payment submission reservation outcome unknown"))?;

        let outcome = tokenizer.charge_token(provider_token, &request).await;
        let mut active = submitting.clone().into_active_model();
        active.completed_at = Set(Some(Utc::now()));
        let next = match outcome {
            Ok(result) => {
                let (status, _) = approved_outcome(&result);
                let next = AttemptStatus::parse(status)
                    .ok_or_else(|| error("Payment attempt is in an unknown state"))?;
                apply_processor_result(&mut active, result);
                next
            }
            Err(CardProcessorError::Declined(result)) => {
                // Declining releases the charge, so tomorrow's tick — or the
                // customer, by hand — can try again. Holding it would turn one
                // refusal into a charge nobody can ever pay.
                active.active_charge_id = Set(None);
                apply_processor_result(&mut active, result);
                AttemptStatus::Declined
            }
            Err(CardProcessorError::Unknown) | Err(CardProcessorError::Configuration) => {
                // Deliberately keeps holding the charge: the money may have
                // moved. This needs reconciliation against the provider, never a
                // blind retry.
                active.completed_at = Set(None);
                AttemptStatus::Unknown
            }
        };
        active.status =
            Set(AttemptStatus::advance(&submitting.status, next)?.to_owned());

        let tx = db
            .begin()
            .await
            .map_err(|_| error("Payment provider outcome could not be persisted"))?;
        active
            .update(&tx)
            .await
            .map_err(|_| error("Payment provider outcome could not be persisted"))?;
        if next == AttemptStatus::Captured {
            Self::settle_charge(&tx, tenant_id, charge_id).await?;
            Self::restore_access(&tx, tenant_id, charge_id).await?;
        }
        tx.commit()
            .await
            .map_err(|_| error("Payment provider outcome could not be persisted"))?;
        Ok(next)
    }

    /// The shared reservation: one live attempt per charge, one attempt per key.
    ///
    /// Both payment methods land here so the idempotency and `uq_pa_active`
    /// handling has exactly one implementation. Two copies of this would be two
    /// chances to get double-charging wrong.
    #[allow(clippy::too_many_arguments)]
    async fn reserve_attempt(
        db: &DbConn,
        tenant_id: i32,
        merchant_id: i32,
        charge_id: i32,
        method: PaymentMethod,
        installments: i32,
        idempotency_key: String,
        initiator: &str,
    ) -> Result<CardPaymentAttempt, BusinessError> {
        let tx = db
            .begin()
            .await
            .map_err(|_| error("Unable to prepare payment"))?;
        let charge = CardPaymentGateway::charge_for_update(&tx, tenant_id, charge_id)
            .await
            .map_err(|_| error("Unable to read payment charge"))?
            .ok_or_else(|| error("Charge not found"))?;
        // Lock the charge before reading the key, so concurrent retries of the
        // same charge see the committed reservation rather than create a new one.
        if let Some(existing) =
            CardPaymentGateway::attempt_by_key(&tx, tenant_id, &idempotency_key)
                .await
                .map_err(|_| error("Unable to read payment attempt"))?
        {
            if existing.charge_id != charge_id
                || existing.method != method.as_str()
                || existing.installments != installments
            {
                return Err(error(
                    "Idempotency key already used for a different request",
                ));
            }
            tx.commit()
                .await
                .map_err(|_| error("Unable to complete payment preparation"))?;
            return Ok(CardPaymentAttemptMapper::from_model(existing));
        }
        if !matches!(charge.status.as_str(), "open" | "overdue")
            || charge.amount_cents <= 0
            || charge.currency != "BRL"
        {
            return Err(error("Charge is not payable"));
        }
        if CardPaymentGateway::active_attempt(&tx, tenant_id, charge.id)
            .await
            .map_err(|_| error("Unable to read payment attempt"))?
            .is_some()
        {
            return Err(error(
                "An attempt already reserves this charge; reconcile it before retrying",
            ));
        }
        let prepared = attempt::ActiveModel {
            tenant_id: Set(tenant_id),
            charge_id: Set(charge.id),
            merchant_id: Set(merchant_id),
            idempotency_key: Set(idempotency_key),
            reference: Set(uuid::Uuid::new_v4().to_string()),
            method: Set(method.as_str().into()),
            installments: Set(installments),
            amount_cents: Set(charge.amount_cents),
            currency: Set(charge.currency),
            status: Set("prepared".into()),
            initiator: Set(initiator.to_owned()),
            active_charge_id: Set(Some(charge.id)),
            created_at: Set(Utc::now()),
            ..Default::default()
        }
        .insert(&tx)
        .await
        .map_err(|_| error("Payment reservation conflicted; retry with the same key"))?;
        tx.commit()
            .await
            .map_err(|_| error("Payment preparation outcome unknown; retry with the same key"))?;
        Ok(CardPaymentAttemptMapper::from_model(prepared))
    }
}

/// The attempt status an approved provider response earns, and whether it may
/// settle the charge.
///
/// Only captured money settles. Marking a charge paid on an authorization that is
/// never captured loses the money silently: the authorization expires, nothing
/// ever goes overdue, and `enforce_access` — which only blocks on overdue charges
/// — leaves the customer with permanent free access.
fn approved_outcome(
    result: &crate::domain::card_submission::CardProcessorResult,
) -> (&'static str, bool) {
    if result.captured {
        ("captured", true)
    } else {
        ("authorized", false)
    }
}

fn apply_processor_result(
    active: &mut attempt::ActiveModel,
    result: crate::domain::card_submission::CardProcessorResult,
) {
    active.provider_transaction_id = Set(Some(result.provider_transaction_id));
    active.return_code = Set(Some(result.return_code));
    active.return_message = Set(Some(result.return_message));
    active.last4 = Set(result.last4);
    active.brand = Set(result.brand);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::card_submission::CardProcessorResult;

    fn result(captured: bool) -> CardProcessorResult {
        CardProcessorResult {
            provider_transaction_id: "tid".into(),
            return_code: "00".into(),
            return_message: "approved".into(),
            approved: true,
            captured,
            last4: None,
            brand: None,
        }
    }

    #[test]
    fn only_captured_money_settles_a_charge() {
        assert_eq!(approved_outcome(&result(true)), ("captured", true));
        // The regression this guards: an approved-but-uncaptured authorization
        // used to mark the charge paid. It then expires, never settles, and
        // because enforce_access only blocks on overdue charges the customer
        // keeps access on money that never arrived.
        assert_eq!(approved_outcome(&result(false)), ("authorized", false));
    }
}
