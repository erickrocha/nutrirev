use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(PrepareMeal::Table)
                    .if_not_exists()
                    .col(pk_auto(PrepareMeal::Id).integer())
                    .col(binary_len_uniq(PrepareMeal::Uuid, 16))
                    .col(integer(PrepareMeal::TenantId).null())
                    .col(string_len(PrepareMeal::Name, 500).not_null())
                    .col(date_time(PrepareMeal::CreatedAt).null())
                    .col(string_len(PrepareMeal::CreatedBy, 200).null())
                    .col(date_time(PrepareMeal::UpdatedAt).null())
                    .col(string_len(PrepareMeal::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(PrepareMeal::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum PrepareMeal {
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
