use business::use_cases::tenant_use_case::normalized_tax_id;

#[test]
fn blank_tax_id_is_absent() {
    assert_eq!(normalized_tax_id(None).ok(), Some(None));
    assert_eq!(normalized_tax_id(Some("  ")).ok(), Some(None));
}

#[test]
fn valid_cpf_and_cnpj_are_stored_digits_only() {
    assert_eq!(normalized_tax_id(Some("529.982.247-25")).ok().flatten().as_deref(), Some("52998224725"));
    assert_eq!(normalized_tax_id(Some("11.222.333/0001-81")).ok().flatten().as_deref(), Some("11222333000181"));
}

#[test]
fn malformed_tax_id_is_rejected() {
    assert!(normalized_tax_id(Some("123")).is_err());
    assert!(normalized_tax_id(Some("529.982.247-26")).is_err());
    assert!(normalized_tax_id(Some("111.111.111-11")).is_err());
}
