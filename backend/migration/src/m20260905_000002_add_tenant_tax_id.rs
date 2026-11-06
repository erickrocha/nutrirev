use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // CPF/CNPJ só com dígitos. Nula para clínicas antigas; única entre as que informaram.
        manager
            .alter_table(
                Table::alter()
                    .table(Tenant::Table)
                    .add_column(string_len_null(Tenant::TaxId, 14))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("uq_tenant_tax_id")
                    .table(Tenant::Table)
                    .col(Tenant::TaxId)
                    .unique()
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(Index::drop().name("uq_tenant_tax_id").table(Tenant::Table).to_owned())
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(Tenant::Table)
                    .drop_column(Tenant::TaxId)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Tenant {
    Table,
    TaxId,
}
