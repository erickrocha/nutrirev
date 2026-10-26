//! Run only against an isolated, migrated MariaDB database.
//!
//! Prova o uso único do convite sem tabela de tokens: a chave de assinatura
//! deriva do hash da senha, então definir a senha invalida o convite sozinho.
use business::use_cases::account_invite_use_case::AccountInviteUseCase;
use business::use_cases::authentication_use_case::AuthenticationUseCase;
use entity::user_entity;
use sea_orm::{ConnectionTrait, Database, DbConn, EntityTrait};

async fn insert(db: &DbConn, sql: String) -> i32 {
    db.execute_unprepared(&sql).await.unwrap().last_insert_id() as i32
}

#[tokio::test]
#[ignore = "Requires PAYMENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn invite_sets_the_password_once_and_then_stops_working() {
    let url = std::env::var("PAYMENT_TEST_DATABASE_URL").expect("PAYMENT_TEST_DATABASE_URL required");
    unsafe {
        std::env::set_var("ACCESS_TOKEN_SECRET", "test-access-secret");
        std::env::set_var("REFRESH_TOKEN_SECRET", "test-refresh-secret");
    }

    let db = Database::connect(url).await.unwrap();

    // Conta provisionada como o `enable_mobile` faz: segredo aleatório que ninguém conhece.
    let provisioning_secret = AccountInviteUseCase::unguessable_secret();
    let hash = bcrypt::hash(&provisioning_secret, 4).unwrap();
    let email = format!("convidado-{}@example.test", uuid::Uuid::new_v4());
    let user_id = insert(
        &db,
        format!(
            "INSERT INTO user (uuid, email, name, role, password, enabled, first_login, created_at, updated_at) \
             VALUES (UNHEX(REPLACE(UUID(),'-','')), '{email}', 'Convidado', 'SysAdmin', '{hash}', 1, 1, NOW(), NOW())"
        ),
    )
    .await;

    let user = user_entity::Entity::find_by_id(user_id).one(&db).await.unwrap().unwrap();
    let invite = AccountInviteUseCase::issue(&user).unwrap();

    // Senha curta é recusada antes de qualquer coisa.
    assert!(
        AccountInviteUseCase::accept(&db, &invite.token, "1234").await.is_err(),
        "senha abaixo do mínimo deveria ser recusada"
    );

    // O convite abre uma vez.
    AccountInviteUseCase::accept(&db, &invite.token, "senha-do-paciente")
        .await
        .expect("o convite deveria ser aceito");

    // E o paciente entra com a senha que ele mesmo escolheu.
    assert!(
        AuthenticationUseCase::execute(&db, email.clone(), "senha-do-paciente".into())
            .await
            .is_ok(),
        "a senha definida pelo convite deveria autenticar"
    );

    // O segredo de provisionamento nunca serviu para entrar.
    assert!(
        AuthenticationUseCase::execute(&db, email.clone(), provisioning_secret)
            .await
            .is_err(),
        "o segredo de provisionamento não pode autenticar"
    );

    // O mesmo convite não abre de novo: a chave mudou junto com o hash da senha.
    assert!(
        AccountInviteUseCase::accept(&db, &invite.token, "outra-senha-qualquer")
            .await
            .is_err(),
        "convite já usado não pode ser reaproveitado"
    );

    // E o primeiro convite morre quando a clínica emite um novo.
    let refreshed = user_entity::Entity::find_by_id(user_id).one(&db).await.unwrap().unwrap();
    let segundo = AccountInviteUseCase::issue(&refreshed).unwrap();
    let terceiro = AccountInviteUseCase::issue(&refreshed).unwrap();
    AccountInviteUseCase::accept(&db, &terceiro.token, "senha-mais-nova")
        .await
        .expect("o convite mais recente deveria funcionar");
    assert!(
        AccountInviteUseCase::accept(&db, &segundo.token, "tentativa").await.is_err(),
        "convite anterior deveria ter sido invalidado pelo uso do mais recente"
    );

    // first_login foi baixado no aceite.
    let final_user = user_entity::Entity::find_by_id(user_id).one(&db).await.unwrap().unwrap();
    assert!(!final_user.first_login, "first_login deveria cair no aceite");
}
