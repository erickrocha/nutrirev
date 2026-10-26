use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Meal Plan Table
        manager
            .create_table(
                Table::create()
                    .table(MealPlan::Table)
                    .if_not_exists()
                    .col(pk_auto(MealPlan::Id).integer())
                    .col(binary_len_uniq(MealPlan::Uuid, 16))
                    .col(integer(MealPlan::TenantId).null())
                    .col(string_len(MealPlan::Name, 255).not_null())
                    .col(string_len(MealPlan::Category, 50).not_null())
                    .col(string_len(MealPlan::GenerationStatus, 50).not_null())
                    .col(boolean(MealPlan::Viewed).not_null().default(false))
                    .col(boolean(MealPlan::IsFavorite).not_null().default(false))
                    .col(date_time(MealPlan::GeneratedAt).null())
                    .col(integer(MealPlan::NutritionistId).null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_meal_plan_nutritionist")
                            .from(MealPlan::Table, MealPlan::NutritionistId)
                            .to(Doctor::Table, Doctor::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .col(integer(MealPlan::PatientId).null())
                    .col(date_time(MealPlan::CreatedAt).null())
                    .col(string_len(MealPlan::CreatedBy, 200).null())
                    .col(date_time(MealPlan::UpdatedAt).null())
                    .col(string_len(MealPlan::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;

        // 2. Meal Plan Meal (Refeicao do plano)
        manager
            .create_table(
                Table::create()
                    .table(MealPlanMeal::Table)
                    .if_not_exists()
                    .col(pk_auto(MealPlanMeal::Id).integer())
                    .col(integer(MealPlanMeal::MealPlanId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_mpm_meal_plan")
                            .from(MealPlanMeal::Table, MealPlanMeal::MealPlanId)
                            .to(MealPlan::Table, MealPlan::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(string_len(MealPlanMeal::MealType, 50).not_null())
                    .col(boolean(MealPlanMeal::IsPreWorkout).not_null().default(false))
                    .col(boolean(MealPlanMeal::IsPostWorkout).not_null().default(false))
                    .col(text(MealPlanMeal::NutritionistNote).null())
                    .col(integer(MealPlanMeal::Position).not_null().default(0))
                    .to_owned(),
            )
            .await?;

        // 3. Meal Plan Option (Opcao de refeicao)
        manager
            .create_table(
                Table::create()
                    .table(MealPlanOption::Table)
                    .if_not_exists()
                    .col(pk_auto(MealPlanOption::Id).integer())
                    .col(integer(MealPlanOption::MealPlanMealId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_mpo_meal_plan_meal")
                            .from(MealPlanOption::Table, MealPlanOption::MealPlanMealId)
                            .to(MealPlanMeal::Table, MealPlanMeal::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(string_len(MealPlanOption::Label, 100).not_null())
                    .col(integer(MealPlanOption::Position).not_null().default(0))
                    .to_owned(),
            )
            .await?;

        // 4. Meal Plan Item (Item alimento do plano)
        manager
            .create_table(
                Table::create()
                    .table(MealPlanItem::Table)
                    .if_not_exists()
                    .col(pk_auto(MealPlanItem::Id).integer())
                    .col(integer(MealPlanItem::MealPlanOptionId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_mpi_meal_plan_option")
                            .from(MealPlanItem::Table, MealPlanItem::MealPlanOptionId)
                            .to(MealPlanOption::Table, MealPlanOption::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(integer(MealPlanItem::IngredientId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_mpi_ingredient")
                            .from(MealPlanItem::Table, MealPlanItem::IngredientId)
                            .to(Ingredient::Table, Ingredient::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(double(MealPlanItem::Quantity).not_null())
                    .col(string_len(MealPlanItem::Unit, 50).not_null())
                    .to_owned(),
            )
            .await?;

        // 5. Meal Plan Item Substitutes
        manager
            .create_table(
                Table::create()
                    .table(MealPlanItemSubstitute::Table)
                    .if_not_exists()
                    .col(integer(MealPlanItemSubstitute::MealPlanItemId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_mpis_meal_plan_item")
                            .from(MealPlanItemSubstitute::Table, MealPlanItemSubstitute::MealPlanItemId)
                            .to(MealPlanItem::Table, MealPlanItem::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(integer(MealPlanItemSubstitute::SubstituteIngredientId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_mpis_substitute")
                            .from(MealPlanItemSubstitute::Table, MealPlanItemSubstitute::SubstituteIngredientId)
                            .to(Ingredient::Table, Ingredient::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .primary_key(
                        Index::create()
                            .col(MealPlanItemSubstitute::MealPlanItemId)
                            .col(MealPlanItemSubstitute::SubstituteIngredientId),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(MealPlanItemSubstitute::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(MealPlanItem::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(MealPlanOption::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(MealPlanMeal::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(MealPlan::Table).to_owned()).await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum MealPlan {
    Table,
    Id,
    Uuid,
    TenantId,
    Name,
    Category,
    GenerationStatus,
    Viewed,
    IsFavorite,
    GeneratedAt,
    NutritionistId,
    PatientId,
    CreatedAt,
    CreatedBy,
    UpdatedAt,
    UpdatedBy,
}

#[derive(DeriveIden)]
enum Doctor {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Ingredient {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum MealPlanMeal {
    Table,
    Id,
    MealPlanId,
    MealType,
    IsPreWorkout,
    IsPostWorkout,
    NutritionistNote,
    Position,
}

#[derive(DeriveIden)]
enum MealPlanOption {
    Table,
    Id,
    MealPlanMealId,
    Label,
    Position,
}

#[derive(DeriveIden)]
enum MealPlanItem {
    Table,
    Id,
    MealPlanOptionId,
    IngredientId,
    Quantity,
    Unit,
}

#[derive(DeriveIden)]
enum MealPlanItemSubstitute {
    Table,
    MealPlanItemId,
    SubstituteIngredientId,
}
