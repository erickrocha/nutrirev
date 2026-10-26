use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Registro da solicitação de exclusão de conta. Fica separado de `customer`
        // porque é um evento, não um atributo do paciente — e porque é a prova de
        // atendimento que a LGPD art. 19 exige, junto com o prazo de guarda do
        // registro nutricional que a clínica é obrigada a manter (art. 16, I).
        manager
            .create_table(
                Table::create()
                    .table(AccountDeletion::Table)
                    .if_not_exists()
                    .col(pk_auto(AccountDeletion::Id).integer())
                    .col(integer_uniq(AccountDeletion::CustomerId))
                    .col(integer_null(AccountDeletion::TenantId))
                    .col(date_time(AccountDeletion::RequestedAt))
                    .col(date(AccountDeletion::RetentionUntil))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_account_deletion_customer")
                            .from(AccountDeletion::Table, AccountDeletion::CustomerId)
                            .to(Customer::Table, Customer::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .index(
                        Index::create()
                            .name("ix_account_deletion_retention")
                            .col(AccountDeletion::RetentionUntil),
                    )
                    .engine("InnoDB")
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AccountDeletion::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum AccountDeletion {
    Table,
    Id,
    CustomerId,
    TenantId,
    RequestedAt,
    RetentionUntil,
}

#[derive(DeriveIden)]
enum Customer {
    Table,
    Id,
}
