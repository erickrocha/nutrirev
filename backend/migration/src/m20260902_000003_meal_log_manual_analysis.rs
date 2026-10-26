use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(MealLog::Table)
                    .modify_column(integer_null(MealLog::AnalysisJobId))
                    .add_column(
                        string_len(MealLog::AnalysisType, 20)
                            .not_null()
                            .default("AI_ANALYZE"),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(MealLog::Table)
                    .drop_column(MealLog::AnalysisType)
                    .modify_column(integer(MealLog::AnalysisJobId).not_null())
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum MealLog {
    Table,
    AnalysisJobId,
    AnalysisType,
}
