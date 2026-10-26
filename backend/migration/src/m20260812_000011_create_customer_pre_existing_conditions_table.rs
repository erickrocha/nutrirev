use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(CustomerPreExistingConditions::Table)
                    .if_not_exists()
                    .col(integer(CustomerPreExistingConditions::CustomerId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_cpec_customer")
                            .from(CustomerPreExistingConditions::Table, CustomerPreExistingConditions::CustomerId)
                            .to(Customer::Table, Customer::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(integer(CustomerPreExistingConditions::PreExistingConditionsId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_cpec_pre_existing_conditions")
                            .from(CustomerPreExistingConditions::Table, CustomerPreExistingConditions::PreExistingConditionsId)
                            .to(PreExistingConditions::Table, PreExistingConditions::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .primary_key(
                        Index::create()
                            .col(CustomerPreExistingConditions::CustomerId)
                            .col(CustomerPreExistingConditions::PreExistingConditionsId),
                    )
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(CustomerPreExistingConditions::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum CustomerPreExistingConditions {
    Table,
    CustomerId,
    PreExistingConditionsId,
}

#[derive(DeriveIden)]
enum Customer {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum PreExistingConditions {
    Table,
    Id,
}
