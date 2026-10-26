use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(ClinicalPlan::Table)
                    .if_not_exists()
                    .col(pk_auto(ClinicalPlan::Id).integer())
                    .col(binary_len_uniq(ClinicalPlan::Uuid, 16))
                    .col(integer(ClinicalPlan::TenantId).null())
                    .col(string_len(ClinicalPlan::Name, 500).not_null())
                    .col(integer(ClinicalPlan::PriceInCents).null())
                    .col(integer(ClinicalPlan::RenewPeriodDays).null())
                    .col(date_time(ClinicalPlan::CreatedAt).null())
                    .col(string_len(ClinicalPlan::CreatedBy, 200).null())
                    .col(date_time(ClinicalPlan::UpdatedAt).null())
                    .col(string_len(ClinicalPlan::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(ClinicalPlan::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum ClinicalPlan {
    Table,
    Id,
    Uuid,
    TenantId,
    Name,
    PriceInCents,
    RenewPeriodDays,
    CreatedAt,
    CreatedBy,
    UpdatedAt,
    UpdatedBy,
}
