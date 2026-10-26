use crate::domain::business_error::BusinessError;

/// Only an authenticated, clinic-scoped request may enter payment use cases.
/// Unlike the general tenant helper, missing context never means unrestricted.
#[derive(Clone, Copy, Debug)]
pub struct PaymentScope {
    tenant_id: i32,
}

impl PaymentScope {
    pub fn from_current_user() -> Result<Self, BusinessError> {
        let tenant_id = entity::audit::CURRENT_USER
            .try_with(|user| {
                user.as_ref()
                    .filter(|user| user.id > 0)
                    .and_then(|user| user.tenant_id)
            })
            .ok()
            .flatten()
            .filter(|id| *id > 0)
            .ok_or_else(|| error("An authenticated clinic context is required"))?;
        Ok(Self { tenant_id })
    }

    pub fn tenant_id(self) -> i32 {
        self.tenant_id
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CardMethod {
    Credit,
    Debit,
}

impl CardMethod {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Credit => "credit",
            Self::Debit => "debit",
        }
    }
}

/// Everything a charge can be paid with.
///
/// `CardMethod` deliberately stays a separate, narrower type: it is what the
/// card adapters accept, and Pix must not be representable there.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PaymentMethod {
    Credit,
    Debit,
    Pix,
}

impl PaymentMethod {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Credit => "credit",
            Self::Debit => "debit",
            Self::Pix => "pix",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "credit" => Some(Self::Credit),
            "debit" => Some(Self::Debit),
            "pix" => Some(Self::Pix),
            _ => None,
        }
    }

    pub fn as_card(self) -> Option<CardMethod> {
        match self {
            Self::Credit => Some(CardMethod::Credit),
            Self::Debit => Some(CardMethod::Debit),
            Self::Pix => None,
        }
    }

    /// Mirrors the `ck_pa_installments` database check. Keeping the two in step
    /// is what stops a valid-looking request from failing at the insert.
    pub fn max_installments(self) -> i32 {
        match self {
            Self::Credit => 12,
            Self::Debit | Self::Pix => 1,
        }
    }
}

/// Contains no card data, merchant credentials, or client-supplied amount.
pub struct PrepareCardPayment {
    pub charge_id: i32,
    pub idempotency_key: String,
    pub method: PaymentMethod,
    pub installments: i32,
}

impl PrepareCardPayment {
    pub fn validate(&self) -> Result<(), BusinessError> {
        if self.charge_id <= 0 {
            return Err(error("Invalid charge"));
        }
        if !(16..=64).contains(&self.idempotency_key.len())
            || !self
                .idempotency_key
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
        {
            return Err(error("Use a 16-64 character ASCII idempotency key"));
        }
        if self.installments < 1 || self.installments > self.method.max_installments() {
            return Err(error("Invalid card installments"));
        }
        Ok(())
    }
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AttemptStatus {
    Prepared,
    Submitting,
    RequiresAction,
    Unknown,
    Authorized,
    Captured,
    Declined,
    Cancelled,
    /// Money that had settled went back out — a refund, or a chargeback the
    /// cardholder raised with their bank.
    Refunded,
}

impl AttemptStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Prepared => "prepared",
            Self::Submitting => "submitting",
            Self::RequiresAction => "requires_action",
            Self::Unknown => "unknown",
            Self::Authorized => "authorized",
            Self::Captured => "captured",
            Self::Declined => "declined",
            Self::Cancelled => "cancelled",
            Self::Refunded => "refunded",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "prepared" => Some(Self::Prepared),
            "submitting" => Some(Self::Submitting),
            "requires_action" => Some(Self::RequiresAction),
            "unknown" => Some(Self::Unknown),
            "authorized" => Some(Self::Authorized),
            "captured" => Some(Self::Captured),
            "declined" => Some(Self::Declined),
            "cancelled" => Some(Self::Cancelled),
            "refunded" => Some(Self::Refunded),
            _ => None,
        }
    }

    /// The stored status, or an error naming the move that was refused.
    ///
    /// This is the entry point the write path uses. Until it existed,
    /// `can_transition_to` was called only by its own unit tests while the use
    /// case assigned status strings directly — a lifecycle that reads like a
    /// guarantee and enforces nothing.
    pub fn advance(current: &str, next: Self) -> Result<&'static str, BusinessError> {
        let current = Self::parse(current)
            .ok_or_else(|| error("Payment attempt is in an unknown state"))?;
        if !current.can_transition_to(next) {
            return Err(error("Payment attempt cannot move to that state"));
        }
        Ok(next.as_str())
    }

    /// An unknown authorization must be reconciled, never reset for resubmission.
    pub fn can_transition_to(self, next: Self) -> bool {
        use AttemptStatus::*;
        self == next
            || matches!(
                (self, next),
                (Prepared, Submitting | Cancelled)
                    | (
                        Submitting,
                        RequiresAction | Unknown | Authorized | Captured | Declined
                    )
                    | (
                        RequiresAction,
                        Unknown | Authorized | Captured | Declined | Cancelled
                    )
                    | (
                        Unknown,
                        RequiresAction | Authorized | Captured | Declined | Cancelled
                    )
                    | (Authorized, Captured | Cancelled)
                    // The only way out of a settled attempt. Not a step the
                    // system takes on its own: only the provider telling us the
                    // money left again puts an attempt here.
                    | (Captured, Refunded)
            )
    }
}

