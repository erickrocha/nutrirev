#[cfg(test)]
mod tests {
    use business::commons::entity_mapper::EntityMapper;
    use business::domain::tenant::{Tenant, TenantEntityMapper};
    use business::gateway::tenant_gateway::TenantGateway;
    use business::use_cases::tenant_use_case::TenantUseCase;
    use entity::tenant_entity;
    use sea_orm::{DatabaseBackend, MockDatabase};

    #[tokio::test]
    async fn test_tenant_entity_mapper_conversion() {
        let domain_tenant = Tenant {
            id: Some(1),
            uuid: Some("550e8400-e29b-41d4-a716-446655440000".to_string()),
            name: Some("Acme Corp".to_string()),
            email: None,
            phone: None,
            address_line1: None,
            address_line2: None,
            locality: None,
            administrative_area: None,
            postal_code: None,
            country_code: None,
            created_at: None,
            updated_at: None,
            created_by: Some("admin".to_string()),
            updated_by: Some("admin".to_string()),
        };

        let active_model = TenantEntityMapper::build_active_model(domain_tenant.clone());
        let converted_tenant = TenantEntityMapper::from_active_model(active_model);

        assert_eq!(converted_tenant.id, Some(1));
        assert_eq!(converted_tenant.name, Some("Acme Corp".to_string()));
    }

    #[tokio::test]
    async fn test_tenant_use_case_create_success() {
        use sea_orm::MockExecResult;

        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_exec_results([MockExecResult {
                last_insert_id: 1,
                rows_affected: 1,
            }])
            .append_query_results([[tenant_entity::Model {
                id: 1,
                uuid: vec![0; 16],
                name: Some("Acme Corp".to_string()),
                email: None,
                phone: None,
                address_line1: None,
                address_line2: None,
                locality: None,
                administrative_area: None,
                postal_code: None,
                country_code: None,
                created_at: chrono::Utc::now(),
                created_by: Some("admin".to_string()),
                updated_at: chrono::Utc::now(),
                updated_by: None,
            }]])
            .into_connection();

        let gateway = TenantGateway::new(db);
        let use_case = TenantUseCase::new(gateway);

        let input = Tenant {
            id: None,
            uuid: None,
            name: Some("Acme Corp".to_string()),
            email: None,
            phone: None,
            address_line1: None,
            address_line2: None,
            locality: None,
            administrative_area: None,
            postal_code: None,
            country_code: None,
            created_at: None,
            updated_at: None,
            created_by: Some("admin".to_string()),
            updated_by: None,
        };

        let result = use_case.create(input).await;
        assert!(result.is_ok());
        let tenant = result.unwrap();
        assert_eq!(tenant.id, Some(1));
        assert_eq!(tenant.name, Some("Acme Corp".to_string()));
    }

    #[tokio::test]
    async fn test_tenant_use_case_create_validation_failure() {
        let db = MockDatabase::new(DatabaseBackend::MySql).into_connection();
        let gateway = TenantGateway::new(db);
        let use_case = TenantUseCase::new(gateway);

        let input = Tenant {
            id: None,
            uuid: None,
            name: Some("   ".to_string()),
            email: None,
            phone: None,
            address_line1: None,
            address_line2: None,
            locality: None,
            administrative_area: None,
            postal_code: None,
            country_code: None,
            created_at: None,
            updated_at: None,
            created_by: None,
            updated_by: None,
        };

        let result = use_case.create(input).await;
        assert!(result.is_err());
        assert_eq!(result.unwrap_err().message, "Tenant name is required");
    }

    #[tokio::test]
    async fn test_tenant_use_case_find_by_id_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results([Vec::<tenant_entity::Model>::new()])
            .into_connection();

        let gateway = TenantGateway::new(db);
        let use_case = TenantUseCase::new(gateway);

