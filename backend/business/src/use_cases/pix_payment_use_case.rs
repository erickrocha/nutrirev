//! Pix charges: issue a QR, reconcile what comes back, and release an abandoned one.
//!
//! Unlike a card, a Pix charge is asynchronous — we hand over a QR and learn the
//! outcome later, from a webhook or from asking the provider. Two consequences
//! shape everything here:
//!
//! * Settlement must be idempotent. The same payment is routinely reported twice
//!   (webhook plus polling), and both paths converge on `settle`.
//! * An attempt that is waiting holds the charge. `uq_pa_active` allows exactly
//!   one live attempt per charge, so an abandoned QR blocks *every* method until
//!   it is released. `cancel` is not a nicety; without it the first customer to
//!   close a Pix panel can never pay that charge again.

use chrono::Utc;
use entity::{customer_entity, payment_attempt_entity as attempt, payment_charge_entity as charge};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbConn, EntityTrait, IntoActiveModel, QueryFilter, Set,
    TransactionTrait,
};

use crate::commons::entity_mapper::EntityMapper;
use crate::domain::business_error::BusinessError;
use crate::domain::card_payment::{error, AttemptStatus, PaymentMethod};
use crate::domain::card_token::TokenHolder;
use crate::domain::payment_records::{CardPaymentAttempt, CardPaymentAttemptMapper};
use crate::domain::pix_payment::{PixChargeRequest, PixStatus};
use crate::gateway::card_payment_gateway::CardPaymentGateway;
use crate::gateway::pix_processor::{PixProcessor, PixProcessorError};
use crate::gateway::payment_provider_factory::{active_connection, asaas_client};
use crate::gateway::payment_secret_resolver::PaymentSecretResolver;
use crate::gateway::provider_customer::ProviderCustomerRegistry;
use crate::use_cases::card_payment_use_case::{CardPaymentUseCase, NewPixAttempt};

/// How long a Pix QR stays payable. Long enough to switch to a banking app and
/// back, short enough that an abandoned one frees the charge the same day.
pub const PIX_EXPIRY_SECONDS: i64 = 30 * 60;

/// Which provider environment this deployment talks to.
///
/// A clinic may hold both a sandbox and a production merchant row
/// (`uq_pm_provider` is per environment), so the deployment — not the request —
/// decides which one is live. Defaults to sandbox: a missing variable must never
/// mean "charge real cards".
pub fn provider_environment() -> String {
    std::env::var("PAYMENT_ENVIRONMENT").unwrap_or_else(|_| "sandbox".to_owned())
}

/// The QR handed to the customer. The image is passed through from the provider
/// and never stored — see the note on `PixChargeResult`.
pub struct IssuedPixCharge {
    pub attempt: CardPaymentAttempt,
    pub payload: String,
    pub encoded_image: Option<String>,
}

pub struct PixPaymentUseCase;

impl PixPaymentUseCase {
    /// Reserves an attempt and issues the QR in one call.
    ///
    /// Deliberately one round trip: the customer is watching a spinner, and
    /// splitting reserve-then-issue would leave a reserved-but-unissued attempt
    /// holding the charge whenever the second call never arrives.
    ///
    /// The caller must already have checked that this user may touch this charge.
    pub async fn issue_for_charge<R: PaymentSecretResolver>(
        db: &DbConn,
        tenant_id: i32,
        charge_id: i32,
        idempotency_key: String,
        remote_ip: String,
        supplied_tax_id: Option<&str>,
        secrets: &R,
    ) -> Result<IssuedPixCharge, BusinessError> {
        let connection = active_connection(db, tenant_id, &provider_environment()).await?;
        if !connection.supports(PaymentMethod::Pix) {
            return Err(error("This payment method is not enabled for this clinic"));
        }
        let processor = asaas_client(&connection, secrets)?;

        let charge = charge_of_attempt(db, tenant_id, charge_id)
            .await?
            .ok_or_else(|| error("Charge not found"))?;
        let provider_customer_id = ensure_provider_customer(
            db,
            tenant_id,
            charge.customer_id,
            remote_ip,
            supplied_tax_id,
            &processor,
        )
        .await?;

        let attempt = CardPaymentUseCase::prepare_pix(
            db,
            NewPixAttempt {
                tenant_id,
                charge_id,
                merchant_id: connection.merchant.id,
                idempotency_key,
            },
        )
        .await?;

        // A retry with the same key lands on an attempt that already has a QR;
        // hand back the stored one rather than asking the provider for a second.
        if let Some(payload) = attempt.pix_payload.clone() {
            return Ok(IssuedPixCharge {
                attempt,
                payload,
                encoded_image: None,
            });
        }

        Self::issue(db, tenant_id, attempt.id, provider_customer_id, &processor).await
    }

