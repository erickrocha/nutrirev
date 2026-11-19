//! What a clinic offers, and through which acquirer.
//!
//! Exclusivo para Stripe: at most one connection is enabled at a time, and the
//! methods it offers are toggled on that connection. The rules here mirror the
//! database constraints exactly.

use crate::domain::business_error::BusinessError;
use crate::domain::card_payment::PaymentMethod;

/// Acquirers this system can talk to.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Provider {
    Stripe,
}

impl Provider {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Stripe => "stripe",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value.trim().to_lowercase().as_str() {
            "stripe" => Some(Self::Stripe),
            _ => None,
        }
    }

    pub fn supports_pix(self) -> bool {
        matches!(self, Self::Stripe)
    }

    pub fn supports_tokenization(self) -> bool {
        matches!(self, Self::Stripe)
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
            PaymentMethod::Debit => false,
            PaymentMethod::Pix => self.pix,
        }
    }

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
    fn stripe_offers_every_method() {
        assert!(ALL.validate_for(Provider::Stripe).is_ok());
        assert!(Provider::Stripe.supports_pix());
        assert!(Provider::Stripe.supports_tokenization());
    }

    #[test]
    fn recurring_needs_the_card_it_charges() {
        assert!(MerchantCapabilities { credit: false, pix: true, recurring: true }
            .validate_for(Provider::Stripe)
            .is_err());
    }

    #[test]
    fn a_connection_offering_nothing_is_refused() {
        assert!(MerchantCapabilities { credit: false, pix: false, recurring: false }
            .validate_for(Provider::Stripe)
            .is_err());
    }

    #[test]
    fn a_disabled_method_is_not_offered() {
        let pix_only = MerchantCapabilities { credit: false, pix: true, recurring: false };
        assert!(pix_only.supports(PaymentMethod::Pix));
        assert!(!pix_only.supports(PaymentMethod::Credit));
        assert!(!ALL.supports(PaymentMethod::Debit));
    }

    #[test]
    fn providers_round_trip_through_their_stored_form() {
        assert_eq!(Provider::parse("stripe"), Some(Provider::Stripe));
        assert_eq!(Provider::parse("STRIPE"), Some(Provider::Stripe));
        assert_eq!(Provider::parse("rede"), None);
        assert_eq!(Provider::parse("asaas"), None);
        assert_eq!(Provider::parse("paypal"), None);
    }
}
