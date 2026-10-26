use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Ingredient::Table)
                    .if_not_exists()
                    .col(pk_auto(Ingredient::Id).integer())
                    .col(binary_len_uniq(Ingredient::Uuid, 16))
                    .col(integer(Ingredient::TenantId).null())
                    .col(string_len(Ingredient::Name, 255).not_null())
                    .col(double(Ingredient::Kcal).not_null())
                    .col(double(Ingredient::Protein).not_null())
                    .col(double(Ingredient::Carbs).not_null())
                    .col(double(Ingredient::Fat).not_null())
                    .col(double(Ingredient::Fiber).not_null())
                    .col(date_time(Ingredient::CreatedAt).null())
                    .col(string_len(Ingredient::CreatedBy, 200).null())
                    .col(date_time(Ingredient::UpdatedAt).null())
                    .col(string_len(Ingredient::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Ingredient::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum Ingredient {
    Table,
    Id,
    Uuid,
    TenantId,
    Name,
    Kcal,
    Protein,
    Carbs,
    Fat,
    Fiber,
    CreatedAt,
    CreatedBy,
    UpdatedAt,
    UpdatedBy,
}
