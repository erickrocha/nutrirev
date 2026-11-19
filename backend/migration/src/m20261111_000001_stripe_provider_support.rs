use sea_orm_migration::prelude::*;

/// Stripe joins the closed set of acquirers.
///
/// Like the PSP it sits beside, Stripe issues Pix and stores cards for
/// unattended charging, so it is admitted to the capability check alongside
/// `asaas`. The card-only acquirer stays card-only.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        conn.execute_unprepared("ALTER TABLE payment_merchant DROP CONSTRAINT ck_pm_provider")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_merchant ADD CONSTRAINT ck_pm_provider \
             CHECK (provider IN ('rede', 'asaas', 'stripe'))",
        )
        .await?;

        conn.execute_unprepared("ALTER TABLE payment_merchant DROP CONSTRAINT ck_pm_capabilities")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_merchant ADD CONSTRAINT ck_pm_capabilities \
             CHECK (provider IN ('asaas', 'stripe') OR (pix_enabled = 0 AND recurring_enabled = 0))",
        )
        .await?;

        conn.execute_unprepared("ALTER TABLE payment_token DROP CONSTRAINT ck_pt_provider")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_token ADD CONSTRAINT ck_pt_provider \
             CHECK (provider IN ('rede', 'asaas', 'stripe'))",
        )
        .await?;

        // Stripe decline codes (`authentication_required`, `insufficient_funds`)
        // outgrow the 16 characters sized for e.Rede's numeric codes. A declined
        // payment whose outcome cannot be written is left looking in-flight.
        conn.execute_unprepared(
            "ALTER TABLE payment_attempt MODIFY COLUMN return_code VARCHAR(64) NULL",
        )
        .await?;

        Ok(())
    }

    /// Fails if any Stripe row exists, on purpose: silently deleting a clinic's
    /// connection or a patient's stored card to make a rollback fit is worse
    /// than a rollback that refuses to run.
    ///
    /// `return_code` is deliberately left at 64: narrowing it would truncate
    /// the outcome of payments that already happened.
    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        conn.execute_unprepared("ALTER TABLE payment_token DROP CONSTRAINT ck_pt_provider")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_token ADD CONSTRAINT ck_pt_provider \
             CHECK (provider IN ('rede', 'asaas'))",
        )
        .await?;

        conn.execute_unprepared("ALTER TABLE payment_merchant DROP CONSTRAINT ck_pm_capabilities")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_merchant ADD CONSTRAINT ck_pm_capabilities \
             CHECK (provider = 'asaas' OR (pix_enabled = 0 AND recurring_enabled = 0))",
        )
        .await?;

        conn.execute_unprepared("ALTER TABLE payment_merchant DROP CONSTRAINT ck_pm_provider")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_merchant ADD CONSTRAINT ck_pm_provider \
             CHECK (provider IN ('rede', 'asaas'))",
        )
        .await?;

        Ok(())
    }
}
