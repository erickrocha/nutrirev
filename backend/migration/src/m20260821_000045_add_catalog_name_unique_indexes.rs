use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::Statement;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        for table in [
            "clinical_conditions",
            "dietary_restriction",
            "ingredient",
            "pre_existing_conditions",
        ] {
            ensure_no_normalized_duplicates(manager, table).await?;
        }

        create_unique_index(
            manager,
            "idx_clinical_conditions_tenant_name_unique",
            ClinicalConditions::Table,
            ClinicalConditions::TenantId,
            ClinicalConditions::Name,
        )
        .await?;
        create_unique_index(
            manager,
            "idx_dietary_restriction_tenant_name_unique",
            DietaryRestriction::Table,
            DietaryRestriction::TenantId,
            DietaryRestriction::Name,
        )
        .await?;
        create_unique_index(
            manager,
            "idx_ingredient_tenant_name_unique",
            Ingredient::Table,
            Ingredient::TenantId,
            Ingredient::Name,
        )
        .await?;
        create_unique_index(
            manager,
            "idx_pre_existing_conditions_tenant_name_unique",
            PreExistingConditions::Table,
            PreExistingConditions::TenantId,
            PreExistingConditions::Name,
        )
        .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        drop_index(
            manager,
            "idx_pre_existing_conditions_tenant_name_unique",
            PreExistingConditions::Table,
        )
        .await?;
        drop_index(
            manager,
            "idx_ingredient_tenant_name_unique",
            Ingredient::Table,
        )
        .await?;
        drop_index(
            manager,
            "idx_dietary_restriction_tenant_name_unique",
            DietaryRestriction::Table,
        )
        .await?;
        drop_index(
            manager,
            "idx_clinical_conditions_tenant_name_unique",
            ClinicalConditions::Table,
        )
        .await
    }
}

async fn create_unique_index<T, C1, C2>(
    manager: &SchemaManager<'_>,
    name: &str,
    table: T,
    tenant_column: C1,
    name_column: C2,
) -> Result<(), DbErr>
where
    T: IntoIden,
    C1: IntoIden,
    C2: IntoIden,
{
    manager
        .create_index(
            Index::create()
                .name(name)
                .table(table)
                .col(tenant_column)
                .col(name_column)
                .unique()
                .if_not_exists()
                .to_owned(),
        )
        .await
}

async fn ensure_no_normalized_duplicates(
    manager: &SchemaManager<'_>,
    table: &str,
) -> Result<(), DbErr> {
    let sql = format!(
        "SELECT 1 FROM `{table}` WHERE tenant_id IS NOT NULL \
         GROUP BY tenant_id, LOWER(TRIM(name)) HAVING COUNT(*) > 1 LIMIT 1"
    );
    let duplicate = manager
        .get_connection()
        .query_one_raw(Statement::from_string(manager.get_database_backend(), sql))
        .await?;
    if duplicate.is_some() {
        return Err(DbErr::Custom(format!(
            "Cannot add tenant/name uniqueness: {table} contains duplicate normalized names"
        )));
    }
    Ok(())
}

async fn drop_index<T>(manager: &SchemaManager<'_>, name: &str, table: T) -> Result<(), DbErr>
where
    T: IntoIden,
{
    manager
        .drop_index(Index::drop().name(name).table(table).to_owned())
        .await
}

#[derive(DeriveIden)]
enum ClinicalConditions {
    Table,
    TenantId,
    Name,
}

#[derive(DeriveIden)]
enum DietaryRestriction {
    Table,
    TenantId,
    Name,
}

#[derive(DeriveIden)]
enum Ingredient {
    Table,
    TenantId,
    Name,
}

#[derive(DeriveIden)]
enum PreExistingConditions {
    Table,
    TenantId,
    Name,
}
