use business::use_cases::tenant_subscription_use_case::calculate_subscription_status;
use chrono::NaiveDate;

#[test]
fn subscription_is_ok_when_payment_is_in_the_future() {
    let today = NaiveDate::from_ymd_opt(2026, 11, 18).unwrap();
    let payment_date = NaiveDate::from_ymd_opt(2026, 11, 20).unwrap();
    let (status, overdue) = calculate_subscription_status(today, payment_date, 5);

    assert_eq!(status, "ok");
    assert_eq!(overdue, 0);
}

#[test]
fn subscription_is_warning_on_due_date() {
    let today = NaiveDate::from_ymd_opt(2026, 11, 18).unwrap();
    let payment_date = NaiveDate::from_ymd_opt(2026, 11, 18).unwrap();
    let (status, overdue) = calculate_subscription_status(today, payment_date, 5);

    assert_eq!(status, "warning");
    assert_eq!(overdue, 0);
}

#[test]
fn subscription_is_warning_when_within_grace_period() {
    let today = NaiveDate::from_ymd_opt(2026, 11, 20).unwrap();
    let payment_date = NaiveDate::from_ymd_opt(2026, 11, 18).unwrap(); // 2 days overdue
    let (status, overdue) = calculate_subscription_status(today, payment_date, 5);

    assert_eq!(status, "warning");
    assert_eq!(overdue, 2);
}

#[test]
fn subscription_is_warning_on_exact_grace_period_limit() {
    let today = NaiveDate::from_ymd_opt(2026, 11, 23).unwrap();
    let payment_date = NaiveDate::from_ymd_opt(2026, 11, 18).unwrap(); // exactly 5 days overdue
    let (status, overdue) = calculate_subscription_status(today, payment_date, 5);

    assert_eq!(status, "warning");
    assert_eq!(overdue, 5);
}

#[test]
fn subscription_is_blocked_when_past_grace_period() {
    let today = NaiveDate::from_ymd_opt(2026, 11, 24).unwrap();
    let payment_date = NaiveDate::from_ymd_opt(2026, 11, 18).unwrap(); // 6 days overdue > 5
    let (status, overdue) = calculate_subscription_status(today, payment_date, 5);

    assert_eq!(status, "blocked");
    assert_eq!(overdue, 6);
}