    /// Turns a prepared Pix attempt into a payable QR.
    ///
    /// Mirrors the card path's ordering on purpose: the attempt is moved to
    /// `submitting` and committed *before* the provider is called, so a request
    /// that vanishes mid-flight leaves a durable record rather than a charge that
    /// looks untouched but may already have a QR in the wild.
    pub async fn issue<P: PixProcessor>(
        db: &DbConn,
        tenant_id: i32,
        attempt_id: i32,
        provider_customer_id: String,
        processor: &P,
    ) -> Result<IssuedPixCharge, BusinessError> {
        let tx = db
            .begin()
            .await
            .map_err(|_| error("Unable to start Pix payment"))?;
        let reserved = CardPaymentGateway::attempt_for_update(&tx, tenant_id, attempt_id)
            .await
            .map_err(|_| error("Unable to read payment attempt"))?
            .ok_or_else(|| error("Payment attempt not found"))?;
        if reserved.method != PaymentMethod::Pix.as_str() {
            return Err(error("Payment attempt is not a Pix payment"));
        }
        if reserved.active_charge_id != Some(reserved.charge_id) {
            return Err(error("Payment attempt cannot be submitted"));
        }
        let submitting = AttemptStatus::advance(&reserved.status, AttemptStatus::Submitting)?;

        let amount_cents = reserved.amount_cents;
        let reference = reserved.reference.clone();
        let mut active = reserved.into_active_model();
        active.status = Set(submitting.to_owned());
        active.submitted_at = Set(Some(Utc::now()));
        let submitting = active
            .update(&tx)
            .await
            .map_err(|_| error("Unable to reserve Pix submission"))?;
        tx.commit()
            .await
            .map_err(|_| error("Pix reservation outcome unknown"))?;

        let outcome = processor
            .create_charge(&PixChargeRequest {
                reference: reference.clone(),
                amount_cents,
                provider_customer_id,
                description: format!("Charge {reference}"),
                expires_in_seconds: PIX_EXPIRY_SECONDS,
            })
            .await;

        let mut active = submitting.clone().into_active_model();
        let issued = match outcome {
            Ok(result) => result,
            Err(failure) => {
                // A rejected charge releases the reservation so another method can
                // be tried. An ambiguous one keeps it: the provider may have
                // created a QR we cannot see, and issuing a second is how one
                // invoice gets paid twice.
                let next = match failure {
                    PixProcessorError::Rejected(_) => AttemptStatus::Declined,
                    PixProcessorError::Unknown | PixProcessorError::Configuration => {
                        AttemptStatus::Unknown
                    }
                };
                active.status =
                    Set(AttemptStatus::advance(&submitting.status, next)?.to_owned());
                if next == AttemptStatus::Declined {
                    active.active_charge_id = Set(None);
                    active.completed_at = Set(Some(Utc::now()));
                }
                active
                    .update(db)
                    .await
                    .map_err(|_| error("Pix outcome could not be persisted"))?;
                return Err(error("Pix charge could not be created"));
            }
        };

        active.status = Set(
            AttemptStatus::advance(&submitting.status, AttemptStatus::RequiresAction)?.to_owned(),
        );
        active.provider_transaction_id = Set(Some(issued.provider_payment_id));
        active.pix_payload = Set(Some(issued.payload.clone()));
        active.pix_expires_at = Set(issued.expires_at);
        let persisted = active
            .update(db)
            .await
            .map_err(|_| error("Pix outcome could not be persisted"))?;

        Ok(IssuedPixCharge {
            attempt: CardPaymentAttemptMapper::from_model(persisted),
            payload: issued.payload,
            encoded_image: issued.encoded_image,
        })
    }

