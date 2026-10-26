use sea_orm_migration::sea_query::Check;
use sea_orm_migration::{prelude::*, schema::*};

/// Stored cards, and the subscription flag that says how each cycle gets paid.
///
/// `payment_token` never holds a PAN — only the provider's opaque token plus the
/// crumbs needed to show the customer which card is on file.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(PaymentToken::Table)
                    .col(pk_auto(PaymentToken::Id).integer())
                    .col(integer(PaymentToken::TenantId))
                    .col(integer(PaymentToken::CustomerId))
                    .col(string_len(PaymentToken::Provider, 32))
                    .col(string_len(PaymentToken::ProviderToken, 255))
                    .col(string_len_null(PaymentToken::Brand, 32))
                    .col(
                        ColumnDef::new(PaymentToken::Last4)
                            .char_len(4)
                            .null(),
                    )
                    .col(integer_null(PaymentToken::ExpiryMonth))
                    .col(integer_null(PaymentToken::ExpiryYear))
                    .col(string_len(PaymentToken::Status, 16).default("active"))
                    // Consent evidence for a stored credential. Required by card
                    // scheme rules, and the reason a customer can be shown when
                    // and from where they agreed.
                    .col(
                        ColumnDef::new(PaymentToken::ConsentAt)
                            .custom(Alias::new("datetime(6)"))
                            .not_null(),
                    )
                    .col(string_len_null(PaymentToken::ConsentIp, 45))
                    .col(
                        ColumnDef::new(PaymentToken::CreatedAt)
                            .custom(Alias::new("datetime(6)"))
                            .not_null(),
                    )
                    .index(
                        Index::create()
                            .name("uq_pt_tenant_id")
                            .col(PaymentToken::TenantId)
                            .col(PaymentToken::Id)
                            .unique(),
                    )
                    // Lets a subscription's foreign key carry the customer too,
                    // so the database itself refuses to point one patient's
                    // subscription at another patient's card.
                    .index(
                        Index::create()
                            .name("uq_pt_owner")
                            .col(PaymentToken::TenantId)
                            .col(PaymentToken::CustomerId)
                            .col(PaymentToken::Id)
                            .unique(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_pt_customer")
                            .from(
                                PaymentToken::Table,
                                (PaymentToken::TenantId, PaymentToken::CustomerId),
                            )
                            .to(Customer::Table, (Customer::TenantId, Customer::Id)),
                    )
                    .check(Check::named(
                        Alias::new("ck_pt_provider").into_iden(),
                        Expr::col(PaymentToken::Provider).is_in(["rede", "asaas"]),
                    ))
                    .check(Check::named(
                        Alias::new("ck_pt_status").into_iden(),
                        Expr::col(PaymentToken::Status).is_in(["active", "revoked"]),
                    ))
                    .engine("InnoDB")
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(PaymentDate::Table)
                    .add_column(
                        ColumnDef::new(PaymentDate::BillingMode)
                            .string_len(16)
                            .not_null()
                            .default("manual"),
                    )
                    .add_column(integer_null(PaymentDate::PaymentTokenId))
                    .to_owned(),
            )
            .await?;

        let conn = manager.get_connection();

        // `manual` is what every existing subscription already does: the worker
        // emits the charge and the patient pays it by hand, by card or by Pix.
        conn.execute_unprepared(
            "ALTER TABLE payment_date ADD CONSTRAINT ck_pd_billing_mode \
             CHECK (billing_mode IN ('manual', 'card_on_file', 'pix_automatico'))",
        )
        .await?;

        // Only an automatic mode may name a card.
        conn.execute_unprepared(
            "ALTER TABLE payment_date ADD CONSTRAINT ck_pd_token_requires_mode \
             CHECK (payment_token_id IS NULL OR billing_mode = 'card_on_file')",
        )
        .await?;

        // Three columns wide on purpose: the customer travels through the key,
        // so a subscription cannot reference a card belonging to someone else.
        // MariaDB's MATCH SIMPLE skips the check when any column is NULL, and
        // payment_date's tenant and customer are both nullable for legacy rows,
        // so the use case verifies ownership too rather than relying on this.
        conn.execute_unprepared(
            "ALTER TABLE payment_date ADD CONSTRAINT fk_pd_token \
             FOREIGN KEY (tenant_id, customer_id, payment_token_id) \
             REFERENCES payment_token (tenant_id, customer_id, id)",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        conn.execute_unprepared("ALTER TABLE payment_date DROP FOREIGN KEY fk_pd_token")
            .await?;
        conn.execute_unprepared(
            "ALTER TABLE payment_date DROP CONSTRAINT ck_pd_token_requires_mode",
        )
        .await?;
        conn.execute_unprepared("ALTER TABLE payment_date DROP CONSTRAINT ck_pd_billing_mode")
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(PaymentDate::Table)
                    .drop_column(PaymentDate::PaymentTokenId)
                    .drop_column(PaymentDate::BillingMode)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(Table::drop().table(PaymentToken::Table).to_owned())
            .await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum PaymentToken {
    Table,
    Id,
    TenantId,
    CustomerId,
    Provider,
    ProviderToken,
    Brand,
    Last4,
    ExpiryMonth,
    ExpiryYear,
    Status,
    ConsentAt,
    ConsentIp,
    CreatedAt,
}

#[derive(DeriveIden)]
enum PaymentDate {
    Table,
    BillingMode,
    PaymentTokenId,
}

#[derive(DeriveIden)]
enum Customer {
    Table,
    Id,
    TenantId,
}
