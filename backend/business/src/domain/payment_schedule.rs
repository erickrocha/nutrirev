//! Pure scheduling rules for recurring clinical-plan billing.
//!
//! Nothing here touches the database. The billing worker is a loop around these
//! functions, so every edge that matters — a dormant subscription, a plan with a
//! nonsense renewal period, the exact day a grace period expires — is decided
//! and tested here rather than in SQL.

use crate::domain::business_error::BusinessError;
use chrono::{Duration, NaiveDate};

/// A single tick never emits more than this many cycles for one subscription.
/// A subscription dormant for years would otherwise flood the customer with a
/// wall of charges the moment the worker reaches it; the remainder is picked up
/// on the following ticks.
pub const MAX_CYCLES_PER_TICK: usize = 24;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SubscriptionStatus {
    Active,
    Cancelled,
    Completed,
}

impl SubscriptionStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Cancelled => "cancelled",
            Self::Completed => "completed",
        }
    }
}

/// How a subscription's cycles get paid.
///
/// `Manual` is what every subscription did before stored cards existed and is
/// still the default: the worker emits the charge and the patient pays it by
/// hand, by card or by Pix. It is also the "avulso a cada ciclo" answer for Pix —
/// the absence of a mandate, not a mode of its own.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum BillingMode {
    #[default]
    Manual,
    /// The worker charges a stored card each cycle, with nobody present.
    CardOnFile,
    /// The payer's bank debits them, under an authorization held at the bank.
    PixAutomatico,
}

impl BillingMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Manual => "manual",
            Self::CardOnFile => "card_on_file",
            Self::PixAutomatico => "pix_automatico",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "manual" => Some(Self::Manual),
            "card_on_file" => Some(Self::CardOnFile),
            "pix_automatico" => Some(Self::PixAutomatico),
            _ => None,
        }
    }

    /// Whether the billing worker charges this subscription itself.
    ///
    /// False for `PixAutomatico`: there the provider's own subscription creates
    /// the payment and the bank debits it. Charging it here as well would bill
    /// the patient twice for one cycle.
    pub fn is_worker_charged(self) -> bool {
        matches!(self, Self::CardOnFile)
    }

    /// Whether a stored card must be attached. Mirrors `ck_pd_token_requires_mode`.
    pub fn requires_token(self) -> bool {
        matches!(self, Self::CardOnFile)
    }
}

/// Whether a charge is ready for an unattended attempt today.
///
/// The date test is the load-bearing half. `generate_due_charges` emits every
/// cycle inside a 30-day lookahead, so a charge sits `open` for a month before
/// it is owed — charging every open charge would bill every patient a month
/// early on the first tick after deploy.
pub fn is_chargeable_today(
    status: ChargeStatus,
    due_date: NaiveDate,
    today: NaiveDate,
) -> bool {
    status.is_unpaid() && due_date <= today
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ChargeStatus {
    Open,
    Overdue,
    Paid,
    Cancelled,
}

impl ChargeStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Open => "open",
            Self::Overdue => "overdue",
            Self::Paid => "paid",
            Self::Cancelled => "cancelled",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "open" => Some(Self::Open),
            "overdue" => Some(Self::Overdue),
            "paid" => Some(Self::Paid),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// `Paid` and `Cancelled` are terminal — money that already moved must never
    /// be walked back by a later worker tick. An overdue charge stays payable.
    pub fn can_transition_to(self, next: Self) -> bool {
        use ChargeStatus::*;
        self == next
            || matches!(
                (self, next),
                (Open, Overdue | Paid | Cancelled) | (Overdue, Paid | Cancelled)
            )
    }

    /// Where a charge lands when its payment is reversed.
    ///
    /// Deliberately **not** an edge in `can_transition_to`. That function guards
    /// the worker, where "paid is terminal" is exactly the rule you want: no
    /// background tick may ever walk back money that moved. A reversal is the
    /// opposite situation — the provider is telling us the money left again — so
    /// it gets its own named door rather than a hole in the general one.
    ///
    /// The charge returns to being owed, carrying its original due date, so the
    /// existing overdue and grace machinery decides access from there. It is not
    /// re-blocked on the spot: a disputed payment is not proof of delinquency,
    /// and the clinic's grace period is already the answer to "how late is too
    /// late".
    pub fn reversed(self, due_date: NaiveDate, today: NaiveDate) -> Option<Self> {
        if self != Self::Paid {
            // Only settled money can be un-settled. Anything else is a
            // duplicate notification, and doing nothing is the right answer.
            return None;
        }
        Some(if due_date < today {
            Self::Overdue
        } else {
            Self::Open
        })
    }

    pub fn is_unpaid(self) -> bool {
        matches!(self, Self::Open | Self::Overdue)
    }
}

