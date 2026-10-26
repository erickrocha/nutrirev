use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Documento legal versionado. O texto fica aqui, não só uma URL: a prova
        // de consentimento do art. 11 vale pelo que a pessoa de fato leu, e um
        // link pode mudar de conteúdo sem deixar rastro.
        manager
            .create_table(
                Table::create()
                    .table(LegalDocument::Table)
                    .if_not_exists()
                    .col(pk_auto(LegalDocument::Id).integer())
                    .col(binary_len_uniq(LegalDocument::Uuid, 16))
                    .col(string_len(LegalDocument::Kind, 50))
                    .col(string_len(LegalDocument::Version, 50))
                    .col(text(LegalDocument::Content))
                    .col(string_len(LegalDocument::Locale, 10).default("pt-BR"))
                    .col(boolean(LegalDocument::Active).default(true))
                    .col(date_time(LegalDocument::PublishedAt))
                    .index(
                        Index::create()
                            .name("uq_legal_document_kind_version")
                            .col(LegalDocument::Kind)
                            .col(LegalDocument::Version)
                            .col(LegalDocument::Locale)
                            .unique(),
                    )
                    .index(
                        Index::create()
                            .name("ix_legal_document_active")
                            .col(LegalDocument::Active)
                            .col(LegalDocument::Kind),
                    )
                    .engine("InnoDB")
                    .to_owned(),
            )
            .await?;

        // Aceite datado, amarrado à versão exata. É o registro que responde
        // "quem consentiu, com o quê e quando" numa fiscalização.
        manager
            .create_table(
                Table::create()
                    .table(LegalAcceptance::Table)
                    .if_not_exists()
                    .col(pk_auto(LegalAcceptance::Id).integer())
                    .col(integer(LegalAcceptance::UserId))
                    .col(integer(LegalAcceptance::LegalDocumentId))
                    .col(date_time(LegalAcceptance::AcceptedAt))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_legal_acceptance_user")
                            .from(LegalAcceptance::Table, LegalAcceptance::UserId)
                            .to(User::Table, User::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_legal_acceptance_document")
                            .from(LegalAcceptance::Table, LegalAcceptance::LegalDocumentId)
                            .to(LegalDocument::Table, LegalDocument::Id)
                            .on_delete(ForeignKeyAction::Restrict),
                    )
                    .index(
                        Index::create()
                            .name("uq_legal_acceptance_user_document")
                            .col(LegalAcceptance::UserId)
                            .col(LegalAcceptance::LegalDocumentId)
                            .unique(),
                    )
                    .engine("InnoDB")
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(LegalAcceptance::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(LegalDocument::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum LegalDocument {
    Table,
    Id,
    Uuid,
    Kind,
    Version,
    Content,
    Locale,
    Active,
    PublishedAt,
}

#[derive(DeriveIden)]
enum LegalAcceptance {
    Table,
    Id,
    UserId,
    LegalDocumentId,
    AcceptedAt,
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
}
