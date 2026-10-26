//! What a clinic offers, and through which acquirer.
//!
//! One acquirer per clinic: at most one connection is enabled at a time, and the
//! methods it offers are toggled on that connection. The rules here mirror the
//! database constraints exactly, so a bad combination is refused with a useful
//! message instead of surfacing as a constraint violation.

use crate::domain::business_error::BusinessError;
use crate::domain::card_payment::PaymentMethod;

/// Acquirers this system can talk to.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Provider {
    Rede,
    Asaas,
}

impl Provider {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Rede => "rede",
            Self::Asaas => "asaas",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "rede" => Some(Self::Rede),
            "asaas" => Some(Self::Asaas),
            _ => None,
        }
    }

    /// Whether this acquirer can issue Pix charges at all.
    ///
    /// e.Rede's v2 transaction API is card-only as integrated here. Saying so
    /// once, in one place, is what keeps a clinic from switching on a method
    /// that would fail in front of a patient.
    pub fn supports_pix(self) -> bool {
        matches!(self, Self::Asaas)
    }

    /// Whether this acquirer can store a card for unattended charging.
    pub fn supports_tokenization(self) -> bool {
        matches!(self, Self::Asaas)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct MerchantCapabilities {
    pub credit: bool,
    pub pix: bool,
    pub recurring: bool,
}

impl MerchantCapabilities {
    pub fn supports(self, method: PaymentMethod) -> bool {
        match method {
            PaymentMethod::Credit => self.credit,
            // Debit is not offered by any connection yet; it has no toggle, and
            // defaulting it to the credit flag would silently enable a method
            // nothing implements.
            PaymentMethod::Debit => false,
            PaymentMethod::Pix => self.pix,
        }
    }

    /// Rejects a combination the acquirer cannot honour.
    ///
    /// Same three rules the table enforces: an acquirer without Pix cannot offer
    /// it, one without tokenization cannot bill recurringly, and recurring
    /// billing charges a stored card so it cannot run without the card method.
    pub fn validate_for(self, provider: Provider) -> Result<(), BusinessError> {
        if self.pix && !provider.supports_pix() {
            return Err(BusinessError::new(format!(
                "{} does not offer Pix",
                provider.as_str()
            )));
        }
        if self.recurring && !provider.supports_tokenization() {
            return Err(BusinessError::new(format!(
                "{} cannot store a card for recurring billing",
                provider.as_str()
            )));
        }
        if self.recurring && !self.credit {
            return Err(BusinessError::new(
                "Recurring billing charges a stored card, so the card method must be on"
                    .to_owned(),
            ));
        }
        if !self.credit && !self.pix {
            return Err(BusinessError::new(
                "At least one payment method must be enabled".to_owned(),
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const ALL: MerchantCapabilities = MerchantCapabilities {
        credit: true,
        pix: true,
        recurring: true,
    };

    #[test]
    fn the_card_only_acquirer_cannot_offer_pix_or_recurring() {
        assert!(ALL.validate_for(Provider::Asaas).is_ok());
        // The failure this prevents: a clinic switching on Pix for an acquirer
        // that cannot issue it, and finding out at a patient's checkout.
        assert!(ALL.validate_for(Provider::Rede).is_err());
        assert!(MerchantCapabilities { credit: true, pix: false, recurring: false }
            .validate_for(Provider::Rede)
            .is_ok());
        assert!(MerchantCapabilities { credit: true, pix: true, recurring: false }
            .validate_for(Provider::Rede)
            .is_err());
        assert!(MerchantCapabilities { credit: true, pix: false, recurring: true }
            .validate_for(Provider::Rede)
            .is_err());
    }

    #[test]
    fn recurring_needs_the_card_it_charges() {
        assert!(MerchantCapabilities { credit: false, pix: true, recurring: true }
            .validate_for(Provider::Asaas)
            .is_err());
    }

    #[test]
    fn a_connection_offering_nothing_is_refused() {
        assert!(MerchantCapabilities { credit: false, pix: false, recurring: false }
            .validate_for(Provider::Asaas)
            .is_err());
    }

    #[test]
    fn a_disabled_method_is_not_offered() {
        let pix_only = MerchantCapabilities { credit: false, pix: true, recurring: false };
        assert!(pix_only.supports(PaymentMethod::Pix));
        assert!(!pix_only.supports(PaymentMethod::Credit));
        // Debit has no toggle and nothing implements it, so it is never on.
        assert!(!ALL.supports(PaymentMethod::Debit));
    }

    #[test]
    fn providers_round_trip_through_their_stored_form() {
        for provider in [Provider::Rede, Provider::Asaas] {
            assert_eq!(Provider::parse(provider.as_str()), Some(provider));
        }
        assert_eq!(Provider::parse("stripe"), None);
    }
}
