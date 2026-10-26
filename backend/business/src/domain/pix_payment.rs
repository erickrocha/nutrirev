//! Pix charge types and the lifecycle a Pix charge moves through.
//!
//! Pix is asynchronous: we hand the customer a QR code and the money arrives (or
//! does not) some time later, out of band. That is the whole reason this needs a
//! status of its own rather than reusing the card flow's synchronous outcome.

use crate::domain::business_error::BusinessError;
use chrono::{DateTime, Utc};

/// What we ask the provider to create. Carries no card data and no clinic
/// credentials; the amount is the one already stored on our charge, never a
/// number that came from a request.
pub struct PixChargeRequest {
    /// Our attempt reference, echoed back by the provider so a webhook can be
    /// matched to the row that started it.
    pub reference: String,
    pub amount_cents: i64,
    /// The payer's id at the provider.
    pub provider_customer_id: String,
    pub description: String,
    pub expires_in_seconds: i64,
}

pub struct PixChargeResult {
    pub provider_payment_id: String,
    /// The BR Code ("copia e cola"). Short, and the only part worth storing.
    pub payload: String,
    /// Base64 PNG of the QR. Passed straight through to the client in the same
    /// response and deliberately never persisted: the payment tables are read
    /// and row-locked on every prepare and authorize, and SeaORM selects every
    /// column, so a blob here would be dragged through the hottest path in the
    /// system for no benefit.
    pub encoded_image: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
}

/// What the provider says about a charge right now.
///
/// Carries the amount because the webhook must never settle on a value taken
/// from the callback body: the body is attacker-shaped, this is a read we made.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PixChargeState {
    pub status: PixStatus,
    pub amount_cents: Option<i64>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PixStatus {
    /// QR issued, money not yet received.
    Pending,
    Paid,
    Expired,
    Cancelled,
    /// Money came back out after having been received.
    Refunded,
}

impl PixStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Paid => "paid",
            Self::Expired => "expired",
            Self::Cancelled => "cancelled",
            Self::Refunded => "refunded",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "pending" => Some(Self::Pending),
            "paid" => Some(Self::Paid),
            "expired" => Some(Self::Expired),
            "cancelled" => Some(Self::Cancelled),
            "refunded" => Some(Self::Refunded),
            _ => None,
        }
    }

    /// `Paid` is not terminal — a refund or a chargeback moves money back out,
    /// and pretending otherwise is how a reversed payment silently keeps a
    /// charge settled and the customer's access open.
    pub fn can_transition_to(self, next: Self) -> bool {
        use PixStatus::*;
        self == next
            || matches!(
                (self, next),
                (Pending, Paid | Expired | Cancelled) | (Paid, Refunded)
            )
    }
}

/// Amount as the provider's JSON expects it: reais with two decimal places.
///
/// The provider takes a JSON number, not cents, so the conversion happens here
/// once instead of at each call site. `f64` is safe for this and only this:
/// shortest-roundtrip formatting turns `cents as f64 / 100.0` back into exactly
/// the two-decimal literal we meant, for every amount this system can hold. It
/// is not safe for arithmetic — never add or compare money in this form. Cents
/// stay the only representation we store, compare, or settle against.
pub fn amount_in_reais(amount_cents: i64) -> Result<f64, BusinessError> {
    if amount_cents <= 0 {
        return Err(BusinessError::new(
            "Payment amount must be greater than zero".to_owned(),
        ));
    }
    Ok(amount_cents as f64 / 100.0)
}

/// Provider reais back into our cents.
///
/// Rounds rather than truncating: `50.01` arrives as a float that may be a
/// hair under, and `(x * 100.0) as i64` would silently make it 5000.
pub fn cents_from_reais(value: f64) -> Option<i64> {
    if !value.is_finite() || value < 0.0 {
        return None;
    }
    Some((value * 100.0).round() as i64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cents_serialise_as_the_exact_two_decimal_amount() {
        let cases = [
            (1i64, "0.01"),
            (10, "0.1"),
            (99, "0.99"),
            (100, "1.0"),
            (5001, "50.01"),
            (123456, "1234.56"),
            (99999999, "999999.99"),
        ];
        for (cents, expected) in cases {
            let json = serde_json::to_string(&amount_in_reais(cents).expect("amount")).unwrap();
            assert_eq!(json, expected, "{cents} cents");
            // Whatever the formatting, the value must round-trip back to the
            // same cents. That is the property that actually matters.
            let back = (json.parse::<f64>().unwrap() * 100.0).round() as i64;
            assert_eq!(back, cents, "{cents} cents did not round-trip");
        }
    }

    #[test]
    fn provider_amounts_round_trip_back_to_the_same_cents() {
        for cents in [1i64, 10, 99, 100, 5001, 123456, 99999999] {
            let reais = amount_in_reais(cents).expect("amount");
            assert_eq!(cents_from_reais(reais), Some(cents), "{cents} cents");
        }
        // Truncation instead of rounding is the classic one-cent bug here.
        assert_eq!(cents_from_reais(50.01), Some(5001));
        assert_eq!(cents_from_reais(0.0), Some(0));
        assert_eq!(cents_from_reais(-1.0), None);
        assert_eq!(cents_from_reais(f64::NAN), None);
    }

    #[test]
    fn a_non_positive_amount_is_never_sent_to_a_provider() {
        assert!(amount_in_reais(0).is_err());
        assert!(amount_in_reais(-100).is_err());
    }

    #[test]
    fn a_received_payment_can_still_be_reversed() {
        use PixStatus::*;
        assert!(Pending.can_transition_to(Paid));
        assert!(Pending.can_transition_to(Expired));
        assert!(Paid.can_transition_to(Refunded));
        // Money that arrived cannot un-arrive into a waiting state.
        assert!(!Paid.can_transition_to(Pending));
        assert!(!Expired.can_transition_to(Paid));
        assert!(!Cancelled.can_transition_to(Paid));
    }

    #[test]
    fn every_status_round_trips_through_its_stored_form() {
        for status in [
            PixStatus::Pending,
            PixStatus::Paid,
            PixStatus::Expired,
            PixStatus::Cancelled,
            PixStatus::Refunded,
        ] {
            assert_eq!(PixStatus::parse(status.as_str()), Some(status));
        }
        assert_eq!(PixStatus::parse("something-else"), None);
    }
}
