use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(DailyMeal::Table)
                    .if_not_exists()
                    .col(pk_auto(DailyMeal::Id).integer())
                    .col(binary_len_uniq(DailyMeal::Uuid, 16))
                    .col(integer(DailyMeal::TenantId).null())
                    .col(string_len(DailyMeal::Name, 500).not_null())
                    .col(string_len(DailyMeal::Code, 50).null())
                    .col(date_time(DailyMeal::CreatedAt).null())
                    .col(string_len(DailyMeal::CreatedBy, 200).null())
                    .col(date_time(DailyMeal::UpdatedAt).null())
                    .col(string_len(DailyMeal::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(DailyMeal::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum DailyMeal {
    Table,
    Id,
    Uuid,
    TenantId,
    Name,
    Code,
    CreatedAt,
    CreatedBy,
    UpdatedAt,
    UpdatedBy,
}
