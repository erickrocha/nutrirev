use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Formula::Table)
                    .if_not_exists()
                    .col(pk_auto(Formula::Id).integer())
                    .col(binary_len_uniq(Formula::Uuid, 16))
                    .col(integer(Formula::TenantId).null())
                    .col(string_len(Formula::Name, 500).not_null())
                    .col(date_time(Formula::CreatedAt).null())
                    .col(string_len(Formula::CreatedBy, 200).null())
                    .col(date_time(Formula::UpdatedAt).null())
                    .col(string_len(Formula::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Formula::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum Formula {
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
