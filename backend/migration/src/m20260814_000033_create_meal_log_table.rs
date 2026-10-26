use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(MealLog::Table)
                    .if_not_exists()
                    .col(pk_auto(MealLog::Id).integer())
                    .col(binary_len_uniq(MealLog::Uuid, 16))
                    .col(integer(MealLog::CustomerId).not_null())
                    .col(integer(MealLog::DailyMealId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_meal_log_daily_meal")
                            .from(MealLog::Table, MealLog::DailyMealId)
                            .to(DailyMeal::Table, DailyMeal::Id)
                            .on_delete(ForeignKeyAction::Restrict),
                    )
                    .col(integer(MealLog::AnalysisJobId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_meal_log_analysis_job")
                            .from(MealLog::Table, MealLog::AnalysisJobId)
                            .to(AnalysisJob::Table, AnalysisJob::Id),
                    )
                    .col(date(MealLog::MealDate).not_null())
                    .col(double(MealLog::Calories).not_null())
                    .col(double(MealLog::ProteinG).not_null())
                    .col(double(MealLog::CarbsG).not_null())
                    .col(double(MealLog::FatG).not_null())
                    .col(text_null(MealLog::ItemsJson))
                    .col(string_len(MealLog::Photo, 500).null())
                    .col(
                        ColumnDef::new(MealLog::PhotoBase64)
                            .custom(Alias::new("LONGBLOB"))
                            .null(),
                    )
                    .col(date_time(MealLog::CreatedAt).not_null())
                    .col(string_len(MealLog::CreatedBy, 50).null())
                    .col(date_time(MealLog::UpdatedAt).not_null())
                    .col(string_len(MealLog::UpdatedBy, 50).null())
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_meal_log_analysis_job_id")
                    .table(MealLog::Table)
                    .col(MealLog::AnalysisJobId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_meal_log_customer_date")
                    .table(MealLog::Table)
                    .col(MealLog::CustomerId)
                    .col(MealLog::MealDate)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(MealLog::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum MealLog {
    Table,
    Id,
    Uuid,
    CustomerId,
    DailyMealId,
    AnalysisJobId,
    MealDate,
    Calories,
    ProteinG,
    CarbsG,
    FatG,
    ItemsJson,
    Photo,
    PhotoBase64,
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

#[derive(DeriveIden)]
enum AnalysisJob {
    Table,
    Id,
}
