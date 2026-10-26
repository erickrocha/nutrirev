use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(CustomerDailyMeal::Table)
                    .if_not_exists()
                    .col(integer(CustomerDailyMeal::CustomerId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_cdm_customer")
                            .from(CustomerDailyMeal::Table, CustomerDailyMeal::CustomerId)
                            .to(Customer::Table, Customer::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(integer(CustomerDailyMeal::DailyMealId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_cdm_daily_meal")
                            .from(CustomerDailyMeal::Table, CustomerDailyMeal::DailyMealId)
                            .to(DailyMeal::Table, DailyMeal::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .primary_key(
                        Index::create()
                            .col(CustomerDailyMeal::CustomerId)
                            .col(CustomerDailyMeal::DailyMealId),
                    )
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(CustomerDailyMeal::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum CustomerDailyMeal {
    Table,
    CustomerId,
    DailyMealId,
}

#[derive(DeriveIden)]
enum Customer {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum DailyMeal {
    Table,
    Id,
}
