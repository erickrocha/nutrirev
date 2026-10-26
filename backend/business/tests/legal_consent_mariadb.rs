//! Run only against an isolated, migrated MariaDB database.
//!
//! O que precisa valer para o aceite servir de prova: fica amarrado à versão
//! exata, publicar uma versão nova volta a pendência para todo mundo, e a
//! versão antiga sobrevive porque os aceites de então apontam para ela.
use business::use_cases::legal_consent_use_case::{
    LegalConsentUseCase, KIND_PRIVACY_POLICY, KIND_TERMS_OF_USE,
};
use sea_orm::{ConnectionTrait, Database, DbConn, EntityTrait};

async fn insert(db: &DbConn, sql: String) -> i32 {
    db.execute_unprepared(&sql).await.unwrap().last_insert_id() as i32
}

#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn acceptance_is_bound_to_the_exact_version() {
    let url = std::env::var("PAYMENT_TEST_DATABASE_URL").expect("PAYMENT_TEST_DATABASE_URL required");
    let db = Database::connect(url).await.unwrap();

    let email = format!("titular-{}@example.test", uuid::Uuid::new_v4());
    let user_id = insert(
        &db,
        format!(
            "INSERT INTO user (uuid, email, name, role, password, enabled, created_at, updated_at) \
             VALUES (UNHEX(REPLACE(UUID(),'-','')), '{email}', 'Titular', 'SysAdmin', 'hash', 1, NOW(), NOW())"
        ),
    )
    .await;

    let locale = format!("pt-{}", &uuid::Uuid::new_v4().to_string()[..6]);

    let termos = LegalConsentUseCase::publish(&db, KIND_TERMS_OF_USE, "1.0", &locale, "Termo v1")
        .await
        .unwrap();
    let politica =
        LegalConsentUseCase::publish(&db, KIND_PRIVACY_POLICY, "1.0", &locale, "Política v1")
            .await
            .unwrap();

    // Antes de aceitar, os dois estão pendentes.
    let pendentes = LegalConsentUseCase::pending_for(&db, user_id, Some(&locale)).await.unwrap();
    assert_eq!(pendentes.len(), 2, "os dois documentos deveriam estar pendentes");

    // Tipo desconhecido é recusado.
    assert!(
        LegalConsentUseCase::publish(&db, "cookie_banner", "1.0", &locale, "x").await.is_err(),
        "tipo desconhecido não deveria ser publicável"
    );

    LegalConsentUseCase::accept(&db, user_id, &[termos.id, politica.id]).await.unwrap();
    assert!(
        LegalConsentUseCase::pending_for(&db, user_id, Some(&locale)).await.unwrap().is_empty(),
        "nada deveria ficar pendente após o aceite"
    );

    // Idempotente: aceitar de novo não duplica nem estoura.
    LegalConsentUseCase::accept(&db, user_id, &[termos.id]).await.unwrap();
    let total = entity::legal_acceptance_entity::Entity::find()
        .all(&db)
        .await
        .unwrap()
        .into_iter()
        .filter(|row| row.user_id == user_id)
        .count();
    assert_eq!(total, 2, "aceitar duas vezes não pode duplicar o registro");

    // Nova versão da política volta a pendência — e só dela.
    let politica_v2 =
        LegalConsentUseCase::publish(&db, KIND_PRIVACY_POLICY, "2.0", &locale, "Política v2")
            .await
            .unwrap();
    let pendentes = LegalConsentUseCase::pending_for(&db, user_id, Some(&locale)).await.unwrap();
    assert_eq!(pendentes.len(), 1, "só a política nova deveria voltar a pendência");
    assert_eq!(pendentes[0].version, "2.0");

    // A versão antiga não some: é ela que prova com o que a pessoa concordou antes.
    let antiga = entity::legal_document_entity::Entity::find_by_id(politica.id)
        .one(&db)
        .await
        .unwrap()
        .expect("a versão anterior tem de continuar existindo");
    assert!(!antiga.active, "a versão anterior deveria sair de vigor");
    assert_eq!(antiga.content, "Política v1");

    // Aceitar uma versão fora de vigor é recusado.
    assert!(
        LegalConsentUseCase::accept(&db, user_id, &[politica.id]).await.is_err(),
        "versão aposentada não pode ser aceita"
    );

    LegalConsentUseCase::accept(&db, user_id, &[politica_v2.id]).await.unwrap();
    assert!(
        LegalConsentUseCase::pending_for(&db, user_id, Some(&locale)).await.unwrap().is_empty(),
        "após aceitar a v2 nada deveria ficar pendente"
    );
}
