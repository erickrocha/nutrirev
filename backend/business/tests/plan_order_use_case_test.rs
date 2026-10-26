use business::use_cases::plan_order_use_case::{digits, required, valid_email};

#[test]
fn email_validation() {
    assert!(valid_email("a@b.com"));
    assert!(!valid_email("a@b"));
    assert!(!valid_email("@b.com"));
    assert!(!valid_email("a@@b.com"));
    assert!(!valid_email("a b@c.com"));
}

#[test]
fn phone_and_required_helpers() {
    assert_eq!(digits("(11) 99999-0000"), "11999990000");
    assert!(required("   ", "name", 10).is_err());
    assert!(required("abcdefghijk", "name", 10).is_err());
    assert_eq!(required(" ok ", "name", 10).ok().as_deref(), Some("ok"));
}