    /// Applies a provider status to an attempt, settling the charge when the
    /// money actually arrived.
    ///
    /// Safe to call repeatedly with the same status — a webhook redelivery and a
    /// poll racing each other must produce one settlement, not two. That comes
    /// from the row lock plus `settle_charge` being a no-op on an already paid
    /// charge, not from the caller being careful.
    pub async fn settle(
        db: &DbConn,
        tenant_id: i32,
        attempt_id: i32,
        status: PixStatus,
        provider_amount_cents: Option<i64>,
    ) -> Result<CardPaymentAttempt, BusinessError> {
        // Money going back out takes a different door. `reverse_payment` owns the
        // paired attempt-and-charge update and is shared with the card path, so
        // it runs before this function opens a transaction of its own.
        if status == PixStatus::Refunded {
            CardPaymentUseCase::reverse_payment(
                db,
                tenant_id,
                attempt_id,
                Utc::now().date_naive(),
            )
            .await?;
            return CardPaymentGateway::attempt_for_read(db, tenant_id, attempt_id)
                .await
                .map_err(|_| error("Unable to read payment attempt"))?
                .map(CardPaymentAttemptMapper::from_model)
                .ok_or_else(|| error("Payment attempt not found"));
        }

        let tx = db
            .begin()
            .await
            .map_err(|_| error("Unable to reconcile Pix payment"))?;
        let current = CardPaymentGateway::attempt_for_update(&tx, tenant_id, attempt_id)
            .await
            .map_err(|_| error("Unable to read payment attempt"))?
            .ok_or_else(|| error("Payment attempt not found"))?;

        // The provider tells us *that* something happened; our own row is what
        // says how much was owed. A mismatch is never settled automatically.
        if let Some(paid) = provider_amount_cents {
            if paid != current.amount_cents {
                let mut mismatched = current.into_active_model();
                mismatched.status = Set(AttemptStatus::Unknown.as_str().to_owned());
                mismatched
                    .update(&tx)
                    .await
                    .map_err(|_| error("Unable to flag Pix mismatch"))?;
                tx.commit()
                    .await
                    .map_err(|_| error("Unable to flag Pix mismatch"))?;
                return Err(error("Pix amount does not match the charge"));
            }
        }

        let next = match status {
            PixStatus::Paid => AttemptStatus::Captured,
            PixStatus::Expired | PixStatus::Cancelled => AttemptStatus::Cancelled,
            PixStatus::Refunded => unreachable!("handled before the transaction"),
            PixStatus::Pending => {
                let unchanged = CardPaymentAttemptMapper::from_model(current);
                tx.commit()
                    .await
                    .map_err(|_| error("Unable to reconcile Pix payment"))?;
                return Ok(unchanged);
            }
        };

        if !AttemptStatus::parse(&current.status)
            .is_some_and(|state| state.can_transition_to(next))
        {
            // Already settled, or already terminal. Not an error: a redelivered
            // webhook lands here and must be answered normally.
            let unchanged = CardPaymentAttemptMapper::from_model(current);
            tx.commit()
                .await
                .map_err(|_| error("Unable to reconcile Pix payment"))?;
            return Ok(unchanged);
        }

        let charge_id = current.charge_id;
        let mut active = current.into_active_model();
        active.status = Set(next.as_str().to_owned());
        active.completed_at = Set(Some(Utc::now()));
        if next != AttemptStatus::Captured {
            active.active_charge_id = Set(None);
        }
        let persisted = active
            .update(&tx)
            .await
            .map_err(|_| error("Pix outcome could not be persisted"))?;

        if next == AttemptStatus::Captured {
            CardPaymentUseCase::settle_charge(&tx, tenant_id, charge_id).await?;
            CardPaymentUseCase::restore_access(&tx, tenant_id, charge_id).await?;
        }
        tx.commit()
            .await
            .map_err(|_| error("Pix outcome could not be persisted"))?;
        Ok(CardPaymentAttemptMapper::from_model(persisted))
    }

