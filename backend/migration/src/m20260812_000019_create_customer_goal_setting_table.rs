use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(CustomerGoalSetting::Table)
                    .if_not_exists()
                    .col(pk_auto(CustomerGoalSetting::Id).integer())
                    .col(binary_len_uniq(CustomerGoalSetting::Uuid, 16))
                    .col(integer(CustomerGoalSetting::TenantId).null())
                    .col(integer(CustomerGoalSetting::CustomerId).null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_cgs_customer")
                            .from(CustomerGoalSetting::Table, CustomerGoalSetting::CustomerId)
                            .to(Customer::Table, Customer::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .col(string_len(CustomerGoalSetting::Name, 500).not_null())
                    .col(integer(CustomerGoalSetting::FormulaId).null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_cgs_formula")
                            .from(CustomerGoalSetting::Table, CustomerGoalSetting::FormulaId)
                            .to(Formula::Table, Formula::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .col(integer(CustomerGoalSetting::ActivityFactorId).null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_cgs_activity_factor")
                            .from(CustomerGoalSetting::Table, CustomerGoalSetting::ActivityFactorId)
                            .to(ActivityFactor::Table, ActivityFactor::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .col(integer(CustomerGoalSetting::ObjectiveId).null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_cgs_objective")
                            .from(CustomerGoalSetting::Table, CustomerGoalSetting::ObjectiveId)
                            .to(Objective::Table, Objective::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .col(integer(CustomerGoalSetting::PhysicalActivityLevelId).null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_cgs_physical_activity_level")
                            .from(CustomerGoalSetting::Table, CustomerGoalSetting::PhysicalActivityLevelId)
                            .to(PhysicalActivityLevel::Table, PhysicalActivityLevel::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .col(double(CustomerGoalSetting::Height).null())
                    .col(double(CustomerGoalSetting::ActualWeight).null())
                    .col(double(CustomerGoalSetting::DesiredWeight).null())
                    .col(double(CustomerGoalSetting::Carbohydrate).null())
                    .col(double(CustomerGoalSetting::Lipids).null())
                    .col(double(CustomerGoalSetting::Protein).null())
                    .col(double(CustomerGoalSetting::CustomerCaloricGoal).null())
                    .col(date_time(CustomerGoalSetting::CreatedAt).null())
                    .col(string_len(CustomerGoalSetting::CreatedBy, 200).null())
                    .col(date_time(CustomerGoalSetting::UpdatedAt).null())
                    .col(string_len(CustomerGoalSetting::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(CustomerGoalSetting::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum CustomerGoalSetting {
    Table,
    Id,
    Uuid,
    TenantId,
    CustomerId,
    Name,
    FormulaId,
    ActivityFactorId,
    ObjectiveId,
    PhysicalActivityLevelId,
    Height,
    ActualWeight,
    DesiredWeight,
    Carbohydrate,
    Lipids,
    Protein,
    CustomerCaloricGoal,
    CreatedAt,
    CreatedBy,
    UpdatedAt,
    UpdatedBy,
}

#[derive(DeriveIden)]
enum Customer {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Formula {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum ActivityFactor {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Objective {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum PhysicalActivityLevel {
    Table,
    Id,
}