        let result = use_case.find_by_id(999).await;
        assert!(result.is_err());
        assert_eq!(result.unwrap_err().message, "Tenant not found");
    }

    #[tokio::test]
    async fn test_seed_sysadmin_creates_user() {
        use business::domain::enums::Role;
        use business::use_cases::user_use_case::UserUseCase;
        use entity::user_entity;
        use sea_orm::MockExecResult;

        std::env::set_var("SYSADMIN_EMAIL", "testadmin@afrodite.com");
        std::env::set_var("SYSADMIN_PASSWORD", "secret123");

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // find_by_email query -> returns None
            .append_query_results([Vec::<user_entity::Model>::new()])
            // persist save() insert -> exec result
            .append_exec_results([MockExecResult {
                last_insert_id: 1,
                rows_affected: 1,
            }])
            // persist save() -> query active model result
            .append_query_results([[user_entity::Model {
                id: 1,
                uuid: vec![0; 16],
                name: Some("System Administrator".to_string()),
                email: "testadmin@afrodite.com".to_string(),
                password: "hashed_password".to_string(),
                first_login: false,
                enabled: true,
                tenant_id: None,
                role: "SysAdmin".to_string(),
                created_at: chrono::Utc::now(),
                created_by: Some("system".to_string()),
                updated_at: chrono::Utc::now(),
                updated_by: None,
            }]])
            .into_connection();

        let seeded_user = UserUseCase::seed_sysadmin(&db).await;
        assert!(seeded_user.is_some());
        let user = seeded_user.unwrap();
        assert_eq!(user.email, "testadmin@afrodite.com");
        assert_eq!(user.role, Role::SysAdmin);
        assert_eq!(user.tenant_id, None);
    }

    #[tokio::test]
    async fn test_seed_sysadmin_updates_existing_user() {
        use business::domain::enums::Role;
        use business::use_cases::user_use_case::UserUseCase;
        use entity::user_entity;
        use sea_orm::MockExecResult;

        std::env::set_var("SYSADMIN_EMAIL", "new-admin@nutrirev.com");
        std::env::set_var("SYSADMIN_PASSWORD", "new-secret");

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // find_by_role query -> returns the existing SysAdmin (old email)
            .append_query_results([[user_entity::Model {
                id: 1,
                uuid: vec![0; 16],
                name: Some("System Administrator".to_string()),
                email: "old-admin@afrodite.com".to_string(),
                password: "old_hashed_password".to_string(),
                first_login: false,
                enabled: true,
                tenant_id: None,
                role: "SysAdmin".to_string(),
                created_at: chrono::Utc::now(),
                created_by: Some("system".to_string()),
                updated_at: chrono::Utc::now(),
                updated_by: None,
            }]])
            // persist save() update -> exec result
            .append_exec_results([MockExecResult {
                last_insert_id: 1,
                rows_affected: 1,
            }])
            // persist save() -> query active model result
            .append_query_results([[user_entity::Model {
                id: 1,
                uuid: vec![0; 16],
                name: Some("System Administrator".to_string()),
                email: "new-admin@nutrirev.com".to_string(),
                password: "new_hashed_password".to_string(),
                first_login: false,
                enabled: true,
                tenant_id: None,
                role: "SysAdmin".to_string(),
                created_at: chrono::Utc::now(),
                created_by: Some("system".to_string()),
                updated_at: chrono::Utc::now(),
                updated_by: Some("system".to_string()),
            }]])
            .into_connection();

        let seeded_user = UserUseCase::seed_sysadmin(&db).await;
        assert!(seeded_user.is_some());
        let user = seeded_user.unwrap();
        assert_eq!(user.id, Some(1));
        assert_eq!(user.email, "new-admin@nutrirev.com");
        assert_eq!(user.role, Role::SysAdmin);
    }

    #[tokio::test]
    async fn test_doctor_entity_mapper_conversion() {
        use business::domain::doctor::{Doctor, DoctorEntityMapper};

        let domain_doctor = Doctor {
            id: Some(10),
            uuid: Some("550e8400-e29b-41d4-a716-446655440000".to_string()),
            tenant_id: Some(1),
            name: "Dr. Gregory House".to_string(),
            document: Some("12345678901".to_string()),
            date_of_birth: Some(chrono::NaiveDate::from_ymd_opt(1970, 5, 15).unwrap()),
            photo_base64: Some(vec![1, 2, 3]),
            city: Some("Princeton".to_string()),
            province: Some("NJ".to_string()),
            email: Some("house@diagnostics.org".to_string()),
            phone: Some("555-0199".to_string()),
            created_at: None,
            updated_at: None,
            created_by: None,
            updated_by: None,
        };

        let active_model = DoctorEntityMapper::build_active_model(domain_doctor.clone());
        let converted = DoctorEntityMapper::from_active_model(active_model);

        assert_eq!(converted.id, Some(10));
        assert_eq!(converted.name, "Dr. Gregory House");
        assert_eq!(converted.tenant_id, Some(1));
        assert_eq!(converted.document, Some("12345678901".to_string()));
    }

    #[tokio::test]
    async fn test_doctor_use_case_create_validation_failure() {
        use business::domain::doctor::Doctor;
        use business::gateway::doctor_gateway::DoctorGateway;
        use business::use_cases::doctor_use_case::DoctorUseCase;

        let db = MockDatabase::new(DatabaseBackend::MySql).into_connection();
        let gateway = DoctorGateway::new(db);
        let use_case = DoctorUseCase::new(gateway);

        let input = Doctor {
            name: "   ".to_string(),
            ..Default::default()
        };

        let result = use_case.create(input).await;
        assert!(result.is_err());
        assert_eq!(result.unwrap_err().message, "Doctor name cannot be empty");
    }
}

