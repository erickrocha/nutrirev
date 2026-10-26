use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(PaymentDate::Table)
                    .if_not_exists()
                    .col(pk_auto(PaymentDate::Id).integer())
                    .col(binary_len_uniq(PaymentDate::Uuid, 16))
                    .col(integer(PaymentDate::TenantId).null())
                    .col(integer(PaymentDate::CustomerId).null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_pd_customer")
                            .from(PaymentDate::Table, PaymentDate::CustomerId)
                            .to(Customer::Table, Customer::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .col(integer(PaymentDate::ClinicalPlanId).null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_pd_clinical_plan")
                            .from(PaymentDate::Table, PaymentDate::ClinicalPlanId)
                            .to(ClinicalPlan::Table, ClinicalPlan::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .col(date(PaymentDate::DueDate).not_null())
                    .col(boolean(PaymentDate::IsActive).not_null().default(true))
                    .col(date_time(PaymentDate::CreatedAt).null())
                    .col(string_len(PaymentDate::CreatedBy, 200).null())
                    .col(date_time(PaymentDate::UpdatedAt).null())
                    .col(string_len(PaymentDate::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(PaymentDate::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum PaymentDate {
    Table,
    Id,
    Uuid,
    TenantId,
    CustomerId,
    ClinicalPlanId,
    DueDate,
    IsActive,
    CreatedAt,
    CreatedBy,
    UpdatedAt,
    UpdatedBy,
}

#[derive(DeriveIden)]
enum Customer {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum ClinicalPlan {
    Table,
    Id,
}
