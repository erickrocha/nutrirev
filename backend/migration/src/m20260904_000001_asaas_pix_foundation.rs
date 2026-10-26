use sea_orm_migration::{prelude::*, schema::*};

/// Opens the payment tables to a second acquirer alongside Rede, to Pix alongside
/// credit and debit, and gives a customer the tax id every Brazilian PSP requires.
///
/// Every CHECK touched here was written as a builder expression in migration 46,
/// and SeaQuery has no ALTER-CHECK builder, so they are dropped and re-added with
/// raw DDL — the same way `m20260903_000001` already handles `ck_pc_status`.
/// `ck_pa_installments` is the non-obvious one: it names `method` explicitly, so a
/// `pix` row violates it even after `ck_pa_method` is relaxed.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        // Two acquirers coexist: the clinic picks which one its merchant row uses.
        conn.execute_unprepared("ALTER TABLE payment_merchant DROP CONSTRAINT ck_pm_provider")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_merchant ADD CONSTRAINT ck_pm_provider \
             CHECK (provider IN ('rede', 'asaas'))",
        )
        .await?;

        conn.execute_unprepared("ALTER TABLE payment_attempt DROP CONSTRAINT ck_pa_method")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_attempt ADD CONSTRAINT ck_pa_method \
             CHECK (method IN ('credit', 'debit', 'pix'))",
        )
        .await?;

        // Pix has no notion of installments; the row must say 1 rather than 0, so
        // that `amount_cents` per installment stays meaningful across methods.
        conn.execute_unprepared("ALTER TABLE payment_attempt DROP CONSTRAINT ck_pa_installments")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_attempt ADD CONSTRAINT ck_pa_installments \
             CHECK ((method = 'credit' AND installments BETWEEN 1 AND 12) \
                 OR (method = 'debit' AND installments = 1) \
                 OR (method = 'pix' AND installments = 1))",
        )
        .await?;

        // A Pix EndToEndId is exactly 32 characters, which leaves the old
        // varchar(32) with no room for it and the provider's own payment id.
        conn.execute_unprepared(
            "ALTER TABLE payment_attempt \
             MODIFY COLUMN provider_transaction_id VARCHAR(64) NULL",
        )
        .await?;

        // Who initiated the charge. A worker-run recurring charge is a different
        // animal from one the cardholder is sitting in front of, and card scheme
        // rules treat them differently.
        manager
            .alter_table(
                Table::alter()
                    .table(PaymentAttempt::Table)
                    .add_column(
                        ColumnDef::new(PaymentAttempt::Initiator)
                            .string_len(8)
                            .not_null()
                            .default("cit"),
                    )
                    .to_owned(),
            )
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_attempt ADD CONSTRAINT ck_pa_initiator \
             CHECK (initiator IN ('cit', 'mit'))",
        )
        .await?;

        // The PSP requires a CPF/CNPJ to create the payer, and Pix cannot be
        // issued without one. Nullable because an existing patient has none yet
        // and a patient who never pays through the app never needs one; the
        // checkout is what demands it.
        manager
            .alter_table(
                Table::alter()
                    .table(Customer::Table)
                    .add_column(string_len_null(Customer::TaxId, 14))
                    .add_column(string_len_null(Customer::ProviderCustomerId, 64))
                    .to_owned(),
            )
            .await?;

        // Same document twice in one clinic means one of the two records is a
        // duplicate patient. NULLs do not collide in MariaDB, so unfilled rows
        // are unaffected.
        manager
            .create_index(
                Index::create()
                    .name("uq_customer_tax_id")
                    .table(Customer::Table)
                    .col(Customer::TenantId)
                    .col(Customer::TaxId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        // First, because it is the only step that can fail on real data: MariaDB
        // refuses to narrow a column holding a longer value rather than silently
        // truncating it. DDL here is not transactional, so this has to reject
        // before anything irreversible is dropped -- otherwise a rollback that
        // cannot finish has already destroyed the tax ids on its way to failing.
        conn.execute_unprepared(
            "ALTER TABLE payment_attempt \
             MODIFY COLUMN provider_transaction_id VARCHAR(32) NULL",
        )
        .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("uq_customer_tax_id")
                    .table(Customer::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(Customer::Table)
                    .drop_column(Customer::ProviderCustomerId)
                    .drop_column(Customer::TaxId)
                    .to_owned(),
            )
            .await?;

        conn.execute_unprepared("ALTER TABLE payment_attempt DROP CONSTRAINT ck_pa_initiator")
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(PaymentAttempt::Table)
                    .drop_column(PaymentAttempt::Initiator)
                    .to_owned(),
            )
            .await?;

        conn.execute_unprepared("ALTER TABLE payment_attempt DROP CONSTRAINT ck_pa_installments")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_attempt ADD CONSTRAINT ck_pa_installments \
             CHECK ((method = 'credit' AND installments BETWEEN 1 AND 12) \
                 OR (method = 'debit' AND installments = 1))",
        )
        .await?;

        conn.execute_unprepared("ALTER TABLE payment_attempt DROP CONSTRAINT ck_pa_method")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_attempt ADD CONSTRAINT ck_pa_method \
             CHECK (method IN ('credit', 'debit'))",
        )
        .await?;

        conn.execute_unprepared("ALTER TABLE payment_merchant DROP CONSTRAINT ck_pm_provider")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_merchant ADD CONSTRAINT ck_pm_provider \
             CHECK (provider = 'rede')",
        )
        .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum PaymentAttempt {
    Table,
    Initiator,
}

#[derive(DeriveIden)]
enum Customer {
    Table,
    TenantId,
    TaxId,
    ProviderCustomerId,
}
