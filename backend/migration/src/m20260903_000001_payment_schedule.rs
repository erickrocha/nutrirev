use sea_orm_migration::{prelude::*, schema::*};

/// Turns `payment_date` into a recurring subscription anchor and `payment_charge`
/// into the per-cycle installment it generates.
///
/// The unique index `uq_pc_cycle` is the load-bearing part: charge generation runs
/// in a background worker, and the application may run on more than one instance,
/// so the database — not the worker — is what guarantees a cycle is emitted once.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // payment_date becomes the subscription: the typed date is the *first*
        // due date, and next_due_date tracks where the cycle has advanced to.
        manager
            .alter_table(
                Table::alter()
                    .table(PaymentDate::Table)
                    .rename_column(PaymentDate::DueDate, PaymentDate::FirstDueDate)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(PaymentDate::Table)
                    .add_column(date_null(PaymentDate::NextDueDate))
                    .add_column(
                        ColumnDef::new(PaymentDate::Status)
                            .string_len(32)
                            .not_null()
                            .default("active"),
                    )
                    .to_owned(),
            )
            .await?;

        let conn = manager.get_connection();

        conn.execute_unprepared(
            "UPDATE payment_date SET next_due_date = first_due_date WHERE next_due_date IS NULL",
        )
        .await?;

        conn.execute_unprepared(
            "ALTER TABLE payment_date ADD CONSTRAINT ck_pd_status \
             CHECK (status IN ('active', 'cancelled', 'completed'))",
        )
        .await?;

        // The worker scans exactly this predicate every tick.
        manager
            .create_index(
                Index::create()
                    .name("ix_pd_due")
                    .table(PaymentDate::Table)
                    .col(PaymentDate::Status)
                    .col(PaymentDate::NextDueDate)
                    .to_owned(),
            )
            .await?;

        // payment_charge gains its link back to the subscription plus the
        // settlement timestamp.
        manager
            .alter_table(
                Table::alter()
                    .table(PaymentCharge::Table)
                    .add_column(integer_null(PaymentCharge::PaymentDateId))
                    .add_column(
                        ColumnDef::new(PaymentCharge::CycleNumber)
                            .integer()
                            .not_null()
                            .default(1),
                    )
                    .add_column(
                        ColumnDef::new(PaymentCharge::PaidAt)
                            .custom(Alias::new("datetime(6)"))
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        conn.execute_unprepared(
            "ALTER TABLE payment_charge ADD CONSTRAINT fk_pc_payment_date \
             FOREIGN KEY (payment_date_id) REFERENCES payment_date (id) ON DELETE SET NULL",
        )
        .await?;

        // A NULL payment_date_id (an ad-hoc charge) is exempt: MariaDB unique
        // indexes admit any number of NULLs.
        manager
            .create_index(
                Index::create()
                    .name("uq_pc_cycle")
                    .table(PaymentCharge::Table)
                    .col(PaymentCharge::PaymentDateId)
                    .col(PaymentCharge::CycleNumber)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // 'overdue' is a new terminal-ish state between open and paid.
        conn.execute_unprepared("ALTER TABLE payment_charge DROP CONSTRAINT ck_pc_status")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_charge ADD CONSTRAINT ck_pc_status \
             CHECK (status IN ('open', 'paid', 'overdue', 'cancelled'))",
        )
        .await?;

        // Who owns a block. NULL means the clinic disabled the account by hand
        // and the billing worker must keep its hands off it.
        manager
            .alter_table(
                Table::alter()
                    .table(User::Table)
                    .add_column(ColumnDef::new(User::BlockedReason).string_len(32).null())
                    .to_owned(),
            )
            .await?;

        conn.execute_unprepared(
            "ALTER TABLE user ADD CONSTRAINT ck_user_blocked_reason \
             CHECK (blocked_reason IS NULL OR blocked_reason = 'payment')",
        )
        .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Tenant::Table)
                    .add_column(
                        ColumnDef::new(Tenant::PaymentGraceDays)
                            .integer()
                            .not_null()
                            .default(5),
                    )
                    .to_owned(),
            )
            .await?;

        conn.execute_unprepared(
            "ALTER TABLE tenant ADD CONSTRAINT ck_tenant_payment_grace_days \
             CHECK (payment_grace_days >= 0)",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        conn.execute_unprepared("ALTER TABLE tenant DROP CONSTRAINT ck_tenant_payment_grace_days")
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(Tenant::Table)
                    .drop_column(Tenant::PaymentGraceDays)
                    .to_owned(),
            )
            .await?;

        conn.execute_unprepared("ALTER TABLE user DROP CONSTRAINT ck_user_blocked_reason")
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(User::Table)
                    .drop_column(User::BlockedReason)
                    .to_owned(),
            )
            .await?;

        conn.execute_unprepared("ALTER TABLE payment_charge DROP CONSTRAINT ck_pc_status")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_charge ADD CONSTRAINT ck_pc_status \
             CHECK (status IN ('open', 'paid', 'cancelled'))",
        )
        .await?;

        // The FK goes first: MariaDB picks uq_pc_cycle as its backing index
        // (payment_date_id leads it) and refuses to drop an index a constraint
        // still needs.
        conn.execute_unprepared("ALTER TABLE payment_charge DROP FOREIGN KEY fk_pc_payment_date")
            .await?;
        manager
            .drop_index(
                Index::drop()
                    .name("uq_pc_cycle")
                    .table(PaymentCharge::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(PaymentCharge::Table)
                    .drop_column(PaymentCharge::PaidAt)
                    .drop_column(PaymentCharge::CycleNumber)
                    .drop_column(PaymentCharge::PaymentDateId)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("ix_pd_due")
                    .table(PaymentDate::Table)
                    .to_owned(),
            )
            .await?;
        conn.execute_unprepared("ALTER TABLE payment_date DROP CONSTRAINT ck_pd_status")
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(PaymentDate::Table)
                    .drop_column(PaymentDate::Status)
                    .drop_column(PaymentDate::NextDueDate)
                    .to_owned(),
            )
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(PaymentDate::Table)
                    .rename_column(PaymentDate::FirstDueDate, PaymentDate::DueDate)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum PaymentDate {
    Table,
    DueDate,
    FirstDueDate,
    NextDueDate,
    Status,
}

#[derive(DeriveIden)]
enum PaymentCharge {
    Table,
    PaymentDateId,
    CycleNumber,
    PaidAt,
}

#[derive(DeriveIden)]
enum User {
    Table,
    BlockedReason,
}

#[derive(DeriveIden)]
enum Tenant {
    Table,
    PaymentGraceDays,
}
