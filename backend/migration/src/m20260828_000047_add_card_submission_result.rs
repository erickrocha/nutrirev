use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(PaymentAttempt::Table)
                    .add_column(integer(PaymentAttempt::SubmittedByUserId).null())
                    .add_column(string_len(PaymentAttempt::ProviderTransactionId, 32).null())
                    .add_column(string_len(PaymentAttempt::ReturnCode, 16).null())
                    .add_column(string_len(PaymentAttempt::ReturnMessage, 256).null())
                    .add_column(string_len(PaymentAttempt::Last4, 4).null())
                    .add_column(string_len(PaymentAttempt::Brand, 32).null())
                    .add_column(
                        ColumnDef::new(PaymentAttempt::SubmittedAt)
                            .custom(Alias::new("datetime(6)"))
                            .null(),
                    )
                    .add_column(
                        ColumnDef::new(PaymentAttempt::CompletedAt)
                            .custom(Alias::new("datetime(6)"))
                            .null(),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(PaymentAttempt::Table)
                    .drop_column(PaymentAttempt::CompletedAt)
                    .drop_column(PaymentAttempt::SubmittedAt)
                    .drop_column(PaymentAttempt::Brand)
                    .drop_column(PaymentAttempt::Last4)
                    .drop_column(PaymentAttempt::ReturnMessage)
                    .drop_column(PaymentAttempt::ReturnCode)
                    .drop_column(PaymentAttempt::ProviderTransactionId)
                    .drop_column(PaymentAttempt::SubmittedByUserId)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum PaymentAttempt {
    Table,
    SubmittedByUserId,
    ProviderTransactionId,
    ReturnCode,
    ReturnMessage,
    Last4,
    Brand,
    SubmittedAt,
    CompletedAt,
}
