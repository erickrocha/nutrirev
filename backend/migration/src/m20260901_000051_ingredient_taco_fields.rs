use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Ingredient::Table)
                    .add_column(integer_null(Ingredient::TacoId))
                    .add_column(double_null(Ingredient::Moisture))
                    .add_column(double_null(Ingredient::Kj))
                    .add_column(double_null(Ingredient::Cholesterol))
                    .add_column(double_null(Ingredient::Ash))
                    .add_column(double_null(Ingredient::Calcium))
                    .add_column(double_null(Ingredient::Magnesium))
                    .add_column(double_null(Ingredient::Manganese))
                    .add_column(double_null(Ingredient::Phosphorus))
                    .add_column(double_null(Ingredient::Iron))
                    .add_column(double_null(Ingredient::Sodium))
                    .add_column(double_null(Ingredient::Potassium))
                    .add_column(double_null(Ingredient::Copper))
                    .add_column(double_null(Ingredient::Zinc))
                    .add_column(double_null(Ingredient::Retinol))
                    .add_column(double_null(Ingredient::Re))
                    .add_column(double_null(Ingredient::Rae))
                    .add_column(double_null(Ingredient::Thiamine))
                    .add_column(double_null(Ingredient::Riboflavin))
                    .add_column(double_null(Ingredient::Pyridoxine))
                    .add_column(double_null(Ingredient::Niacin))
                    .add_column(double_null(Ingredient::VitaminC))
                    .add_column(double_null(Ingredient::SaturatedFat))
                    .add_column(double_null(Ingredient::MonounsaturatedFat))
                    .add_column(double_null(Ingredient::PolyunsaturatedFat))
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Ingredient::Table)
                    .drop_column(Ingredient::TacoId)
                    .drop_column(Ingredient::Moisture)
                    .drop_column(Ingredient::Kj)
                    .drop_column(Ingredient::Cholesterol)
                    .drop_column(Ingredient::Ash)
                    .drop_column(Ingredient::Calcium)
                    .drop_column(Ingredient::Magnesium)
                    .drop_column(Ingredient::Manganese)
                    .drop_column(Ingredient::Phosphorus)
                    .drop_column(Ingredient::Iron)
                    .drop_column(Ingredient::Sodium)
                    .drop_column(Ingredient::Potassium)
                    .drop_column(Ingredient::Copper)
                    .drop_column(Ingredient::Zinc)
                    .drop_column(Ingredient::Retinol)
                    .drop_column(Ingredient::Re)
                    .drop_column(Ingredient::Rae)
                    .drop_column(Ingredient::Thiamine)
                    .drop_column(Ingredient::Riboflavin)
                    .drop_column(Ingredient::Pyridoxine)
                    .drop_column(Ingredient::Niacin)
                    .drop_column(Ingredient::VitaminC)
                    .drop_column(Ingredient::SaturatedFat)
                    .drop_column(Ingredient::MonounsaturatedFat)
                    .drop_column(Ingredient::PolyunsaturatedFat)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Ingredient {
    Table,
    TacoId,
    Moisture,
    Kj,
    Cholesterol,
    Ash,
    Calcium,
    Magnesium,
    Manganese,
    Phosphorus,
    Iron,
    Sodium,
    Potassium,
    Copper,
    Zinc,
    Retinol,
    Re,
    Rae,
    Thiamine,
    Riboflavin,
    Pyridoxine,
    Niacin,
    VitaminC,
    SaturatedFat,
    MonounsaturatedFat,
    PolyunsaturatedFat,
}