    /// The attempt a provider callback is about.
    ///
    /// Requires exactly one match: `ix_pa_provider_tx` is not unique, because a
    /// declined attempt can carry an empty provider id, and acting on an
    /// ambiguous match would settle an arbitrary charge.
    pub async fn attempt_by_provider_id(
        db: &DbConn,
        tenant_id: i32,
        provider_payment_id: &str,
    ) -> Result<Option<attempt::Model>, BusinessError> {
        if provider_payment_id.is_empty() {
            return Ok(None);
        }
        let mut found = attempt::Entity::find()
            .filter(attempt::Column::TenantId.eq(tenant_id))
            .filter(attempt::Column::ProviderTransactionId.eq(provider_payment_id))
            .all(db)
            .await
            .map_err(|_| error("Unable to read payment attempt"))?;
        if found.len() > 1 {
            return Err(error("Ambiguous provider payment reference"));
        }
        Ok(found.pop())
    }
}

/// Releases an attempt that is still waiting, so the charge can be paid another way.
///
/// This is the fix for the sharpest edge in the payment tables: `uq_pa_active`
/// permits one live attempt per charge and, before this existed, nothing in the
/// system ever wrote `cancelled`. A customer who opened a Pix QR and changed
/// their mind was locked out of that charge permanently, by every method.
pub async fn cancel_attempt(
    db: &DbConn,
    tenant_id: i32,
    attempt_id: i32,
) -> Result<CardPaymentAttempt, BusinessError> {
    let tx = db
        .begin()
        .await
        .map_err(|_| error("Unable to cancel payment attempt"))?;
    let current = CardPaymentGateway::attempt_for_update(&tx, tenant_id, attempt_id)
        .await
        .map_err(|_| error("Unable to read payment attempt"))?
        .ok_or_else(|| error("Payment attempt not found"))?;

    // Cancelling an already-cancelled attempt is a no-op, not a failure: the
    // client cancels on panel close and on method switch, and those race.
    if current.status == AttemptStatus::Cancelled.as_str() {
        let unchanged = CardPaymentAttemptMapper::from_model(current);
        tx.commit()
            .await
            .map_err(|_| error("Unable to cancel payment attempt"))?;
        return Ok(unchanged);
    }

    // `advance` is what refuses to cancel money that already moved: neither
    // `captured` nor `unknown` may be walked back from here.
    let cancelled = AttemptStatus::advance(&current.status, AttemptStatus::Cancelled)?;
    let mut active = current.into_active_model();
    active.status = Set(cancelled.to_owned());
    // Required by ck_pa_active, and the entire point: this is what frees the
    // charge for another attempt.
    active.active_charge_id = Set(None);
    active.completed_at = Set(Some(Utc::now()));
    let persisted = active
        .update(&tx)
        .await
        .map_err(|_| error("Unable to cancel payment attempt"))?;
    tx.commit()
        .await
        .map_err(|_| error("Unable to cancel payment attempt"))?;
    Ok(CardPaymentAttemptMapper::from_model(persisted))
}

