use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(ActivityFactor::Table)
                    .if_not_exists()
                    .col(pk_auto(ActivityFactor::Id).integer())
                    .col(binary_len_uniq(ActivityFactor::Uuid, 16))
                    .col(integer(ActivityFactor::TenantId).null())
                    .col(string_len(ActivityFactor::Name, 500).not_null())
                    .col(date_time(ActivityFactor::CreatedAt).null())
                    .col(string_len(ActivityFactor::CreatedBy, 200).null())
                    .col(date_time(ActivityFactor::UpdatedAt).null())
                    .col(string_len(ActivityFactor::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(ActivityFactor::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum ActivityFactor {
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
