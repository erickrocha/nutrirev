use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Doctor::Table)
                    .if_not_exists()
                    .col(pk_auto(Doctor::Id).integer())
                    .col(binary_len_uniq(Doctor::Uuid, 16))
                    .col(integer(Doctor::TenantId).null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_doctor_tenant")
                            .from(Doctor::Table, Doctor::TenantId)
                            .to(Tenant::Table, Tenant::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .col(string_len(Doctor::Name, 500).not_null())
                    .col(string_len(Doctor::Document, 50).null())
                    .col(date(Doctor::DateOfBirth).null())
                    .col(blob(Doctor::PhotoBase64).null())
                    .col(string_len(Doctor::City, 100).null())
                    .col(string_len(Doctor::Province, 100).null())
                    .col(string_len(Doctor::Email, 500).null())
                    .col(string_len(Doctor::Phone, 50).null())
                    .col(date_time(Doctor::CreatedAt).null())
                    .col(string_len(Doctor::CreatedBy, 200).null())
                    .col(date_time(Doctor::UpdatedAt).null())
                    .col(string_len(Doctor::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Doctor::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum Doctor {
    Table,
    Id,
    Uuid,
    TenantId,
    Name,
    Document,
    DateOfBirth,
    PhotoBase64,
    City,
    Province,
    Email,
    Phone,
    CreatedAt,
    CreatedBy,
    UpdatedAt,
    UpdatedBy,
}

#[derive(DeriveIden)]
enum Tenant {
    Table,
    Id,
}
