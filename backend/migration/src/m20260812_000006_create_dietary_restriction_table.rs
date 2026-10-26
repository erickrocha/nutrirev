use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(DietaryRestriction::Table)
                    .if_not_exists()
                    .col(pk_auto(DietaryRestriction::Id).integer())
                    .col(binary_len_uniq(DietaryRestriction::Uuid, 16))
                    .col(integer(DietaryRestriction::TenantId).null())
                    .col(string_len(DietaryRestriction::Name, 500).not_null())
                    .col(date_time(DietaryRestriction::CreatedAt).null())
                    .col(string_len(DietaryRestriction::CreatedBy, 200).null())
                    .col(date_time(DietaryRestriction::UpdatedAt).null())
                    .col(string_len(DietaryRestriction::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(DietaryRestriction::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum DietaryRestriction {
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
