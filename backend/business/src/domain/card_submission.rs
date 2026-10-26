use crate::domain::business_error::BusinessError;
use crate::domain::card_payment::{error, CardMethod};
use zeroize::{Zeroize, Zeroizing};

/// Ephemeral cardholder data. This type is intentionally neither `Clone`, `Debug`,
/// nor serializable and must never cross a persistence or telemetry boundary.
pub struct SensitiveCardData {
    number: Zeroizing<String>,
    security_code: Zeroizing<String>,
    pub expiration_month: u8,
    pub expiration_year: u16,
    pub cardholder_name: String,
}

impl SensitiveCardData {
    pub fn new(
        number: String,
        security_code: String,
        expiration_month: u8,
        expiration_year: u16,
        cardholder_name: String,
    ) -> Result<Self, BusinessError> {
        let mut value = Self {
            number: Zeroizing::new(number),
            security_code: Zeroizing::new(security_code),
            expiration_month,
            expiration_year,
            cardholder_name,
        };
        if !(13..=19).contains(&value.number.len())
            || !value.number.bytes().all(|b| b.is_ascii_digit())
            || !luhn(value.number.as_bytes())
            || !(3..=4).contains(&value.security_code.len())
            || !value.security_code.bytes().all(|b| b.is_ascii_digit())
            || !(1..=12).contains(&value.expiration_month)
            || !(2020..=2099).contains(&value.expiration_year)
            || value.cardholder_name.is_empty()
            || value.cardholder_name.len() > 30
            || !value
                .cardholder_name
                .bytes()
                .all(|b| b.is_ascii_alphabetic() || b == b' ')
        {
            value.cardholder_name.zeroize();
            return Err(error("Invalid card data"));
        }
        Ok(value)
    }

    pub(crate) fn number(&self) -> &str {
        self.number.as_str()
    }

    pub(crate) fn security_code(&self) -> &str {
        self.security_code.as_str()
    }
}

impl Drop for SensitiveCardData {
    fn drop(&mut self) {
        self.cardholder_name.zeroize();
    }
}

pub struct CardSubmission {
    pub attempt_id: i32,
    pub reference: String,
    pub amount_cents: i64,
    pub method: CardMethod,
    pub installments: i32,
    pub card: SensitiveCardData,
    /// Who is paying, as the provider needs to see them.
    ///
    /// Optional because the two acquirers genuinely differ: e.Rede's v2
    /// transaction API takes the card and nothing else, while a PSP attaches
    /// every payment to a registered payer and refuses the request without one.
    /// An adapter that needs it rejects a submission that lacks it rather than
    /// inventing a payer.
    pub holder: Option<crate::domain::card_token::TokenHolder>,
}

pub struct AuthorizeCardPayment {
    pub attempt_id: i32,
    pub card: SensitiveCardData,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CardProcessorResult {
    pub provider_transaction_id: String,
    pub return_code: String,
    pub return_message: String,
    pub approved: bool,
    /// Whether the money was actually captured, not merely authorized.
    ///
    /// An authorization that is never captured expires and never settles, so a
    /// charge must never be marked paid on the strength of `approved` alone.
    pub captured: bool,
    pub last4: Option<String>,
    pub brand: Option<String>,
}

fn luhn(number: &[u8]) -> bool {
    let sum: u32 = number
        .iter()
        .rev()
        .enumerate()
        .map(|(index, digit)| {
            let mut value = u32::from(*digit - b'0');
            if index % 2 == 1 {
                value *= 2;
                if value > 9 {
                    value -= 9;
                }
            }
            value
        })
        .sum();
    sum % 10 == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_invalid_pan_and_accepts_a_luhn_test_number() {
        assert!(SensitiveCardData::new(
            "4111111111111112".into(),
            "123".into(),
            12,
            2030,
            "TEST USER".into()
        )
        .is_err());
        assert!(SensitiveCardData::new(
            "4111111111111111".into(),
            "123".into(),
            12,
            2030,
            "TEST USER".into()
        )
        .is_ok());
    }
}
