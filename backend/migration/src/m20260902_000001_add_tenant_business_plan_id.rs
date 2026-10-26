use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Tenant::Table)
                    .add_column(integer_null(Tenant::BusinessPlanId))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("ix_tenant_business_plan")
                    .table(Tenant::Table)
                    .col(Tenant::BusinessPlanId)
                    .to_owned(),
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE tenant ADD CONSTRAINT fk_tenant_business_plan \
                 FOREIGN KEY (business_plan_id) REFERENCES business_plan (id) ON DELETE RESTRICT",
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("ALTER TABLE tenant DROP FOREIGN KEY fk_tenant_business_plan")
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("ix_tenant_business_plan")
                    .table(Tenant::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Tenant::Table)
                    .drop_column(Tenant::BusinessPlanId)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Tenant {
    Table,
    BusinessPlanId,
}
