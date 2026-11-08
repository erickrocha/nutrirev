//! Import de catálogos por CSV: cria na primeira carga e atualiza (sem duplicar) na segunda.
//!
//! Run only against an isolated, migrated database.

use business::use_cases::catalog_csv_import_use_case::{
    CatalogCsvImportUseCase, CatalogImportKind, CatalogImportResult, CatalogImportRow,
};
use entity::audit::{run_with_user, AuditUser};
use sea_orm::{ConnectionTrait, Database, DbConn};

const TENANT_ID: i32 = 1;

async fn connect() -> DbConn {
    let url = std::env::var("CATALOG_IMPORT_TEST_DATABASE_URL").expect("CATALOG_IMPORT_TEST_DATABASE_URL required");
    Database::connect(url).await.expect("database connection")
}

fn row(name: &str) -> CatalogImportRow {
    CatalogImportRow {
        name: name.into(),
        kcal: None, protein: None, carbs: None, fat: None, fiber: None, taco_id: None,
        moisture: None, kj: None, cholesterol: None, ash: None, calcium: None, magnesium: None,
        manganese: None, phosphorus: None, iron: None, sodium: None, potassium: None, copper: None,
        zinc: None, retinol: None, re: None, rae: None, thiamine: None, riboflavin: None,
        pyridoxine: None, niacin: None, vitamin_c: None, saturated_fat: None,
        monounsaturated_fat: None, polyunsaturated_fat: None,
    }
}

#[tokio::test]
#[ignore = "Requires CATALOG_IMPORT_TEST_DATABASE_URL pointing to an isolated, migrated MariaDB database"]
async fn named_catalogs_create_then_update_without_duplicating() {
    let db = connect().await;
    let user = Some(AuditUser { id: 1, email: "staff@example.test".into(), tenant_id: Some(TENANT_ID), enforce_tenant: true });
    let kinds = [
        (CatalogImportKind::ActivityFactor, "activity_factor"),
        (CatalogImportKind::BowelFunction, "bowel_function"),
        (CatalogImportKind::Formula, "formula"),
        (CatalogImportKind::Objective, "objective"),
        (CatalogImportKind::PhysicalActivityLevel, "physical_activity_level"),
    ];

    assert_eq!(CatalogCsvImportUseCase::tenant_exists(&db, TENANT_ID).await, Some(true));

    for (kind, table) in kinds {
        let name = format!("csv-import-test-{table}");
        let rows = vec![row(&name)];
        let first = run_with_user(user.clone(), CatalogCsvImportUseCase::import(&db, kind, TENANT_ID, rows.clone())).await;
        let second = run_with_user(user.clone(), CatalogCsvImportUseCase::import(&db, kind, TENANT_ID, rows)).await;

        assert_eq!(first, Some(CatalogImportResult { total: 1, created: 1, updated: 0 }), "{table} first import");
        assert_eq!(second, Some(CatalogImportResult { total: 1, created: 0, updated: 1 }), "{table} second import");

        db.execute_unprepared(&format!("DELETE FROM {table} WHERE name = '{name}' AND tenant_id = {TENANT_ID}"))
            .await
            .expect("cleanup");
    }
}
