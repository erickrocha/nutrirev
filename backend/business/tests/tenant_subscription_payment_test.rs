use business::commons::entity_mapper::EntityMapper;
use business::domain::tenant_subscription_payment::{
    TenantSubscriptionPayment, TenantSubscriptionPaymentEntityMapper,
};
use chrono::Utc;

#[test]
fn test_tenant_subscription_payment_entity_mapper_roundtrip() {
    let now = Utc::now();
    let payment = TenantSubscriptionPayment {
        id: 10,
        uuid: vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
        tenant_id: 1,
        business_plan_id: 2,
        plan_name: "Pro".to_string(),
        amount_cents: 19900,
        currency: "brl".to_string(),
        payment_method: "card".to_string(),
        payment_intent_id: Some("pi_12345".to_string()),
        status: "succeeded".to_string(),
        paid_at: now,
        created_at: now,
        created_by: Some("system".to_string()),
        updated_at: now,
        updated_by: None,
    };

    let active_model = TenantSubscriptionPaymentEntityMapper::build_active_model(payment.clone());
    let converted = TenantSubscriptionPaymentEntityMapper::from_active_model(active_model);

    assert_eq!(converted.id, 10);
    assert_eq!(converted.tenant_id, 1);
    assert_eq!(converted.business_plan_id, 2);
    assert_eq!(converted.plan_name, "Pro");
    assert_eq!(converted.amount_cents, 19900);
    assert_eq!(converted.currency, "brl");
    assert_eq!(converted.payment_method, "card");
    assert_eq!(converted.payment_intent_id, Some("pi_12345".to_string()));
    assert_eq!(converted.status, "succeeded");
}
