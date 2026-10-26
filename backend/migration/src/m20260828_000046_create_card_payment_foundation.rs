use sea_orm_migration::sea_query::Check;
use sea_orm_migration::{prelude::*, schema::*};

// SeaQuery has no column charset/collation or DATETIME precision builder.
// Custom column types preserve those settings; all DDL and checks use builders.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_index(
                Index::create()
                    .name("uq_customer_payment_tenant")
                    .table(Customer::Table)
                    .col(Customer::TenantId)
                    .col(Customer::Id)
                    .unique()
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("uq_plan_payment_tenant")
                    .table(ClinicalPlan::Table)
                    .col(ClinicalPlan::TenantId)
                    .col(ClinicalPlan::Id)
                    .unique()
                    .to_owned(),
            )
            .await?;
        manager
            .create_table(
                Table::create()
                    .table(PaymentMerchant::Table)
                    .col(pk_auto(PaymentMerchant::Id).integer())
                    .col(integer(PaymentMerchant::TenantId))
                    .col(string_len(PaymentMerchant::Provider, 32))
                    .col(string_len(PaymentMerchant::Environment, 16))
                    .col(string_len(PaymentMerchant::MerchantReference, 64))
                    .col(string_len(PaymentMerchant::CredentialsSecretRef, 255))
                    .col(string_len(PaymentMerchant::Status, 32).default("pending"))
                    .col(
                        ColumnDef::new(PaymentMerchant::CreatedAt)
                            .custom(Alias::new("datetime(6)"))
                            .not_null(),
                    )
                    .index(
                        Index::create()
                            .name("uq_pm_tenant_id")
                            .col(PaymentMerchant::TenantId)
                            .col(PaymentMerchant::Id)
                            .unique(),
                    )
                    .index(
                        Index::create()
                            .name("uq_pm_provider")
                            .col(PaymentMerchant::TenantId)
                            .col(PaymentMerchant::Provider)
                            .col(PaymentMerchant::Environment)
                            .unique(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_pm_tenant")
                            .from(PaymentMerchant::Table, PaymentMerchant::TenantId)
                            .to(Tenant::Table, Tenant::Id),
                    )
                    .check(Check::named(
                        Alias::new("ck_pm_provider").into_iden(),
                        Expr::col(PaymentMerchant::Provider).eq("rede"),
                    ))
                    .check(Check::named(
                        Alias::new("ck_pm_environment").into_iden(),
                        Expr::col(PaymentMerchant::Environment).is_in(["sandbox", "production"]),
                    ))
                    .check(Check::named(
                        Alias::new("ck_pm_status").into_iden(),
                        Expr::col(PaymentMerchant::Status)
                            .is_in(["pending", "enabled", "disabled"]),
                    ))
                    .engine("InnoDB")
                    .to_owned(),
            )
            .await?;
        manager
            .create_table(
                Table::create()
                    .table(PaymentCharge::Table)
                    .col(pk_auto(PaymentCharge::Id).integer())
                    .col(integer(PaymentCharge::TenantId))
                    .col(integer(PaymentCharge::CustomerId))
                    .col(integer(PaymentCharge::ClinicalPlanId).null())
                    .col(big_integer(PaymentCharge::AmountCents))
                    .col(
                        ColumnDef::new(PaymentCharge::Currency)
                            .char_len(3)
                            .not_null(),
                    )
                    .col(date(PaymentCharge::DueDate))
                    .col(string_len(PaymentCharge::Status, 32).default("open"))
                    .col(
                        ColumnDef::new(PaymentCharge::CreatedAt)
                            .custom(Alias::new("datetime(6)"))
                            .not_null(),
                    )
                    .index(
                        Index::create()
                            .name("uq_pc_tenant_id")
                            .col(PaymentCharge::TenantId)
                            .col(PaymentCharge::Id)
                            .unique(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_pc_tenant")
                            .from(PaymentCharge::Table, PaymentCharge::TenantId)
                            .to(Tenant::Table, Tenant::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_pc_customer")
                            .from(
                                PaymentCharge::Table,
                                (PaymentCharge::TenantId, PaymentCharge::CustomerId),
                            )
                            .to(Customer::Table, (Customer::TenantId, Customer::Id)),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_pc_plan")
                            .from(
                                PaymentCharge::Table,
                                (PaymentCharge::TenantId, PaymentCharge::ClinicalPlanId),
                            )
                            .to(
                                ClinicalPlan::Table,
                                (ClinicalPlan::TenantId, ClinicalPlan::Id),
                            ),
                    )
                    .check(Check::named(
                        Alias::new("ck_pc_amount").into_iden(),
                        Expr::col(PaymentCharge::AmountCents).gt(0),
                    ))
                    .check(Check::named(
                        Alias::new("ck_pc_currency").into_iden(),
                        Expr::col(PaymentCharge::Currency).eq("BRL"),
                    ))
                    .check(Check::named(
                        Alias::new("ck_pc_status").into_iden(),
                        Expr::col(PaymentCharge::Status).is_in(["open", "paid", "cancelled"]),
                    ))
                    .engine("InnoDB")
                    .to_owned(),
            )
            .await?;
        manager
            .create_table(
                Table::create()
                    .table(PaymentAttempt::Table)
                    .col(pk_auto(PaymentAttempt::Id).integer())
                    .col(integer(PaymentAttempt::TenantId))
                    .col(integer(PaymentAttempt::ChargeId))
                    .col(integer(PaymentAttempt::MerchantId))
                    .col(
                        ColumnDef::new(PaymentAttempt::IdempotencyKey)
                            .custom(Alias::new(
                                "varchar(64) CHARACTER SET ascii COLLATE ascii_bin",
                            ))
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(PaymentAttempt::Reference)
                            .custom(Alias::new("char(36) CHARACTER SET ascii COLLATE ascii_bin"))
                            .not_null(),
                    )
                    .col(string_len(PaymentAttempt::Method, 16))
                    .col(integer(PaymentAttempt::Installments))
                    .col(big_integer(PaymentAttempt::AmountCents))
                    .col(
                        ColumnDef::new(PaymentAttempt::Currency)
                            .char_len(3)
                            .not_null(),
                    )
                    .col(string_len(PaymentAttempt::Status, 32).default("prepared"))
                    .col(integer(PaymentAttempt::ActiveChargeId).null())
                    .col(
                        ColumnDef::new(PaymentAttempt::CreatedAt)
                            .custom(Alias::new("datetime(6)"))
                            .not_null(),
                    )
                    .index(
                        Index::create()
                            .name("uq_pa_key")
                            .col(PaymentAttempt::TenantId)
                            .col(PaymentAttempt::IdempotencyKey)
                            .unique(),
                    )
                    .index(
                        Index::create()
                            .name("uq_pa_reference")
                            .col(PaymentAttempt::Reference)
                            .unique(),
                    )
                    .index(
                        Index::create()
                            .name("uq_pa_active")
                            .col(PaymentAttempt::TenantId)
                            .col(PaymentAttempt::ActiveChargeId)
                            .unique(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_pa_charge")
                            .from(
                                PaymentAttempt::Table,
                                (PaymentAttempt::TenantId, PaymentAttempt::ChargeId),
                            )
                            .to(
                                PaymentCharge::Table,
                                (PaymentCharge::TenantId, PaymentCharge::Id),
                            ),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_pa_merchant")
                            .from(
                                PaymentAttempt::Table,
                                (PaymentAttempt::TenantId, PaymentAttempt::MerchantId),
                            )
                            .to(
                                PaymentMerchant::Table,
                                (PaymentMerchant::TenantId, PaymentMerchant::Id),
                            ),
                    )
                    .check(Check::named(
                        Alias::new("ck_pa_amount").into_iden(),
                        Expr::col(PaymentAttempt::AmountCents).gt(0),
                    ))
                    .check(Check::named(
                        Alias::new("ck_pa_currency").into_iden(),
                        Expr::col(PaymentAttempt::Currency).eq("BRL"),
                    ))
                    .check(Check::named(
                        Alias::new("ck_pa_method").into_iden(),
                        Expr::col(PaymentAttempt::Method).is_in(["credit", "debit"]),
                    ))
                    .check(Check::named(
                        Alias::new("ck_pa_installments").into_iden(),
                        Expr::col(PaymentAttempt::Method)
                            .eq("credit")
                            .and(Expr::col(PaymentAttempt::Installments).between(1, 12))
                            .or(Expr::col(PaymentAttempt::Method)
                                .eq("debit")
                                .and(Expr::col(PaymentAttempt::Installments).eq(1))),
                    ))
                    .check(Check::named(
                        Alias::new("ck_pa_status").into_iden(),
                        Expr::col(PaymentAttempt::Status).is_in([
                            "prepared",
                            "submitting",
                            "requires_action",
                            "unknown",
                            "authorized",
                            "captured",
                            "declined",
                            "cancelled",
                        ]),
                    ))
                    .check(Check::named(
                        Alias::new("ck_pa_active").into_iden(),
                        Expr::col(PaymentAttempt::Status)
                            .is_in(["declined", "cancelled"])
                            .and(Expr::col(PaymentAttempt::ActiveChargeId).is_null())
                            .or(Expr::col(PaymentAttempt::Status)
                                .is_not_in(["declined", "cancelled"])
                                .and(Expr::col(PaymentAttempt::ActiveChargeId).is_not_null())
                                .and(
                                    Expr::col(PaymentAttempt::ActiveChargeId)
                                        .equals(PaymentAttempt::ChargeId),
                                )),
                    ))
                    .engine("InnoDB")
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(PaymentAttempt::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(PaymentCharge::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(PaymentMerchant::Table).to_owned())
            .await?;
        manager
            .drop_index(
                Index::drop()
                    .name("uq_plan_payment_tenant")
                    .table(ClinicalPlan::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_index(
                Index::drop()
                    .name("uq_customer_payment_tenant")
                    .table(Customer::Table)
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum PaymentMerchant {
    Table,
    Id,
    TenantId,
    Provider,
    Environment,
    MerchantReference,
    CredentialsSecretRef,
    Status,
    CreatedAt,
}

#[derive(DeriveIden)]
enum PaymentCharge {
    Table,
    Id,
    TenantId,
    CustomerId,
    ClinicalPlanId,
    AmountCents,
    Currency,
    DueDate,
    Status,
    CreatedAt,
}

#[derive(DeriveIden)]
enum PaymentAttempt {
    Table,
    Id,
    TenantId,
    ChargeId,
    MerchantId,
    IdempotencyKey,
    Reference,
    Method,
    Installments,
    AmountCents,
    Currency,
    Status,
    ActiveChargeId,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Tenant {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Customer {
    Table,
    TenantId,
    Id,
}

#[derive(DeriveIden)]
enum ClinicalPlan {
    Table,
    TenantId,
    Id,
}
