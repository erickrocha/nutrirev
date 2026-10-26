use sea_orm_migration::prelude::*;

/// Records money moving back out: a refund, or a chargeback the customer raised
/// with their bank.
///
/// `payment_attempt` needs a state for it because `captured` was the end of the
/// line — an attempt that was reversed would otherwise still read as settled
/// money, and the charge behind it as paid.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        conn.execute_unprepared("ALTER TABLE payment_attempt DROP CONSTRAINT ck_pa_status")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_attempt ADD CONSTRAINT ck_pa_status \
             CHECK (status IN ('prepared', 'submitting', 'requires_action', 'unknown', \
                               'authorized', 'captured', 'declined', 'cancelled', 'refunded'))",
        )
        .await?;

        // A reversed attempt releases the charge, exactly like a declined one:
        // the money is gone, so the charge is owed again and must be payable by
        // any method. `ck_pa_active` is what enforces that pairing.
        conn.execute_unprepared("ALTER TABLE payment_attempt DROP CONSTRAINT ck_pa_active")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_attempt ADD CONSTRAINT ck_pa_active \
             CHECK ((status IN ('declined', 'cancelled', 'refunded') AND active_charge_id IS NULL) \
                 OR (status NOT IN ('declined', 'cancelled', 'refunded') \
                     AND active_charge_id IS NOT NULL AND active_charge_id = charge_id))",
        )
        .await?;

        // When the money went back out, so a reversal is never applied twice and
        // a human can see how long a charge stood settled.
        conn.execute_unprepared(
            "ALTER TABLE payment_attempt ADD COLUMN reversed_at datetime(6) NULL",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        conn.execute_unprepared("ALTER TABLE payment_attempt DROP COLUMN reversed_at")
            .await?;

        // Narrowing back fails while any reversed row exists, which is the point:
        // this direction is only for an environment that never saw one.
        conn.execute_unprepared("ALTER TABLE payment_attempt DROP CONSTRAINT ck_pa_active")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_attempt ADD CONSTRAINT ck_pa_active \
             CHECK ((status IN ('declined', 'cancelled') AND active_charge_id IS NULL) \
                 OR (status NOT IN ('declined', 'cancelled') \
                     AND active_charge_id IS NOT NULL AND active_charge_id = charge_id))",
        )
        .await?;

        conn.execute_unprepared("ALTER TABLE payment_attempt DROP CONSTRAINT ck_pa_status")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_attempt ADD CONSTRAINT ck_pa_status \
             CHECK (status IN ('prepared', 'submitting', 'requires_action', 'unknown', \
                               'authorized', 'captured', 'declined', 'cancelled'))",
        )
        .await?;

        Ok(())
    }
}
