//! Run only against an isolated, migrated MariaDB database.
//!
//! Prova a separação que sustenta a conformidade: excluir a conta encerra o
//! acesso e apaga o que não está sob dever de guarda, enquanto o registro
//! nutricional permanece para a clínica cumprir a obrigação legal de guarda.
use business::gateway::customer_gateway::CustomerGateway;
use business::use_cases::authentication_use_case::AuthenticationUseCase;
use business::use_cases::customer_use_case::CustomerUseCase;
use entity::audit::{run_with_user, AuditUser};
use entity::{account_deletion_entity, ai_usage_daily_entity, customer_entity, meal_log_entity, user_entity};
use sea_orm::{ColumnTrait, ConnectionTrait, Database, DbConn, EntityTrait, PaginatorTrait, QueryFilter};

async fn insert(db: &DbConn, sql: String) -> i32 {
    db.execute_unprepared(&sql).await.unwrap().last_insert_id() as i32
}

fn actor(tenant_id: i32, user_id: i32) -> Option<AuditUser> {
    Some(AuditUser {
        id: user_id,
        email: "patient@example.test".into(),
        tenant_id: Some(tenant_id),
        enforce_tenant: true,
    })
}

#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn account_deletion_ends_access_and_keeps_the_clinical_record() {
    let url = std::env::var("PAYMENT_TEST_DATABASE_URL")
        .expect("PAYMENT_TEST_DATABASE_URL required");
    unsafe {
        std::env::set_var("ACCESS_TOKEN_SECRET", "test-access-secret");
        std::env::set_var("REFRESH_TOKEN_SECRET", "test-refresh-secret");
    }

    let db = Database::connect(url).await.unwrap();

    let tenant_id = insert(
        &db,
        "INSERT INTO tenant (uuid) VALUES (UNHEX(REPLACE(UUID(),'-','')))".into(),
    )
    .await;

    let email = format!("patient-{}@example.test", uuid::Uuid::new_v4());
    let password_hash = bcrypt::hash("segredo-do-teste", 4).unwrap();
    let user_id = insert(
        &db,
        format!(
            "INSERT INTO user (uuid, tenant_id, email, name, role, password, enabled, created_at, updated_at) \
             VALUES (UNHEX(REPLACE(UUID(),'-','')), {tenant_id}, '{email}', 'Paciente', 'User', '{password_hash}', 1, NOW(), NOW())"
        ),
    )
    .await;

    let customer_id = insert(
        &db,
        format!(
            "INSERT INTO customer (uuid, tenant_id, name, email, phone, date_of_birth, gender, mobile_enabled, photo, user_id, created_at, updated_at) \
             VALUES (UNHEX(REPLACE(UUID(),'-','')), {tenant_id}, 'Paciente', '{email}', '11999999999', '1990-01-01', 'F', 1, 'customers/{tenant_id}/foto.jpg', {user_id}, NOW(), NOW())"
        ),
    )
    .await;

    let daily_meal_id = insert(
        &db,
        format!(
            "INSERT INTO daily_meal (uuid, tenant_id, name, created_at, updated_at) \
             VALUES (UNHEX(REPLACE(UUID(),'-','')), {tenant_id}, 'Almoço', NOW(), NOW())"
        ),
    )
    .await;

    insert(
        &db,
        format!(
            "INSERT INTO meal_log (uuid, customer_id, daily_meal_id, analysis_type, meal_date, calories, protein_g, carbs_g, fat_g, photo, created_at, updated_at) \
             VALUES (UNHEX(REPLACE(UUID(),'-','')), {customer_id}, {daily_meal_id}, 'photo', CURDATE(), 600, 30, 70, 20, 'meals/{customer_id}/refeicao.jpg', NOW(), NOW())"
        ),
    )
    .await;

    insert(
        &db,
        format!(
            "INSERT INTO ai_usage_daily (tenant_id, user_id, usage_date, used) VALUES ({tenant_id}, {user_id}, CURRENT_DATE, 3)"
        ),
    )
    .await;

    // O login funciona antes da exclusão.
    assert!(
        AuthenticationUseCase::execute(&db, email.clone(), "segredo-do-teste".into())
            .await
            .is_ok(),
        "a conta deveria autenticar antes da exclusão"
    );

    let use_case = CustomerUseCase::new(CustomerGateway::new(db.clone()));
    let receipt = run_with_user(actor(tenant_id, user_id), async {
        use_case.delete_account(&db, customer_id).await
    })
    .await
    .expect("a exclusão deveria ter sido concluída");

    assert!(!receipt.already_requested);

    // 1. O acesso acabou: o login não passa mais, mesmo com a senha correta.
    assert!(
        AuthenticationUseCase::execute(&db, email.clone(), "segredo-do-teste".into())
            .await
            .is_err(),
        "conta excluída não pode autenticar"
    );

    // 2. A credencial foi neutralizada e o e-mail real liberado.
    let user = user_entity::Entity::find_by_id(user_id).one(&db).await.unwrap().unwrap();
    assert!(user.email.starts_with("deleted-"), "e-mail deveria virar lápide, veio {}", user.email);
    assert!(!user.enabled, "conta deveria ficar desabilitada");

    // 3. O vínculo e as imagens sumiram.
    let customer = customer_entity::Entity::find_by_id(customer_id).one(&db).await.unwrap().unwrap();
    assert!(customer.user_id.is_none(), "o vínculo com a conta deveria sumir");
    assert!(!customer.mobile_enabled, "o acesso móvel deveria ser desligado");
    assert!(customer.photo.is_none(), "a foto de perfil deveria ser apagada");

    let logs = meal_log_entity::Entity::find()
        .filter(meal_log_entity::Column::CustomerId.eq(customer_id))
        .all(&db)
        .await
        .unwrap();
    assert!(logs.iter().all(|log| log.photo.is_none()), "as fotos de refeição deveriam ser apagadas");

    let usage = ai_usage_daily_entity::Entity::find()
        .filter(ai_usage_daily_entity::Column::UserId.eq(user_id))
        .count(&db)
        .await
        .unwrap();
    assert_eq!(usage, 0, "o consumo de IA deveria ser apagado");

    // 4. O registro nutricional permanece — é o dever de guarda da clínica.
    assert_eq!(logs.len(), 1, "o prontuário não pode ser apagado junto com a conta");

    // 5. O pedido ficou registrado com o prazo de guarda — prova de atendimento.
    let record = account_deletion_entity::Entity::find()
        .filter(account_deletion_entity::Column::CustomerId.eq(customer_id))
        .one(&db)
        .await
        .unwrap()
        .expect("a solicitação deveria ter sido registrada");
    let expected = chrono::Utc::now()
        .date_naive()
        .checked_add_months(chrono::Months::new(12 * 20))
        .unwrap();
    assert_eq!(record.retention_until, expected, "o prazo de guarda deveria ser de 20 anos");

    // 6. Idempotente: pedir de novo devolve o mesmo comprovante, sem estourar.
    let again = run_with_user(actor(tenant_id, user_id), async {
        use_case.delete_account(&db, customer_id).await
    })
    .await
    .expect("segunda chamada deveria ser idempotente");
    assert!(again.already_requested);
    assert_eq!(again.retention_until, receipt.retention_until);
}
