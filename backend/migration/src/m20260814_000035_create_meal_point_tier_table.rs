use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(MealPointTier::Table)
                    .if_not_exists()
                    .col(pk_auto(MealPointTier::Id).integer())
                    .col(binary_len_uniq(MealPointTier::Uuid, 16))
                    .col(integer(MealPointTier::TenantId).null())
                    .col(integer(MealPointTier::DailyMealId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_meal_point_tier_daily_meal")
                            .from(MealPointTier::Table, MealPointTier::DailyMealId)
                            .to(DailyMeal::Table, DailyMeal::Id)
                            .on_delete(ForeignKeyAction::Restrict),
                    )
                    .col(time(MealPointTier::DeadlineTime).not_null())
                    .col(integer(MealPointTier::Points).not_null())
                    .col(date_time(MealPointTier::CreatedAt).not_null())
                    .col(string_len_null(MealPointTier::CreatedBy, 200))
                    .col(date_time(MealPointTier::UpdatedAt).not_null())
                    .col(string_len_null(MealPointTier::UpdatedBy, 200))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_meal_point_tier_daily_meal_deadline")
                    .table(MealPointTier::Table)
                    .col(MealPointTier::DailyMealId)
                    .col(MealPointTier::DeadlineTime)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(MealPointTier::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum MealPointTier {
    Table,
    Id,
    Uuid,
    TenantId,
    DailyMealId,
    DeadlineTime,
    Points,
    CreatedAt,
    CreatedBy,
    UpdatedAt,
    UpdatedBy,
}

#[derive(DeriveIden)]
enum DailyMeal {
    Table,
    Id,
}
