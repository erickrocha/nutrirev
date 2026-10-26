use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Province::Table)
                    .add_column(string_len(Province::CountryCode, 2))
                    .to_owned(),
            )
            .await?;

        manager
            .exec_stmt(
                Query::update()
                    .table(Province::Table)
                    .value(Province::CountryCode, "BR")
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Province::Table)
                    .modify_column(string_len(Province::CountryCode, 2).not_null())
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("uq_province_country_acronym")
                    .table(Province::Table)
                    .col(Province::CountryCode)
                    .col(Province::Acronym)
                    .unique()
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(
                Index::drop()
                    .name("uq_province_country_acronym")
                    .table(Province::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Province::Table)
                    .drop_column(Province::CountryCode)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Province {
    Table,
    Acronym,
    CountryCode,
}
