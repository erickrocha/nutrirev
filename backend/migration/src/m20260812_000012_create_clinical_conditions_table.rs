use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(ClinicalConditions::Table)
                    .if_not_exists()
                    .col(pk_auto(ClinicalConditions::Id).integer())
                    .col(binary_len_uniq(ClinicalConditions::Uuid, 16))
                    .col(integer(ClinicalConditions::TenantId).null())
                    .col(string_len(ClinicalConditions::Name, 500).not_null())
                    .col(date_time(ClinicalConditions::CreatedAt).null())
                    .col(string_len(ClinicalConditions::CreatedBy, 200).null())
                    .col(date_time(ClinicalConditions::UpdatedAt).null())
                    .col(string_len(ClinicalConditions::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(ClinicalConditions::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum ClinicalConditions {
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
