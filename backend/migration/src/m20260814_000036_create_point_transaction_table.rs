use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(PointTransaction::Table)
                    .if_not_exists()
                    .col(pk_auto(PointTransaction::Id).integer())
                    .col(binary_len_uniq(PointTransaction::Uuid, 16))
                    .col(integer(PointTransaction::CustomerId).not_null())
                    .col(integer(PointTransaction::MealLogId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_point_transaction_meal_log")
                            .from(PointTransaction::Table, PointTransaction::MealLogId)
                            .to(MealLog::Table, MealLog::Id),
                    )
                    .col(integer(PointTransaction::Points).not_null())
                    .col(date_time(PointTransaction::CreatedAt).not_null())
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_point_transaction_meal_log_id")
                    .table(PointTransaction::Table)
                    .col(PointTransaction::MealLogId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_point_transaction_customer_id")
                    .table(PointTransaction::Table)
                    .col(PointTransaction::CustomerId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(PointTransaction::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum PointTransaction {
    Table,
    Id,
    Uuid,
    CustomerId,
    MealLogId,
    Points,
    CreatedAt,
}

#[derive(DeriveIden)]
enum MealLog {
    Table,
    Id,
}
