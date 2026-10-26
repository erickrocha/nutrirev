use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(CustomerBowelFunction::Table)
                    .if_not_exists()
                    .col(integer(CustomerBowelFunction::CustomerId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_cbf_customer")
                            .from(CustomerBowelFunction::Table, CustomerBowelFunction::CustomerId)
                            .to(Customer::Table, Customer::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(integer(CustomerBowelFunction::BowelFunctionId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_cbf_bowel_function")
                            .from(CustomerBowelFunction::Table, CustomerBowelFunction::BowelFunctionId)
                            .to(BowelFunction::Table, BowelFunction::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .primary_key(
                        Index::create()
                            .col(CustomerBowelFunction::CustomerId)
                            .col(CustomerBowelFunction::BowelFunctionId),
                    )
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(CustomerBowelFunction::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum CustomerBowelFunction {
    Table,
    CustomerId,
    BowelFunctionId,
}

#[derive(DeriveIden)]
enum Customer {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum BowelFunction {
    Table,
    Id,
}
