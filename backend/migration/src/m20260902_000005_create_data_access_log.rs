use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Registro das operações de tratamento sobre dado de saúde — LGPD art. 37.
        //
        // As colunas de auditoria espalhadas pelas entidades gravam quem *escreveu*.
        // Faltava quem *leu*: em prontuário, o acesso indevido por alguém de dentro
        // é o cenário mais provável, e sem este registro ele é invisível.
        manager
            .create_table(
                Table::create()
                    .table(DataAccessLog::Table)
                    .if_not_exists()
                    .col(big_integer(DataAccessLog::Id).primary_key().auto_increment())
                    .col(integer_null(DataAccessLog::UserId))
                    .col(integer_null(DataAccessLog::TenantId))
                    .col(string_len(DataAccessLog::UserEmail, 200))
                    .col(string_len(DataAccessLog::Method, 10))
                    .col(string_len(DataAccessLog::Path, 500))
                    .col(date_time(DataAccessLog::OccurredAt))
                    .index(
                        Index::create()
                            .name("ix_data_access_log_tenant_time")
                            .col(DataAccessLog::TenantId)
                            .col(DataAccessLog::OccurredAt),
                    )
                    .index(
                        Index::create()
                            .name("ix_data_access_log_user_time")
                            .col(DataAccessLog::UserId)
                            .col(DataAccessLog::OccurredAt),
                    )
                    .engine("InnoDB")
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(DataAccessLog::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum DataAccessLog {
    Table,
    Id,
    UserId,
    TenantId,
    UserEmail,
    Method,
    Path,
    OccurredAt,
}
