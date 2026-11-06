use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(PlanOrder::Table)
                    .if_not_exists()
                    .col(pk_auto(PlanOrder::Id).integer())
                    .col(binary_len_uniq(PlanOrder::Uuid, 16))
                    .col(integer(PlanOrder::BusinessPlanId).not_null())
                    // Nome e preço congelados: mudar o plano depois não altera pedidos antigos.
                    .col(string_len(PlanOrder::PlanName, 200).not_null())
                    .col(big_integer(PlanOrder::PriceInCents).not_null())
                    .col(string_len(PlanOrder::Status, 20).not_null().default("pending"))
                    .col(string_len(PlanOrder::TaxId, 14).not_null())
                    .col(string_len(PlanOrder::Name, 200).not_null())
                    .col(string_len(PlanOrder::Email, 200).not_null())
                    .col(string_len(PlanOrder::Phone, 20).not_null())
                    .col(string_len(PlanOrder::AddressLine1, 255).not_null())
                    .col(string_len(PlanOrder::AddressLine2, 255).null())
                    .col(string_len(PlanOrder::Locality, 120).not_null())
                    .col(string_len(PlanOrder::AdministrativeArea, 2).not_null())
                    .col(string_len(PlanOrder::PostalCode, 8).not_null())
                    .col(integer(PlanOrder::TenantId).null())
                    .col(date_time(PlanOrder::CreatedAt).null())
                    .col(string_len(PlanOrder::CreatedBy, 200).null())
                    .col(date_time(PlanOrder::UpdatedAt).null())
                    .col(string_len(PlanOrder::UpdatedBy, 200).null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_plan_order_business_plan")
                            .from(PlanOrder::Table, PlanOrder::BusinessPlanId)
                            .to(BusinessPlan::Table, BusinessPlan::Id)
                            .on_delete(ForeignKeyAction::Restrict),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_plan_order_tenant")
                            .from(PlanOrder::Table, PlanOrder::TenantId)
                            .to(Tenant::Table, Tenant::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .index(Index::create().name("ix_plan_order_status").col(PlanOrder::Status))
                    .engine("InnoDB")
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(PlanOrder::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum PlanOrder {
    Table,
    Id,
    Uuid,
    BusinessPlanId,
    PlanName,
    PriceInCents,
    Status,
    TaxId,
    Name,
    Email,
    Phone,
    AddressLine1,
    AddressLine2,
    Locality,
    AdministrativeArea,
    PostalCode,
    TenantId,
    CreatedAt,
    CreatedBy,
    UpdatedAt,
    UpdatedBy,
}

#[derive(DeriveIden)]
enum BusinessPlan {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Tenant {
    Table,
    Id,
}
