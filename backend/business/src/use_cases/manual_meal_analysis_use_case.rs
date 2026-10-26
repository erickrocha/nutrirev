use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::tenant_select;
use crate::domain::ai_provider::{FoodItem, Macros};
use crate::domain::enums::{AnalysisType, MeasurementUnit};
use crate::domain::ingredient::IngredientEntityMapper;
use crate::use_cases::ai::gamification_use_case::GamificationUseCase;
use chrono::NaiveDate;
use entity::{daily_meal_entity, ingredient_entity, meal_log_entity};
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, EntityTrait, NotSet, QueryFilter, Set};
use std::str::FromStr;

#[derive(Debug, Clone, PartialEq)]
pub struct ManualMealItemInput {
    pub ingredient_id: i32,
    pub quantity: f64,
    pub unit: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ManualMealAnalysisInput {
    pub daily_meal_id: i32,
    pub meal_date: NaiveDate,
    pub items: Vec<ManualMealItemInput>,
}

#[derive(Debug, PartialEq)]
pub enum ManualMealAnalysisError {
    InvalidDailyMeal,
    EmptyItems,
    InvalidQuantity,
    IngredientNotFound(i32),
    InvalidUnit(String),
    Db(DbErr),
}

impl From<DbErr> for ManualMealAnalysisError {
    fn from(e: DbErr) -> Self {
        ManualMealAnalysisError::Db(e)
    }
}

pub struct ManualMealAnalysisUseCase;

impl ManualMealAnalysisUseCase {
    pub async fn analyze_and_log(
        db: &DbConn,
        customer_id: i32,
        input: ManualMealAnalysisInput,
    ) -> Result<(meal_log_entity::Model, Vec<FoodItem>, Macros, Option<i32>), ManualMealAnalysisError> {
        if input.items.is_empty() {
            return Err(ManualMealAnalysisError::EmptyItems);
        }

        let daily_meal = tenant_select(
            daily_meal_entity::Entity::find(),
            daily_meal_entity::Column::TenantId,
        )
        .filter(daily_meal_entity::Column::Id.eq(input.daily_meal_id))
        .one(db)
        .await?;

        if daily_meal.is_none() {
            return Err(ManualMealAnalysisError::InvalidDailyMeal);
        }

        let mut food_items = Vec::with_capacity(input.items.len());

        for item in &input.items {
            if item.quantity <= 0.0 {
                return Err(ManualMealAnalysisError::InvalidQuantity);
            }

            let unit_enum = match &item.unit {
                Some(u) if !u.trim().is_empty() => {
                    MeasurementUnit::from_str(u).map_err(ManualMealAnalysisError::InvalidUnit)?
                }
                _ => MeasurementUnit::Grams,
            };

            let multiplier = unit_enum.gram_multiplier();

            let ing_model = tenant_select(
                ingredient_entity::Entity::find(),
                ingredient_entity::Column::TenantId,
            )
            .filter(ingredient_entity::Column::Id.eq(item.ingredient_id))
            .one(db)
            .await?
            .ok_or(ManualMealAnalysisError::IngredientNotFound(item.ingredient_id))?;

            let ingredient_domain = IngredientEntityMapper::from_model(ing_model);
            let (kcal, prot, carbs, fat, _fiber) =
                ingredient_domain.macros_for_quantity(item.quantity, multiplier);

            let estimated_grams = (item.quantity * multiplier * 100.0).round() / 100.0;

            food_items.push(FoodItem {
                name: ingredient_domain.name,
                estimated_grams,
                calories: (kcal * 100.0).round() / 100.0,
                protein_g: (prot * 100.0).round() / 100.0,
                carbs_g: (carbs * 100.0).round() / 100.0,
                fat_g: (fat * 100.0).round() / 100.0,
                confidence: Some("manual".to_string()),
            });
        }

        let totals = Macros {
            calories: (food_items.iter().map(|it| it.calories).sum::<f64>() * 100.0).round() / 100.0,
            protein_g: (food_items.iter().map(|it| it.protein_g).sum::<f64>() * 100.0).round() / 100.0,
            carbs_g: (food_items.iter().map(|it| it.carbs_g).sum::<f64>() * 100.0).round() / 100.0,
            fat_g: (food_items.iter().map(|it| it.fat_g).sum::<f64>() * 100.0).round() / 100.0,
        };

        let items_json = serde_json::to_string(&food_items).ok();

        let active = meal_log_entity::ActiveModel {
            id: NotSet,
            uuid: NotSet,
            customer_id: Set(customer_id),
            daily_meal_id: Set(input.daily_meal_id),
            analysis_job_id: Set(None),
            analysis_type: Set(AnalysisType::Manual.to_string()),
            meal_date: Set(input.meal_date),
            calories: Set(totals.calories),
            protein_g: Set(totals.protein_g),
            carbs_g: Set(totals.carbs_g),
            fat_g: Set(totals.fat_g),
            items_json: Set(items_json),
            photo: Set(None),
            photo_base64: Set(None),
            created_at: NotSet,
            created_by: NotSet,
            updated_at: NotSet,
            updated_by: NotSet,
        };

        let saved = active.insert(db).await?;

        let points_awarded = GamificationUseCase::award_for_meal_log(
            db,
            customer_id,
            input.daily_meal_id,
            saved.created_at,
            saved.id,
        )
        .await?;

        Ok((saved, food_items, totals, points_awarded))
    }
}
