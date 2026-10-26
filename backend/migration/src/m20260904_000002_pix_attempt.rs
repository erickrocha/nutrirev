use sea_orm_migration::{prelude::*, schema::*};

/// Pix data on a payment attempt, plus the index the provider webhook needs to
/// find the attempt a callback is about.
///
/// Only the BR Code is stored. The QR *image* the provider returns is passed
/// straight through in the create response and never persisted: `payment_attempt`
/// is read and row-locked on every prepare and authorize, SeaORM selects every
/// column, and a base64 blob would be dragged through the hottest path in the
/// system to save one short provider call.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(PaymentAttempt::Table)
                    .add_column(text_null(PaymentAttempt::PixPayload))
                    .add_column(
                        ColumnDef::new(PaymentAttempt::PixExpiresAt)
                            .custom(Alias::new("datetime(6)"))
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        // The webhook arrives naming the provider's payment id and nothing else.
        // Without this the callback is a full scan of every attempt ever made.
        //
        // Not unique: a declined attempt can carry an empty provider id, and two
        // of those must not collide. The webhook requires exactly one match and
        // refuses to act on an ambiguous one.
        manager
            .create_index(
                Index::create()
                    .name("ix_pa_provider_tx")
                    .table(PaymentAttempt::Table)
                    .col(PaymentAttempt::TenantId)
                    .col(PaymentAttempt::ProviderTransactionId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(
                Index::drop()
                    .name("ix_pa_provider_tx")
                    .table(PaymentAttempt::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(PaymentAttempt::Table)
                    .drop_column(PaymentAttempt::PixExpiresAt)
                    .drop_column(PaymentAttempt::PixPayload)
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum PaymentAttempt {
    Table,
    TenantId,
    ProviderTransactionId,
    PixPayload,
    PixExpiresAt,
}
