use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(AiUsageDaily::Table)
                    .if_not_exists()
                    .col(pk_auto(AiUsageDaily::Id).integer())
                    .col(integer_null(AiUsageDaily::TenantId))
                    .col(integer(AiUsageDaily::UserId).not_null())
                    .col(date(AiUsageDaily::UsageDate).not_null())
                    .col(integer(AiUsageDaily::Used).not_null().default(1))
                    .col(
                        ColumnDef::new(AiUsageDaily::UpdatedAt).custom(Alias::new(
                            "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
                        )),
                    )
                    .index(
                        Index::create()
                            .name("uq_ai_usage_daily_user_date")
                            .col(AiUsageDaily::UserId)
                            .col(AiUsageDaily::UsageDate)
                            .unique(),
                    )
                    .index(
                        Index::create()
                            .name("ix_ai_usage_daily_tenant")
                            .col(AiUsageDaily::TenantId)
                            .col(AiUsageDaily::UsageDate),
                    )
                    .engine("InnoDB")
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(BusinessPlan::Table)
                    .add_column(
                        ColumnDef::new(BusinessPlan::DailyAiQuota)
                            .integer()
                            .not_null()
                            .default(4),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE business_plan ADD CONSTRAINT ck_tenant_plan_daily_ai_quota CHECK (daily_ai_quota > 0)",
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(BusinessPlan::Table)
                    .drop_column(BusinessPlan::DailyAiQuota)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table(AiUsageDaily::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum AiUsageDaily {
    Table,
    Id,
    TenantId,
    UserId,
    UsageDate,
    Used,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum BusinessPlan {
    Table,
    DailyAiQuota,
}
