use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(BowelFunction::Table)
                    .if_not_exists()
                    .col(pk_auto(BowelFunction::Id).integer())
                    .col(binary_len_uniq(BowelFunction::Uuid, 16))
                    .col(integer(BowelFunction::TenantId).null())
                    .col(string_len(BowelFunction::Name, 500).not_null())
                    .col(date_time(BowelFunction::CreatedAt).null())
                    .col(string_len(BowelFunction::CreatedBy, 200).null())
                    .col(date_time(BowelFunction::UpdatedAt).null())
                    .col(string_len(BowelFunction::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(BowelFunction::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum BowelFunction {
    Table,
    Id,
    Uuid,
    TenantId,
    Name,
    CreatedAt,
    CreatedBy,
    UpdatedAt,
    UpdatedBy,
}
