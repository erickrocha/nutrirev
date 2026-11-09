//! Receitas globais (sem tenant): visíveis a toda clínica, somente leitura para elas.
//!
//! Run only against an isolated, migrated database (a migração `dataload_fit_recipes` já carrega 50).

use business::gateway::eat_gateway::EatGateway;
use business::gateway::ingredient_gateway::IngredientGateway;
use business::use_cases::eat_use_case::EatUseCase;
use entity::audit::{run_with_user, AuditUser};
use sea_orm::{Database, DbConn};

async fn connect() -> DbConn {
    let url = std::env::var("EAT_TEST_DATABASE_URL").expect("EAT_TEST_DATABASE_URL required");
    Database::connect(url).await.expect("database connection")
}

fn tenant_user(tenant_id: i32) -> Option<AuditUser> {
    Some(AuditUser { id: 1, email: "staff@example.test".into(), tenant_id: Some(tenant_id), enforce_tenant: true })
}

#[tokio::test]
#[ignore = "Requires EAT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn tenant_sees_global_recipes_with_ingredients_but_cannot_edit_them() {
    let db = connect().await;
    let ingredients = IngredientGateway::new(db.clone());
    let use_case = EatUseCase::new(EatGateway::new(db));

    run_with_user(tenant_user(1), async {
        let (page, total, _) = use_case.find_paginated(1, 100, None, None, None, &ingredients).await.expect("list");
        assert!(total >= 50 && page.iter().all(|r| r.tenant_id.is_none()), "receitas globais visíveis");

        let recipe = page.into_iter().next().expect("uma receita");
        let id = recipe.id.expect("id");
        let full = use_case.find_by_id(id, &ingredients).await.expect("detalhe");
        assert!(!full.ingredients.is_empty() && !full.directions.is_empty());

        // Clínica não altera receita global: nem pelo editor, nem trocando o tenant por baixo dos panos.
        let mut edited = full.clone();
        edited.name = "Alterada".into();
        assert!(use_case.update(id, edited, &ingredients).await.is_err());

        // Contadores sobem sem reatribuir a receita à clínica.
        use_case.increment_views(id).await.expect("views");
        let after = use_case.find_by_id(id, &ingredients).await.expect("detalhe");
        assert_eq!((after.tenant_id, after.views), (None, full.views + 1));
    })
    .await;
}