pub(crate) fn error(message: &str) -> BusinessError {
    BusinessError::new(message.to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_card_method_and_idempotency_key() {
        let mut request = PrepareCardPayment {
            charge_id: 1,
            idempotency_key: "1234567890abcdef".into(),
            method: PaymentMethod::Credit,
            installments: 12,
        };
        assert!(request.validate().is_ok());
        request.method = PaymentMethod::Debit;
        assert!(request.validate().is_err());
        request.installments = 1;
        assert!(request.validate().is_ok());
        request.idempotency_key = "contains spaces 123".into();
        assert!(request.validate().is_err());
    }

    #[test]
    fn pix_allows_exactly_one_installment() {
        let mut request = PrepareCardPayment {
            charge_id: 1,
            idempotency_key: "1234567890abcdef".into(),
            method: PaymentMethod::Pix,
            installments: 1,
        };
        assert!(request.validate().is_ok());
        // Mirrors ck_pa_installments; if these drift, a request that validates
        // here dies at the insert instead.
        request.installments = 2;
        assert!(request.validate().is_err());
        request.installments = 0;
        assert!(request.validate().is_err());
    }

    #[test]
    fn pix_is_not_representable_as_a_card_method() {
        assert_eq!(PaymentMethod::Credit.as_card(), Some(CardMethod::Credit));
        assert_eq!(PaymentMethod::Debit.as_card(), Some(CardMethod::Debit));
        // The card adapters must never be handed a Pix submission.
        assert_eq!(PaymentMethod::Pix.as_card(), None);
        for method in [PaymentMethod::Credit, PaymentMethod::Debit, PaymentMethod::Pix] {
            assert_eq!(PaymentMethod::parse(method.as_str()), Some(method));
        }
        assert_eq!(PaymentMethod::parse("boleto"), None);
    }

    #[test]
    fn advance_refuses_a_move_the_lifecycle_forbids() {
        use AttemptStatus::*;
        assert_eq!(AttemptStatus::advance("prepared", Submitting).unwrap(), "submitting");
        assert_eq!(
            AttemptStatus::advance("requires_action", Captured).unwrap(),
            "captured"
        );
        // A Pix attempt waiting on the payer may be cancelled; a settled one
        // may not be walked back, and an unknown one is never resubmitted.
        assert!(AttemptStatus::advance("requires_action", Cancelled).is_ok());
        assert!(AttemptStatus::advance("captured", Prepared).is_err());
        assert!(AttemptStatus::advance("unknown", Submitting).is_err());
        assert!(AttemptStatus::advance("not-a-status", Cancelled).is_err());
    }

    #[test]
    fn settled_money_can_be_reversed_but_never_resurrected() {
        use AttemptStatus::*;
        assert!(Captured.can_transition_to(Refunded));
        // A reversal is the end. Nothing brings the attempt back to life —
        // paying again is a new attempt against a charge that is owed again.
        assert!(!Refunded.can_transition_to(Captured));
        assert!(!Refunded.can_transition_to(Authorized));
        assert!(!Refunded.can_transition_to(Prepared));
        // And no state short of settled can be reversed.
        assert!(!Declined.can_transition_to(Refunded));
        assert!(!Prepared.can_transition_to(Refunded));
        assert_eq!(AttemptStatus::parse("refunded"), Some(Refunded));
    }

    #[test]
    fn uncertain_and_successful_attempts_cannot_be_resubmitted() {
        use AttemptStatus::*;
        assert!(Submitting.can_transition_to(Unknown));
        assert!(Unknown.can_transition_to(Captured));
        assert!(!Unknown.can_transition_to(Submitting));
        assert!(!Captured.can_transition_to(Declined));
        assert!(!Captured.can_transition_to(Prepared));
    }

    #[tokio::test]
    async fn missing_or_unscoped_identity_is_denied() {
        assert!(PaymentScope::from_current_user().is_err());
        entity::audit::run_with_user(None, async {
            assert!(PaymentScope::from_current_user().is_err());
        })
        .await;
        let user = entity::audit::AuditUser {
            id: 1,
            email: "admin@example.test".into(),
            tenant_id: None,
            enforce_tenant: false,
        };
        entity::audit::run_with_user(Some(user), async {
            assert!(PaymentScope::from_current_user().is_err());
        })
        .await;
    }
}
