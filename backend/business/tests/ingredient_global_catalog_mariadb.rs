//! Catálogo global TACO (ingredientes sem tenant): visível a toda clínica, somente leitura para elas.
//!
//! Run only against an isolated, migrated database.

use business::domain::ingredient_search::IngredientSearch;
use business::gateway::ingredient_gateway::IngredientGateway;
use business::use_cases::ingredient_use_case::IngredientUseCase;
use entity::audit::{run_with_user, AuditUser};
use sea_orm::{Database, DbConn};

async fn connect() -> DbConn {
    let url = std::env::var("INGREDIENT_TEST_DATABASE_URL").expect("INGREDIENT_TEST_DATABASE_URL required");
    Database::connect(url).await.expect("database connection")
}

fn tenant_user(tenant_id: i32) -> Option<AuditUser> {
    Some(AuditUser {
        id: 1,
        email: "staff@example.test".into(),
        tenant_id: Some(tenant_id),
        enforce_tenant: true,
    })
}

#[tokio::test]
#[ignore = "Requires INGREDIENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn tenant_sees_global_catalog_but_cannot_edit_it() {
    let db = connect().await;
    let use_case = IngredientUseCase::new(IngredientGateway::new(db));

    run_with_user(tenant_user(1), async {
        let all = use_case.find_all().await.expect("list");
        let global = all.iter().find(|i| i.taco_id.is_some() && i.tenant_id.is_none()).expect("TACO row visible");
        assert!(all.len() >= 597);

        let mut edited = global.clone();
        edited.kcal += 1.0;
        let id = global.id.expect("id");
        assert!(use_case.update(id, edited).await.is_err());
    })
    .await;
}

async fn search_names(use_case: &IngredientUseCase, query: &str, lang: &str) -> (Vec<String>, u64) {
    let search = IngredientSearch::new(Some(query), Some(lang), Some(50), None);
    let (items, total) = use_case.search(&search).await.expect("search");
    (items.into_iter().map(|i| i.name).collect(), total)
}

#[tokio::test]
#[ignore = "Requires INGREDIENT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn search_ignores_accents_and_finds_both_languages() {
    let db = connect().await;
    let use_case = IngredientUseCase::new(IngredientGateway::new(db));

    run_with_user(tenant_user(1), async {
        // sem acento acha com acento
        let (names, _) = search_names(&use_case, "acai", "pt").await;
        assert!(names.iter().any(|n| n.starts_with("Açaí")), "{names:?}");

        // inglês acha o item do USDA; português acha o mesmo item pela tradução
        let (_, en_total) = search_names(&use_case, "chicken breast", "en").await;
        let (_, pt_total) = search_names(&use_case, "peito frango", "pt").await;
        assert!(en_total > 0 && pt_total > 0);

        // palavras em qualquer ordem e nos dois idiomas ao mesmo tempo
        let (_, mixed) = search_names(&use_case, "frango cooked", "pt").await;
        assert!(mixed > 0);

        // com acento também
        let (accented, _) = search_names(&use_case, "feijão", "pt").await;
        let (plain, _) = search_names(&use_case, "feijao", "pt").await;
        assert_eq!(accented, plain);
    })
    .await;
}
