use sea_orm_migration::prelude::*;

/// Keep the original payment-schedule migration immutable. It was deployed
/// with `cycle_number`; the application-facing name was subsequently shortened
/// to `sequence`, so existing databases need an explicit follow-up rename.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(PaymentCharge::Table)
                    .rename_column(PaymentCharge::CycleNumber, PaymentCharge::Sequence)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(PaymentCharge::Table)
                    .rename_column(PaymentCharge::Sequence, PaymentCharge::CycleNumber)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum PaymentCharge {
    Table,
    CycleNumber,
    Sequence,
}
