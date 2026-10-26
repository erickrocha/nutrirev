use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(AnalysisJob::Table)
                    .if_not_exists()
                    .col(pk_auto(AnalysisJob::Id).integer())
                    .col(binary_len_uniq(AnalysisJob::JobUuid, 16))
                    .col(integer(AnalysisJob::CustomerId).not_null())
                    .col(string_len(AnalysisJob::Kind, 20).not_null())
                    .col(string_len(AnalysisJob::Status, 20).not_null())
                    .col(text_null(AnalysisJob::ResultJson))
                    .col(string_len_null(AnalysisJob::ErrorCode, 50))
                    .col(text_null(AnalysisJob::ErrorMessage))
                    .col(date_time(AnalysisJob::CreatedAt).not_null())
                    .col(date_time(AnalysisJob::UpdatedAt).not_null())
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_analysis_job_customer_id")
                    .table(AnalysisJob::Table)
                    .col(AnalysisJob::CustomerId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AnalysisJob::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum AnalysisJob {
    Table,
    Id,
    JobUuid,
    CustomerId,
    Kind,
    Status,
    ResultJson,
    ErrorCode,
    ErrorMessage,
    CreatedAt,
    UpdatedAt,
}
