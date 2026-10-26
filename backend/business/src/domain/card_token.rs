//! Stored-card ("card on file") types.
//!
//! The point of a token is that the recurring charge never needs the card again.
//! Nothing here holds a PAN: `SensitiveCardData` goes in, an opaque provider
//! token comes out, and only the token plus display crumbs are ever stored.

use chrono::{DateTime, Utc};

/// Who the card belongs to, as the provider needs to see them.
///
/// The provider requires the holder's document to register a stored card, which
/// is why `tax_id` is not optional here even though the column is nullable: a
/// customer without one cannot reach this path.
pub struct TokenHolder {
    pub provider_customer_id: String,
    pub name: String,
    pub email: String,
    pub tax_id: String,
    pub postal_code: Option<String>,
    pub address_number: Option<String>,
    pub phone: Option<String>,
    /// The cardholder's IP at the moment they consented. Providers require it
    /// for stored-credential anti-fraud, and it is also our consent evidence.
    pub remote_ip: String,
}

/// What we keep after tokenising. Enough to show the customer which card is on
/// file, and nothing that could be used to make a payment elsewhere.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CardToken {
    pub provider_token: String,
    pub brand: Option<String>,
    pub last4: Option<String>,
    pub expiry_month: Option<u8>,
    pub expiry_year: Option<u16>,
}

/// An unattended charge against a stored token.
///
/// There is no `SensitiveCardData` in sight, which is the entire point: the
/// billing worker runs this with no customer present and no card to hand.
pub struct TokenChargeRequest {
    pub reference: String,
    pub amount_cents: i64,
    pub provider_customer_id: String,
    pub description: String,
    pub installments: i32,
    /// Present only because some providers require the IP of the original
    /// consent to be replayed on later merchant-initiated charges.
    pub consent_ip: Option<String>,
    pub consented_at: Option<DateTime<Utc>>,
}
