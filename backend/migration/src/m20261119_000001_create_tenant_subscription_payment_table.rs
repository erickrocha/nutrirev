use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(TenantSubscriptionPayment::Table)
                    .if_not_exists()
                    .col(pk_auto(TenantSubscriptionPayment::Id).integer())
                    .col(binary_len_uniq(TenantSubscriptionPayment::Uuid, 16))
                    .col(integer(TenantSubscriptionPayment::TenantId).not_null())
                    .col(integer(TenantSubscriptionPayment::BusinessPlanId).not_null())
                    .col(string_len(TenantSubscriptionPayment::PlanName, 100).not_null())
                    .col(big_integer(TenantSubscriptionPayment::AmountCents).not_null())
                    .col(string_len(TenantSubscriptionPayment::Currency, 10).not_null().default("BRL"))
                    .col(string_len(TenantSubscriptionPayment::PaymentMethod, 30).not_null())
                    .col(string_len(TenantSubscriptionPayment::PaymentIntentId, 100).null())
                    .col(string_len(TenantSubscriptionPayment::Status, 30).not_null().default("paid"))
                    .col(date_time(TenantSubscriptionPayment::PaidAt).not_null())
                    .col(date_time(TenantSubscriptionPayment::CreatedAt).null())
                    .col(string_len(TenantSubscriptionPayment::CreatedBy, 200).null())
                    .col(date_time(TenantSubscriptionPayment::UpdatedAt).null())
                    .col(string_len(TenantSubscriptionPayment::UpdatedBy, 200).null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_sub_payment_tenant")
                            .from(TenantSubscriptionPayment::Table, TenantSubscriptionPayment::TenantId)
                            .to(Tenant::Table, Tenant::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_sub_payment_business_plan")
                            .from(TenantSubscriptionPayment::Table, TenantSubscriptionPayment::BusinessPlanId)
                            .to(BusinessPlan::Table, BusinessPlan::Id)
                            .on_delete(ForeignKeyAction::Restrict),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("ix_sub_payment_tenant_id")
                    .table(TenantSubscriptionPayment::Table)
                    .col(TenantSubscriptionPayment::TenantId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("ix_sub_payment_paid_at")
                    .table(TenantSubscriptionPayment::Table)
                    .col(TenantSubscriptionPayment::PaidAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(TenantSubscriptionPayment::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum TenantSubscriptionPayment {
    Table,
    Id,
    Uuid,
    TenantId,
    BusinessPlanId,
    PlanName,
    AmountCents,
    Currency,
    PaymentMethod,
    PaymentIntentId,
    Status,
    PaidAt,
    CreatedAt,
    CreatedBy,
    UpdatedAt,
    UpdatedBy,
}

#[derive(DeriveIden)]
enum Tenant {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum BusinessPlan {
    Table,
    Id,
}
