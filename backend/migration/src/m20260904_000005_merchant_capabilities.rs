use sea_orm_migration::prelude::*;

/// Which payment methods a clinic offers, and through which acquirer.
///
/// One acquirer per clinic: a clinic may have connections provisioned for more
/// than one provider, but only one is live at a time. That is enforced by the
/// database rather than by the use case — a generated column that is NULL unless
/// the row is enabled, under a unique index. NULLs do not collide in MariaDB, so
/// any number of disabled connections coexist while at most one is enabled.
///
/// The capability check encodes what each acquirer can actually do. e.Rede's v2
/// transaction API is card-only here: Pix was never confirmed for it, and the
/// tokenisation that recurring billing needs exists only on the PSP. Refusing
/// the combination at configuration time is far better than letting a clinic
/// switch on a method that fails in front of a patient at checkout.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        conn.execute_unprepared(
            "ALTER TABLE payment_merchant \
             ADD COLUMN credit_enabled TINYINT(1) NOT NULL DEFAULT 1, \
             ADD COLUMN pix_enabled TINYINT(1) NOT NULL DEFAULT 0, \
             ADD COLUMN recurring_enabled TINYINT(1) NOT NULL DEFAULT 0",
        )
        .await?;

        conn.execute_unprepared(
            "ALTER TABLE payment_merchant ADD CONSTRAINT ck_pm_capabilities \
             CHECK (provider = 'asaas' OR (pix_enabled = 0 AND recurring_enabled = 0))",
        )
        .await?;

        // Recurring billing charges a stored card, so it cannot be on without
        // the card method it charges.
        conn.execute_unprepared(
            "ALTER TABLE payment_merchant ADD CONSTRAINT ck_pm_recurring_needs_credit \
             CHECK (recurring_enabled = 0 OR credit_enabled = 1)",
        )
        .await?;

        conn.execute_unprepared(
            "ALTER TABLE payment_merchant \
             ADD COLUMN active_flag TINYINT(1) \
             AS (IF(status = 'enabled', 1, NULL)) VIRTUAL",
        )
        .await?;

        conn.execute_unprepared(
            "ALTER TABLE payment_merchant \
             ADD UNIQUE INDEX uq_pm_one_active (tenant_id, environment, active_flag)",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        conn.execute_unprepared("ALTER TABLE payment_merchant DROP INDEX uq_pm_one_active")
            .await?;
        conn.execute_unprepared("ALTER TABLE payment_merchant DROP COLUMN active_flag")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_merchant DROP CONSTRAINT ck_pm_recurring_needs_credit",
        )
        .await?;
        conn.execute_unprepared("ALTER TABLE payment_merchant DROP CONSTRAINT ck_pm_capabilities")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_merchant \
             DROP COLUMN recurring_enabled, \
             DROP COLUMN pix_enabled, \
             DROP COLUMN credit_enabled",
        )
        .await?;

        Ok(())
    }
}
