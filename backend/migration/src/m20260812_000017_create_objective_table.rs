use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Objective::Table)
                    .if_not_exists()
                    .col(pk_auto(Objective::Id).integer())
                    .col(binary_len_uniq(Objective::Uuid, 16))
                    .col(integer(Objective::TenantId).null())
                    .col(string_len(Objective::Name, 500).not_null())
                    .col(date_time(Objective::CreatedAt).null())
                    .col(string_len(Objective::CreatedBy, 200).null())
                    .col(date_time(Objective::UpdatedAt).null())
                    .col(string_len(Objective::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Objective::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum Objective {
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