/// The cycles a subscription owes between `next_due` and `horizon`, inclusive.
///
/// Returns `(cycle_number, due_date)` pairs starting at `start_cycle`. An empty
/// vec means the subscription is already generated past the horizon — the normal
/// case on most ticks.
pub fn cycles_until(
    next_due: NaiveDate,
    renew_period_days: i32,
    start_cycle: i32,
    horizon: NaiveDate,
) -> Result<Vec<(i32, NaiveDate)>, BusinessError> {
    if renew_period_days <= 0 {
        return Err(BusinessError::new(
            "Clinical plan renew_period_days must be greater than zero".to_owned(),
        ));
    }

    let period = Duration::days(i64::from(renew_period_days));
    let mut cycles = Vec::new();
    let mut due = next_due;
    let mut cycle = start_cycle;

    while due <= horizon && cycles.len() < MAX_CYCLES_PER_TICK {
        cycles.push((cycle, due));
        // Saturating on the far future keeps a pathological period from panicking;
        // the loop then exits because the date stops advancing past the horizon.
        due = match due.checked_add_signed(period) {
            Some(next) => next,
            None => break,
        };
        cycle += 1;
    }

    Ok(cycles)
}

/// The date a subscription should point at after `cycles` were emitted.
pub fn advance_after(
    last_emitted: NaiveDate,
    renew_period_days: i32,
) -> Result<NaiveDate, BusinessError> {
    if renew_period_days <= 0 {
        return Err(BusinessError::new(
            "Clinical plan renew_period_days must be greater than zero".to_owned(),
        ));
    }
    last_emitted
        .checked_add_signed(Duration::days(i64::from(renew_period_days)))
        .ok_or_else(|| BusinessError::new("Next due date is out of range".to_owned()))
}

/// Whether an unpaid charge has been overdue longer than the clinic allows.
///
/// The grace is counted from the due date, and the boundary is exclusive: with a
/// five-day grace a charge due on the 1st still has access on the 6th and loses
/// it on the 7th.
pub fn should_block(oldest_unpaid_due_date: NaiveDate, grace_days: i32, today: NaiveDate) -> bool {
    let grace = Duration::days(i64::from(grace_days.max(0)));
    match oldest_unpaid_due_date.checked_add_signed(grace) {
        Some(deadline) => today > deadline,
        None => false,
    }
}

