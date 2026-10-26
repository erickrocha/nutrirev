use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Primary Eat table
        manager
            .create_table(
                Table::create()
                    .table(Eat::Table)
                    .if_not_exists()
                    .col(pk_auto(Eat::Id).integer())
                    .col(binary_len_uniq(Eat::Uuid, 16))
                    .col(integer(Eat::TenantId).null())
                    .col(string_len(Eat::Name, 255).not_null())
                    .col(text(Eat::Photo).null())
                    .col(ColumnDef::new(Eat::PhotoBase64).custom(Alias::new("LONGBLOB")).null())
                    .col(string_len(Eat::VideoUrl, 500).null())
                    .col(double(Eat::Price).null())
                    .col(integer(Eat::Time).null())
                    .col(integer(Eat::Portion).null())
                    .col(text(Eat::Description).null())
                    .col(string_len(Eat::RecommendedPeriod, 50).null())
                    .col(string_len(Eat::RecommendedDays, 255).null())
                    .col(text(Eat::RecommendedMessage).null())
                    .col(integer(Eat::Views).not_null().default(0))
                    .col(integer(Eat::Additions).not_null().default(0))
                    .col(boolean(Eat::IsHighlight).not_null().default(false))
                    .col(integer(Eat::CycleId).null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_eat_cycle")
                            .from(Eat::Table, Eat::CycleId)
                            .to(Cycle::Table, Cycle::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .col(date_time(Eat::CreatedAt).null())
                    .col(string_len(Eat::CreatedBy, 200).null())
                    .col(date_time(Eat::UpdatedAt).null())
                    .col(string_len(Eat::UpdatedBy, 200).null())
                    .to_owned(),
            )
            .await?;

        // 2. Eat Directions (Preparation steps)
        manager
            .create_table(
                Table::create()
                    .table(EatDirection::Table)
                    .if_not_exists()
                    .col(pk_auto(EatDirection::Id).integer())
                    .col(integer(EatDirection::EatId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_eat_direction_eat")
                            .from(EatDirection::Table, EatDirection::EatId)
                            .to(Eat::Table, Eat::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(integer(EatDirection::StepNumber).not_null())
                    .col(text(EatDirection::Description).not_null())
                    .to_owned(),
            )
            .await?;

        // 3. Eat Restrictions master table
        manager
            .create_table(
                Table::create()
                    .table(EatRestriction::Table)
                    .if_not_exists()
                    .col(pk_auto(EatRestriction::Id).integer())
                    .col(string_len(EatRestriction::Name, 100).not_null().unique_key())
                    .to_owned(),
            )
            .await?;

        // 4. Eat Tags master table
        manager
            .create_table(
                Table::create()
                    .table(EatTag::Table)
                    .if_not_exists()
                    .col(pk_auto(EatTag::Id).integer())
                    .col(string_len(EatTag::Name, 100).not_null().unique_key())
                    .to_owned(),
            )
            .await?;

        // 5. Eat Meals master table
        manager
            .create_table(
                Table::create()
                    .table(EatMeal::Table)
                    .if_not_exists()
                    .col(pk_auto(EatMeal::Id).integer())
                    .col(string_len(EatMeal::Name, 100).not_null().unique_key())
                    .to_owned(),
            )
            .await?;

        // 6. Eat Biotypes master table
        manager
            .create_table(
                Table::create()
                    .table(EatBiotype::Table)
                    .if_not_exists()
                    .col(pk_auto(EatBiotype::Id).integer())
                    .col(string_len(EatBiotype::Name, 100).not_null().unique_key())
                    .to_owned(),
            )
            .await?;

        // 7. Eat Ingredients (Recipe ingredients with quantity & unit)
        manager
            .create_table(
                Table::create()
                    .table(EatIngredient::Table)
                    .if_not_exists()
                    .col(pk_auto(EatIngredient::Id).integer())
                    .col(integer(EatIngredient::EatId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_eat_ingredient_eat")
                            .from(EatIngredient::Table, EatIngredient::EatId)
                            .to(Eat::Table, Eat::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(integer(EatIngredient::IngredientId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_eat_ingredient_ingredient")
                            .from(EatIngredient::Table, EatIngredient::IngredientId)
                            .to(Ingredient::Table, Ingredient::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(double(EatIngredient::Quantity).not_null())
                    .col(string_len(EatIngredient::Unit, 50).not_null())
                    .to_owned(),
            )
            .await?;

        // 8. Eat Ingredient Substitutes
        manager
            .create_table(
                Table::create()
                    .table(EatIngredientSubstitute::Table)
                    .if_not_exists()
                    .col(integer(EatIngredientSubstitute::EatIngredientId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_eis_eat_ingredient")
                            .from(EatIngredientSubstitute::Table, EatIngredientSubstitute::EatIngredientId)
                            .to(EatIngredient::Table, EatIngredient::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(integer(EatIngredientSubstitute::SubstituteIngredientId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_eis_substitute")
                            .from(EatIngredientSubstitute::Table, EatIngredientSubstitute::SubstituteIngredientId)
                            .to(Ingredient::Table, Ingredient::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .primary_key(
                        Index::create()
                            .col(EatIngredientSubstitute::EatIngredientId)
                            .col(EatIngredientSubstitute::SubstituteIngredientId),
                    )
                    .to_owned(),
            )
            .await?;

        // 9. Eat Restriction Relation
        manager
            .create_table(
                Table::create()
                    .table(EatRestrictionRelation::Table)
                    .if_not_exists()
                    .col(integer(EatRestrictionRelation::EatId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_err_eat")
                            .from(EatRestrictionRelation::Table, EatRestrictionRelation::EatId)
                            .to(Eat::Table, Eat::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(integer(EatRestrictionRelation::RestrictionId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_err_restriction")
                            .from(EatRestrictionRelation::Table, EatRestrictionRelation::RestrictionId)
                            .to(EatRestriction::Table, EatRestriction::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .primary_key(
                        Index::create()
                            .col(EatRestrictionRelation::EatId)
                            .col(EatRestrictionRelation::RestrictionId),
                    )
                    .to_owned(),
            )
            .await?;

        // 10. Eat Tag Relation
        manager
            .create_table(
                Table::create()
                    .table(EatTagRelation::Table)
                    .if_not_exists()
                    .col(integer(EatTagRelation::EatId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_etr_eat")
                            .from(EatTagRelation::Table, EatTagRelation::EatId)
                            .to(Eat::Table, Eat::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(integer(EatTagRelation::TagId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_etr_tag")
                            .from(EatTagRelation::Table, EatTagRelation::TagId)
                            .to(EatTag::Table, EatTag::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .primary_key(
                        Index::create()
                            .col(EatTagRelation::EatId)
                            .col(EatTagRelation::TagId),
                    )
                    .to_owned(),
            )
            .await?;

        // 11. Eat Meal Relation
        manager
            .create_table(
                Table::create()
                    .table(EatMealRelation::Table)
                    .if_not_exists()
                    .col(integer(EatMealRelation::EatId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_emr_eat")
                            .from(EatMealRelation::Table, EatMealRelation::EatId)
                            .to(Eat::Table, Eat::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(integer(EatMealRelation::MealId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_emr_meal")
                            .from(EatMealRelation::Table, EatMealRelation::MealId)
                            .to(EatMeal::Table, EatMeal::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .primary_key(
                        Index::create()
                            .col(EatMealRelation::EatId)
                            .col(EatMealRelation::MealId),
                    )
                    .to_owned(),
            )
            .await?;

        // 12. Eat Biotype Relation
        manager
            .create_table(
                Table::create()
                    .table(EatBiotypeRelation::Table)
                    .if_not_exists()
                    .col(integer(EatBiotypeRelation::EatId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_ebr_eat")
                            .from(EatBiotypeRelation::Table, EatBiotypeRelation::EatId)
                            .to(Eat::Table, Eat::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(integer(EatBiotypeRelation::BiotypeId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_ebr_biotype")
                            .from(EatBiotypeRelation::Table, EatBiotypeRelation::BiotypeId)
                            .to(EatBiotype::Table, EatBiotype::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .primary_key(
                        Index::create()
                            .col(EatBiotypeRelation::EatId)
                            .col(EatBiotypeRelation::BiotypeId),
                    )
                    .to_owned(),
            )
            .await?;

        // 13. Eat Side Dish (Recipe <-> Recipe self-relation)
        manager
            .create_table(
                Table::create()
                    .table(EatSideDish::Table)
                    .if_not_exists()
                    .col(integer(EatSideDish::EatId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_esd_eat")
                            .from(EatSideDish::Table, EatSideDish::EatId)
                            .to(Eat::Table, Eat::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(integer(EatSideDish::SideEatId).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_esd_side_eat")
                            .from(EatSideDish::Table, EatSideDish::SideEatId)
                            .to(Eat::Table, Eat::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .primary_key(
                        Index::create()
                            .col(EatSideDish::EatId)
                            .col(EatSideDish::SideEatId),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(EatSideDish::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(EatBiotypeRelation::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(EatMealRelation::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(EatTagRelation::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(EatRestrictionRelation::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(EatIngredientSubstitute::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(EatIngredient::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(EatBiotype::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(EatMeal::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(EatTag::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(EatRestriction::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(EatDirection::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(Eat::Table).to_owned()).await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum Eat {
    Table,
    Id,
    Uuid,
    TenantId,
    Name,
    Photo,
    PhotoBase64,
    VideoUrl,
    Price,
    Time,
    Portion,
    Description,
    RecommendedPeriod,
    RecommendedDays,
    RecommendedMessage,
    Views,
    Additions,
    IsHighlight,
    CycleId,
    CreatedAt,
    CreatedBy,
    UpdatedAt,
    UpdatedBy,
}

#[derive(DeriveIden)]
enum Cycle {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Ingredient {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum EatDirection {
    Table,
    Id,
    EatId,
    StepNumber,
    Description,
}

#[derive(DeriveIden)]
enum EatRestriction {
    Table,
    Id,
    Name,
}

#[derive(DeriveIden)]
enum EatTag {
    Table,
    Id,
    Name,
}

#[derive(DeriveIden)]
enum EatMeal {
    Table,
    Id,
    Name,
}

#[derive(DeriveIden)]
enum EatBiotype {
    Table,
    Id,
    Name,
}

#[derive(DeriveIden)]
enum EatIngredient {
    Table,
    Id,
    EatId,
    IngredientId,
    Quantity,
    Unit,
}

#[derive(DeriveIden)]
enum EatIngredientSubstitute {
    Table,
    EatIngredientId,
    SubstituteIngredientId,
}

#[derive(DeriveIden)]
enum EatRestrictionRelation {
    Table,
    EatId,
    RestrictionId,
}

#[derive(DeriveIden)]
enum EatTagRelation {
    Table,
    EatId,
    TagId,
}

#[derive(DeriveIden)]
enum EatMealRelation {
    Table,
    EatId,
    MealId,
}

#[derive(DeriveIden)]
enum EatBiotypeRelation {
    Table,
    EatId,
    BiotypeId,
}

#[derive(DeriveIden)]
enum EatSideDish {
    Table,
    EatId,
    SideEatId,
}
