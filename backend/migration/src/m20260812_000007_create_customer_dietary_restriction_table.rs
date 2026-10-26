use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(CustomerDietaryRestriction::Table)
                    .if_not_exists()
                    .col(integer(CustomerDietaryRestriction::CustomerId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_cdr_customer")
                            .from(CustomerDietaryRestriction::Table, CustomerDietaryRestriction::CustomerId)
                            .to(Customer::Table, Customer::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(integer(CustomerDietaryRestriction::DietaryRestrictionId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_cdr_dietary_restriction")
                            .from(CustomerDietaryRestriction::Table, CustomerDietaryRestriction::DietaryRestrictionId)
                            .to(DietaryRestriction::Table, DietaryRestriction::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .primary_key(
                        Index::create()
                            .col(CustomerDietaryRestriction::CustomerId)
                            .col(CustomerDietaryRestriction::DietaryRestrictionId),
                    )
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(CustomerDietaryRestriction::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum CustomerDietaryRestriction {
    Table,
    CustomerId,
    DietaryRestrictionId,
}

#[derive(DeriveIden)]
enum Customer {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum DietaryRestriction {
    Table,
    Id,
}
