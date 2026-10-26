use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(PreExistingConditions::Table)
                    .if_not_exists()
                    .col(pk_auto(PreExistingConditions::Id).integer())
                    .col(binary_len_uniq(PreExistingConditions::Uuid, 16))
                    .col(integer(PreExistingConditions::TenantId).null())
                    .col(string_len(PreExistingConditions::Name, 500).not_null())
                    .col(date_time(PreExistingConditions::CreatedAt).null())
                    .col(string_len(PreExistingConditions::CreatedBy, 200).null())
                    .col(date_time(PreExistingConditions::UpdatedAt).null())
                    .col(string_len(PreExistingConditions::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(PreExistingConditions::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum PreExistingConditions {
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
