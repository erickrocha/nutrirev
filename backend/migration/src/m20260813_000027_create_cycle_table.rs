use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Cycle::Table)
                    .if_not_exists()
                    .col(pk_auto(Cycle::Id).integer())
                    .col(binary_len_uniq(Cycle::Uuid, 16))
                    .col(integer(Cycle::TenantId).null())
                    .col(string_len(Cycle::Name, 255).not_null())
                    .col(text(Cycle::Description).null())
                    .col(date_time(Cycle::CreatedAt).null())
                    .col(string_len(Cycle::CreatedBy, 200).null())
                    .col(date_time(Cycle::UpdatedAt).null())
                    .col(string_len(Cycle::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Cycle::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum Cycle {
    Table,
    Id,
    Uuid,
    TenantId,
    Name,
    Description,
    CreatedAt,
    CreatedBy,
    UpdatedAt,
    UpdatedBy,
}