/// The payer's id at the provider, registering them on first use.
///
/// The tax id is required here and nowhere earlier: it is optional at
/// registration precisely so that a patient who never pays through the app is
/// never asked for one.
pub async fn ensure_provider_customer<R: ProviderCustomerRegistry>(
    db: &DbConn,
    tenant_id: i32,
    customer_id: i32,
    remote_ip: String,
    supplied_tax_id: Option<&str>,
    registry: &R,
) -> Result<String, BusinessError> {
    let customer = customer_entity::Entity::find_by_id(customer_id)
        .filter(customer_entity::Column::TenantId.eq(tenant_id))
        .one(db)
        .await
        .map_err(|_| error("Unable to read customer"))?
        .ok_or_else(|| error("Customer not found"))?;

    if let Some(existing) = customer
        .provider_customer_id
        .as_deref()
        .filter(|id| !id.is_empty())
    {
        return Ok(existing.to_owned());
    }

    // The document is optional at registration on purpose — a patient who never
    // pays through the app is never asked for one — so checkout is where it is
    // first demanded, and where it may be supplied. Validated before storing:
    // the provider would reject a malformed one mid-payment, and a typo must
    // never be kept as though it were an identity.
    let had_tax_id = customer
        .tax_id
        .as_deref()
        .is_some_and(|value| !value.is_empty());
    let stored_tax_id = customer.tax_id.clone().filter(|value| !value.is_empty());
    let tax_id = match stored_tax_id {
        Some(existing) => existing,
        None => {
            let supplied = supplied_tax_id
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .ok_or_else(|| error("Tax id is required"))?;
            crate::domain::tax_id::normalize(supplied)
                .ok_or_else(|| error("Tax id is not valid"))?
        }
    };

    let holder = TokenHolder {
        provider_customer_id: String::new(),
        name: customer.name.clone(),
        email: customer.email.clone(),
        tax_id: tax_id.clone(),
        postal_code: customer.postal_code.clone(),
        address_number: None,
        phone: Some(customer.phone.clone()),
        remote_ip,
    };
    let provider_id = registry
        .create_customer(&holder)
        .await
        .map_err(|_| error("Payment provider is unavailable"))?;

    let mut active = customer.into_active_model();
    active.provider_customer_id = Set(Some(provider_id.clone()));
    if !had_tax_id {
        active.tax_id = Set(Some(tax_id));
    }
    active
        .update(db)
        .await
        .map_err(|_| error("Unable to store provider customer"))?;
    Ok(provider_id)
}

/// The payer, as the provider needs to see them, registering them on first use.
///
/// Wraps `ensure_provider_customer` with the customer read that every caller
/// needed anyway. Three paths build this same object — Pix, the card checkout
/// and storing a card — and three copies would be three chances to send the
/// provider a different idea of who is paying.
pub async fn holder_for_customer<R: ProviderCustomerRegistry>(
    db: &DbConn,
    tenant_id: i32,
    customer_id: i32,
    remote_ip: String,
    supplied_tax_id: Option<&str>,
    registry: &R,
) -> Result<TokenHolder, BusinessError> {
    let provider_customer_id = ensure_provider_customer(
        db,
        tenant_id,
        customer_id,
        remote_ip.clone(),
        supplied_tax_id,
        registry,
    )
    .await?;

    // Re-read after registering: that call is what stores the document when the
    // customer supplied one at checkout.
    let customer = customer_entity::Entity::find_by_id(customer_id)
        .filter(customer_entity::Column::TenantId.eq(tenant_id))
        .one(db)
        .await
        .map_err(|_| error("Unable to read customer"))?
        .ok_or_else(|| error("Customer not found"))?;
    let tax_id = customer
        .tax_id
        .clone()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| error("Tax id is required"))?;

    Ok(TokenHolder {
        provider_customer_id,
        name: customer.name,
        email: customer.email,
        tax_id,
        postal_code: customer.postal_code,
        address_number: None,
        phone: Some(customer.phone),
        remote_ip,
    })
}

/// The charge a Pix attempt belongs to, for the callback path that has no user.
pub async fn charge_of_attempt(
    db: &DbConn,
    tenant_id: i32,
    charge_id: i32,
) -> Result<Option<charge::Model>, BusinessError> {
    charge::Entity::find_by_id(charge_id)
        .filter(charge::Column::TenantId.eq(tenant_id))
        .one(db)
        .await
        .map_err(|_| error("Unable to read payment charge"))
}
