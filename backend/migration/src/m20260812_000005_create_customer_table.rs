use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Customer::Table)
                    .if_not_exists()
                    .col(pk_auto(Customer::Id).integer())
                    .col(binary_len_uniq(Customer::Uuid, 16))
                    .col(integer(Customer::TenantId).null())
                    .col(string_len(Customer::Name, 500).not_null())
                    .col(string_len(Customer::Email, 500).not_null().unique_key())
                    .col(string_len(Customer::Phone, 20).not_null())
                    .col(date(Customer::DateOfBirth).not_null())
                    .col(string_len(Customer::Gender, 20).not_null())
                    .col(string_len(Customer::AddressLine1, 500).null())
                    .col(string_len(Customer::AddressLine2, 500).null())
                    .col(string_len(Customer::Locality, 200).null())
                    .col(string_len(Customer::AdministrativeArea, 200).null())
                    .col(string_len(Customer::PostalCode, 32).null())
                    .col(string_len(Customer::CountryCode, 2).null())
                    .col(integer(Customer::ClinicalPlanId).null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_customer_clinical_plan")
                            .from(Customer::Table, Customer::ClinicalPlanId)
                            .to(ClinicalPlan::Table, ClinicalPlan::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .col(integer(Customer::PrepareMealId).null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_customer_prepare_meal")
                            .from(Customer::Table, Customer::PrepareMealId)
                            .to(PrepareMeal::Table, PrepareMeal::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .col(boolean(Customer::MobileEnabled).not_null().default(false))
                    .col(string_len(Customer::Photo, 500).null())
                    .col(
                        ColumnDef::new(Customer::PhotoBase64)
                            .custom(Alias::new("LONGBLOB"))
                            .null(),
                    )
                    .col(integer(Customer::UserId).null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_customer_user")
                            .from(Customer::Table, Customer::UserId)
                            .to(User::Table, User::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .col(date_time(Customer::CreatedAt).null())
                    .col(string_len(Customer::CreatedBy, 200).null())
                    .col(date_time(Customer::UpdatedAt).null())
                    .col(string_len(Customer::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Customer::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum Customer {
    Table,
    Id,
    Uuid,
    TenantId,
    Name,
    Email,
    Phone,
    DateOfBirth,
    Gender,
    AddressLine1,
    AddressLine2,
    Locality,
    AdministrativeArea,
    PostalCode,
    CountryCode,
    ClinicalPlanId,
    PrepareMealId,
    MobileEnabled,
    Photo,
    PhotoBase64,
    UserId,
    CreatedAt,
    CreatedBy,
    UpdatedAt,
    UpdatedBy,
}

#[derive(DeriveIden)]
enum ClinicalPlan {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum PrepareMeal {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
}