/// The idempotency key for an unattended charge attempt.
///
/// Scoped to the day, not just the charge. One key per charge for all time would
/// mean one attempt per charge for all time: an attempt that lands in `unknown`
/// (a timeout — exactly what the card path is written to produce) keeps holding
/// the charge, and `uq_pa_active` would then block every future attempt on it,
/// by any method. A single dropped connection would brick that cycle forever.
///
/// Per day is naturally bounded — the charge stops being unpaid once it settles.
pub fn unattended_idempotency_key(charge_id: i32, today: NaiveDate) -> String {
    // Zero-padded to a fixed width so the key clears the 16-character minimum
    // `PrepareCardPayment::validate` enforces. Unpadded, `mit-42-20260904` is
    // fifteen characters, and every low charge id would have been rejected at
    // validation — a failure that only shows up on the earliest rows.
    format!("mit-{charge_id:010}-{}", today.format("%Y%m%d"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn date(y: i32, m: u32, d: u32) -> NaiveDate {
        NaiveDate::from_ymd_opt(y, m, d).expect("valid date")
    }

    #[test]
    fn emits_every_cycle_up_to_the_horizon_and_no_further() {
        let cycles = cycles_until(date(2026, 9, 3), 30, 1, date(2026, 10, 3)).expect("cycles");
        assert_eq!(
            cycles,
            vec![(1, date(2026, 9, 3)), (2, date(2026, 10, 3))]
        );
    }

    #[test]
    fn already_generated_past_the_horizon_emits_nothing() {
        let cycles = cycles_until(date(2026, 12, 1), 30, 5, date(2026, 10, 3)).expect("cycles");
        assert!(cycles.is_empty());
    }

    #[test]
    fn day_arithmetic_crosses_a_leap_day() {
        // 2028 is a leap year: 30 days from 2028-02-01 lands on March 2, not 3.
        let cycles = cycles_until(date(2028, 2, 1), 30, 1, date(2028, 3, 2)).expect("cycles");
        assert_eq!(cycles.last().expect("a cycle").1, date(2028, 3, 2));
    }

    #[test]
    fn a_dormant_subscription_is_capped_instead_of_flooding_the_customer() {
        // Ten years of weekly cycles would be ~520 charges in one tick.
        let cycles = cycles_until(date(2016, 1, 1), 7, 1, date(2026, 1, 1)).expect("cycles");
        assert_eq!(cycles.len(), MAX_CYCLES_PER_TICK);
        assert_eq!(cycles[0], (1, date(2016, 1, 1)));
    }

    #[test]
    fn a_plan_without_a_renewal_period_is_rejected_rather_than_looping() {
        assert!(cycles_until(date(2026, 9, 3), 0, 1, date(2026, 10, 3)).is_err());
        assert!(cycles_until(date(2026, 9, 3), -30, 1, date(2026, 10, 3)).is_err());
        assert!(advance_after(date(2026, 9, 3), 0).is_err());
    }

    #[test]
    fn only_a_charge_that_is_actually_due_may_be_charged_unattended() {
        let today = date(2026, 9, 4);
        // The bug this guards: charges are generated 30 days ahead, so "every
        // open charge" would bill every patient a month early on the first tick.
        assert!(!is_chargeable_today(ChargeStatus::Open, date(2026, 10, 1), today));
        assert!(is_chargeable_today(ChargeStatus::Open, today, today));
        assert!(is_chargeable_today(ChargeStatus::Open, date(2026, 8, 1), today));
        assert!(is_chargeable_today(ChargeStatus::Overdue, date(2026, 8, 1), today));
        // Money that already moved is never charged again.
        assert!(!is_chargeable_today(ChargeStatus::Paid, today, today));
        assert!(!is_chargeable_today(ChargeStatus::Cancelled, today, today));
    }

    #[test]
    fn the_unattended_key_is_scoped_to_the_day_not_only_the_charge() {
        let first = unattended_idempotency_key(42, date(2026, 9, 4));
        assert_eq!(first, "mit-0000000042-20260904");
        // Same day, same charge: the retry must land on the same reservation.
        assert_eq!(first, unattended_idempotency_key(42, date(2026, 9, 4)));
        // Next day it differs, which is what stops one timeout from bricking the
        // cycle forever — a per-charge-only key would allow exactly one attempt.
        assert_ne!(first, unattended_idempotency_key(42, date(2026, 9, 5)));
        assert_ne!(first, unattended_idempotency_key(43, date(2026, 9, 4)));
        // The reservation key must survive the ASCII/length validation.
        assert!(first.len() >= 16 && first.len() <= 64);
        assert!(first.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-'));
    }

    #[test]
    fn only_card_on_file_is_charged_by_the_worker() {
        assert!(BillingMode::CardOnFile.is_worker_charged());
        assert!(BillingMode::CardOnFile.requires_token());
        // Manual is the patient paying by hand — including Pix, every cycle.
        assert!(!BillingMode::Manual.is_worker_charged());
        assert!(!BillingMode::Manual.requires_token());
        // Pix Automatico is debited by the payer's bank. Charging it here too
        // would bill one cycle twice.
        assert!(!BillingMode::PixAutomatico.is_worker_charged());
        assert!(!BillingMode::PixAutomatico.requires_token());

        for mode in [BillingMode::Manual, BillingMode::CardOnFile, BillingMode::PixAutomatico] {
            assert_eq!(BillingMode::parse(mode.as_str()), Some(mode));
        }
        assert_eq!(BillingMode::parse("boleto"), None);
        assert_eq!(BillingMode::default(), BillingMode::Manual);
    }

    #[test]
    fn settled_charges_are_terminal() {
        use ChargeStatus::*;
        assert!(Open.can_transition_to(Overdue));
        assert!(Overdue.can_transition_to(Paid));
        assert!(!Paid.can_transition_to(Overdue));
        assert!(!Paid.can_transition_to(Open));
        assert!(!Cancelled.can_transition_to(Paid));
        assert!(Paid.can_transition_to(Paid));
    }

    #[test]
    fn a_reversed_charge_is_owed_again_carrying_its_original_due_date() {
        let today = date(2026, 9, 4);
        // Still inside its window: owed, not yet late.
        assert_eq!(
            ChargeStatus::Paid.reversed(date(2026, 9, 10), today),
            Some(ChargeStatus::Open)
        );
        // Long past due: straight back to overdue, so the grace period picks up
        // from where it actually stands rather than restarting.
        assert_eq!(
            ChargeStatus::Paid.reversed(date(2026, 8, 1), today),
            Some(ChargeStatus::Overdue)
        );
        // Anything that was not settled cannot be reversed. A redelivered refund
        // notification lands here and must be a no-op, not an error.
        assert_eq!(ChargeStatus::Open.reversed(today, today), None);
        assert_eq!(ChargeStatus::Overdue.reversed(today, today), None);
        assert_eq!(ChargeStatus::Cancelled.reversed(today, today), None);
        // And the worker's own rules are untouched: paid stays terminal there.
        assert!(!ChargeStatus::Paid.can_transition_to(ChargeStatus::Open));
        assert!(!ChargeStatus::Paid.can_transition_to(ChargeStatus::Overdue));
    }

    #[test]
    fn grace_expires_the_day_after_the_grace_window() {
        let due = date(2026, 9, 1);
        assert!(!should_block(due, 5, date(2026, 9, 5)));
        assert!(!should_block(due, 5, date(2026, 9, 6)));
        assert!(should_block(due, 5, date(2026, 9, 7)));
    }

    #[test]
    fn a_zero_grace_blocks_the_day_after_the_due_date() {
        let due = date(2026, 9, 1);
        assert!(!should_block(due, 0, date(2026, 9, 1)));
        assert!(should_block(due, 0, date(2026, 9, 2)));
    }
}
