use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(PhysicalActivityLevel::Table)
                    .if_not_exists()
                    .col(pk_auto(PhysicalActivityLevel::Id).integer())
                    .col(binary_len_uniq(PhysicalActivityLevel::Uuid, 16))
                    .col(integer(PhysicalActivityLevel::TenantId).null())
                    .col(string_len(PhysicalActivityLevel::Name, 500).not_null())
                    .col(date_time(PhysicalActivityLevel::CreatedAt).null())
                    .col(string_len(PhysicalActivityLevel::CreatedBy, 200).null())
                    .col(date_time(PhysicalActivityLevel::UpdatedAt).null())
                    .col(string_len(PhysicalActivityLevel::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(PhysicalActivityLevel::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum PhysicalActivityLevel {
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