#[cfg(test)]
mod card_payments {
    use business::domain::card_payment::{CardMethod, PrepareCardPayment};
    use business::use_cases::card_payment_use_case::CardPaymentUseCase;
    use entity::{
        audit::{run_with_user, AuditUser},
        payment_attempt_entity as attempt, payment_charge_entity as charge,
        payment_merchant_entity as merchant,
    };
    use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};

    fn user() -> Option<AuditUser> {
        Some(AuditUser {
            id: 7,
            email: "payments@example.test".into(),
            tenant_id: Some(11),
            enforce_tenant: true,
        })
    }
    fn request() -> PrepareCardPayment {
        PrepareCardPayment {
            charge_id: 23,
            idempotency_key: "card-test-key-0001".into(),
            method: CardMethod::Credit,
            installments: 3,
        }
    }
    fn charge() -> charge::Model {
        charge::Model {
            id: 23,
            tenant_id: 11,
            customer_id: 4,
            clinical_plan_id: None,
            amount_cents: 15990,
            currency: "BRL".into(),
            due_date: chrono::Utc::now().date_naive(),
            status: "open".into(),
            created_at: chrono::Utc::now(),
        }
    }
    fn attempt() -> attempt::Model {
        attempt::Model {
            id: 5,
            tenant_id: 11,
            charge_id: 23,
            merchant_id: 17,
            idempotency_key: "card-test-key-0001".into(),
            reference: uuid::Uuid::new_v4().to_string(),
            method: "credit".into(),
            installments: 3,
            amount_cents: 15990,
            currency: "BRL".into(),
            status: "prepared".into(),
            active_charge_id: Some(23),
            submitted_by_user_id: None,
            provider_transaction_id: None,
            return_code: None,
            return_message: None,
            last4: None,
            brand: None,
            submitted_at: None,
            completed_at: None,
            created_at: chrono::Utc::now(),
        }
    }
    fn merchant() -> merchant::Model {
        merchant::Model {
            id: 17,
            tenant_id: 11,
            provider: "rede".into(),
            environment: "sandbox".into(),
            merchant_reference: "test-merchant".into(),
            credentials_secret_ref: "secret/rede/test".into(),
            status: "enabled".into(),
            created_at: chrono::Utc::now(),
        }
    }

    #[tokio::test]
    async fn preparation_without_identity_never_accesses_database() {
        let db = MockDatabase::new(DatabaseBackend::MySql).into_connection();
        assert!(CardPaymentUseCase::prepare(&db, request()).await.is_err());
        assert!(db.into_transaction_log().is_empty());
    }

    #[tokio::test]
    async fn missing_charge_is_rejected_with_tenant_filtered_lock() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results([Vec::<charge::Model>::new()])
            .into_connection();
        let result = run_with_user(user(), CardPaymentUseCase::prepare(&db, request())).await;
        assert_eq!(result.unwrap_err().message, "Charge not found");
        let sql = format!("{:?}", db.into_transaction_log());
        assert!(sql.contains("tenant_id"));
        assert!(sql.contains("FOR UPDATE"));
    }

    #[tokio::test]
    async fn idempotent_retry_returns_original_attempt_without_insert() {
        let existing = attempt();
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results([[charge()]])
            .append_query_results([[existing.clone()]])
            .into_connection();
        let result = run_with_user(user(), CardPaymentUseCase::prepare(&db, request()))
            .await
            .unwrap();
        assert_eq!(result.id, existing.id);
        assert_eq!(result.reference, existing.reference);
        assert!(!format!("{:?}", db.into_transaction_log()).contains("INSERT"));
    }

    #[tokio::test]
    async fn changed_request_cannot_reuse_key() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results([[charge()]])
            .append_query_results([[attempt()]])
            .into_connection();
        let mut changed = request();
        changed.installments = 2;
        let result = run_with_user(user(), CardPaymentUseCase::prepare(&db, changed)).await;
        assert!(result.unwrap_err().message.contains("different request"));
    }

    #[tokio::test]
    async fn another_key_cannot_bypass_existing_reservation() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results([[charge()]])
            .append_query_results([Vec::<attempt::Model>::new()])
            .append_query_results([[attempt()]])
            .into_connection();
        let result = run_with_user(user(), CardPaymentUseCase::prepare(&db, request())).await;
        assert!(result.unwrap_err().message.contains("already reserves"));
    }

    #[tokio::test]
    async fn no_enabled_sandbox_connection_fails_closed() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results([[charge()]])
            .append_query_results([Vec::<attempt::Model>::new(), Vec::new()])
            .append_query_results([Vec::<merchant::Model>::new()])
            .into_connection();
        let result = run_with_user(user(), CardPaymentUseCase::prepare(&db, request())).await;
        assert!(result.unwrap_err().message.contains("sandbox"));
    }

    #[tokio::test]
    async fn prepares_using_server_charge_and_clinic_merchant() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results([[charge()]])
            .append_query_results([Vec::<attempt::Model>::new(), Vec::new()])
            .append_query_results([[merchant()]])
            .append_exec_results([MockExecResult {
                last_insert_id: 5,
                rows_affected: 1,
            }])
            .append_query_results([[attempt()]])
            .into_connection();
        let result = run_with_user(user(), CardPaymentUseCase::prepare(&db, request()))
            .await
            .unwrap();
        assert_eq!(result.amount_cents, 15990);
        assert_eq!(result.merchant_id, 17);
        let sql = format!("{:?}", db.into_transaction_log());
        assert!(sql.contains("INSERT INTO"));
        assert!(sql.contains("sandbox"));
        assert!(!sql.contains("card_number"));
    }
}
