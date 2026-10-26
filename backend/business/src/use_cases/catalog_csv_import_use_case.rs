use std::collections::HashMap;

use entity::{
    clinical_conditions_entity, dietary_restriction_entity, ingredient_entity,
    pre_existing_conditions_entity,
};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, NotSet,
    QueryFilter, Set, TransactionTrait,
};

use crate::domain::business_error::BusinessError;

#[derive(Clone, Copy, Debug)]
pub enum CatalogImportKind {
    ClinicalConditions,
    DietaryRestriction,
    Ingredient,
    PreExistingConditions,
}

#[derive(Clone, Debug)]
pub struct CatalogImportRow {
    pub name: String,
    pub kcal: Option<f64>,
    pub protein: Option<f64>,
    pub carbs: Option<f64>,
    pub fat: Option<f64>,
    pub fiber: Option<f64>,
    pub taco_id: Option<i32>,
    pub moisture: Option<f64>,
    pub kj: Option<f64>,
    pub cholesterol: Option<f64>,
    pub ash: Option<f64>,
    pub calcium: Option<f64>,
    pub magnesium: Option<f64>,
    pub manganese: Option<f64>,
    pub phosphorus: Option<f64>,
    pub iron: Option<f64>,
    pub sodium: Option<f64>,
    pub potassium: Option<f64>,
    pub copper: Option<f64>,
    pub zinc: Option<f64>,
    pub retinol: Option<f64>,
    pub re: Option<f64>,
    pub rae: Option<f64>,
    pub thiamine: Option<f64>,
    pub riboflavin: Option<f64>,
    pub pyridoxine: Option<f64>,
    pub niacin: Option<f64>,
    pub vitamin_c: Option<f64>,
    pub saturated_fat: Option<f64>,
    pub monounsaturated_fat: Option<f64>,
    pub polyunsaturated_fat: Option<f64>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct CatalogImportResult {
    pub total: usize,
    pub created: usize,
    pub updated: usize,
}

pub struct CatalogCsvImportUseCase;

impl CatalogCsvImportUseCase {
    pub async fn tenant_exists(
        db: &DatabaseConnection,
        tenant_id: i32,
    ) -> Result<bool, BusinessError> {
        entity::tenant_entity::Entity::find_by_id(tenant_id)
            .one(db)
            .await
            .map(|row| row.is_some())
            .map_err(|error| BusinessError::new(format!("Database error: {error}")))
    }

    pub async fn import(
        db: &DatabaseConnection,
        kind: CatalogImportKind,
        tenant_id: i32,
        rows: Vec<CatalogImportRow>,
    ) -> Result<CatalogImportResult, BusinessError> {
        for attempt in 0..2 {
            let transaction = db
                .begin()
                .await
                .map_err(|error| BusinessError::new(format!("Could not begin import: {error}")))?;

            let result = match kind {
                CatalogImportKind::ClinicalConditions => {
                    import_clinical_conditions(&transaction, tenant_id, &rows).await
                }
                CatalogImportKind::DietaryRestriction => {
                    import_dietary_restrictions(&transaction, tenant_id, &rows).await
                }
                CatalogImportKind::Ingredient => {
                    import_ingredients(&transaction, tenant_id, &rows).await
                }
                CatalogImportKind::PreExistingConditions => {
                    import_pre_existing_conditions(&transaction, tenant_id, &rows).await
                }
            };

            match result {
                Ok(result) => {
                    transaction.commit().await.map_err(|error| {
                        BusinessError::new(format!("Could not commit import: {error}"))
                    })?;
                    return Ok(result);
                }
                Err(error) => {
                    let _ = transaction.rollback().await;
                    if attempt == 1 {
                        return Err(error);
                    }
                }
            }
        }

        unreachable!("the import loop always returns on its final attempt")
    }
}

fn normalized_name(name: &str) -> String {
    name.trim().to_lowercase()
}

fn index_existing<T, F>(rows: &[T], name: F) -> Result<HashMap<String, usize>, BusinessError>
where
    F: Fn(&T) -> &str,
{
    let mut result = HashMap::new();
    for (index, row) in rows.iter().enumerate() {
        let key = normalized_name(name(row));
        if result.insert(key.clone(), index).is_some() {
            return Err(BusinessError::new(format!(
                "Multiple existing rows match normalized name '{key}'"
            )));
        }
    }
    Ok(result)
}

macro_rules! import_named_catalog {
    ($function:ident, $module:ident) => {
        async fn $function(
            transaction: &sea_orm::DatabaseTransaction,
            tenant_id: i32,
            rows: &[CatalogImportRow],
        ) -> Result<CatalogImportResult, BusinessError> {
            let existing = $module::Entity::find()
                .filter($module::Column::TenantId.eq(tenant_id))
                .all(transaction)
                .await
                .map_err(|error| BusinessError::new(format!("Database error: {error}")))?;
            let index = index_existing(&existing, |row| row.name.as_str())?;
            let mut created = 0;
            let mut updated = 0;

            for row in rows {
                if let Some(existing_index) = index.get(&normalized_name(&row.name)) {
                    let mut active = existing[*existing_index].clone().into_active_model();
                    active.name = Set(row.name.clone());
                    active
                        .save(transaction)
                        .await
                        .map_err(|error| BusinessError::new(format!("Database error: {error}")))?;
                    updated += 1;
                } else {
                    $module::ActiveModel {
                        id: NotSet,
                        uuid: NotSet,
                        tenant_id: Set(Some(tenant_id)),
                        name: Set(row.name.clone()),
                        created_at: NotSet,
                        created_by: NotSet,
                        updated_at: NotSet,
                        updated_by: NotSet,
                    }
                    .save(transaction)
                    .await
                    .map_err(|error| BusinessError::new(format!("Database error: {error}")))?;
                    created += 1;
                }
            }

            Ok(CatalogImportResult {
                total: rows.len(),
                created,
                updated,
            })
        }
    };
}

import_named_catalog!(import_clinical_conditions, clinical_conditions_entity);
import_named_catalog!(import_dietary_restrictions, dietary_restriction_entity);
import_named_catalog!(
    import_pre_existing_conditions,
    pre_existing_conditions_entity
);

async fn import_ingredients(
    transaction: &sea_orm::DatabaseTransaction,
    tenant_id: i32,
    rows: &[CatalogImportRow],
) -> Result<CatalogImportResult, BusinessError> {
    let existing = ingredient_entity::Entity::find()
        .filter(ingredient_entity::Column::TenantId.eq(tenant_id))
        .all(transaction)
        .await
        .map_err(|error| BusinessError::new(format!("Database error: {error}")))?;
    let index = index_existing(&existing, |row| row.name.as_str())?;
    let mut created = 0;
    let mut updated = 0;

    for row in rows {
        let kcal = required_nutrient(row.kcal, "kcal")?;
        let protein = required_nutrient(row.protein, "protein")?;
        let carbs = required_nutrient(row.carbs, "carbs")?;
        let fat = required_nutrient(row.fat, "fat")?;
        let fiber = required_nutrient(row.fiber, "fiber")?;

        if let Some(existing_index) = index.get(&normalized_name(&row.name)) {
            let mut active = existing[*existing_index].clone().into_active_model();
            active.name = Set(row.name.clone());
            active.kcal = Set(kcal);
            active.protein = Set(protein);
            active.carbs = Set(carbs);
            active.fat = Set(fat);
            active.fiber = Set(fiber);
            if row.taco_id.is_some() { active.taco_id = Set(row.taco_id); }
            active.moisture = Set(Some(row.moisture.unwrap_or(0.0)));
            active.kj = Set(Some(row.kj.unwrap_or(0.0)));
            active.cholesterol = Set(Some(row.cholesterol.unwrap_or(0.0)));
            active.ash = Set(Some(row.ash.unwrap_or(0.0)));
            active.calcium = Set(Some(row.calcium.unwrap_or(0.0)));
            active.magnesium = Set(Some(row.magnesium.unwrap_or(0.0)));
            active.manganese = Set(Some(row.manganese.unwrap_or(0.0)));
            active.phosphorus = Set(Some(row.phosphorus.unwrap_or(0.0)));
            active.iron = Set(Some(row.iron.unwrap_or(0.0)));
            active.sodium = Set(Some(row.sodium.unwrap_or(0.0)));
            active.potassium = Set(Some(row.potassium.unwrap_or(0.0)));
            active.copper = Set(Some(row.copper.unwrap_or(0.0)));
            active.zinc = Set(Some(row.zinc.unwrap_or(0.0)));
            active.retinol = Set(Some(row.retinol.unwrap_or(0.0)));
            active.re = Set(Some(row.re.unwrap_or(0.0)));
            active.rae = Set(Some(row.rae.unwrap_or(0.0)));
            active.thiamine = Set(Some(row.thiamine.unwrap_or(0.0)));
            active.riboflavin = Set(Some(row.riboflavin.unwrap_or(0.0)));
            active.pyridoxine = Set(Some(row.pyridoxine.unwrap_or(0.0)));
            active.niacin = Set(Some(row.niacin.unwrap_or(0.0)));
            active.vitamin_c = Set(Some(row.vitamin_c.unwrap_or(0.0)));
            active.saturated_fat = Set(Some(row.saturated_fat.unwrap_or(0.0)));
            active.monounsaturated_fat = Set(Some(row.monounsaturated_fat.unwrap_or(0.0)));
            active.polyunsaturated_fat = Set(Some(row.polyunsaturated_fat.unwrap_or(0.0)));

            active
                .save(transaction)
                .await
                .map_err(|error| BusinessError::new(format!("Database error: {error}")))?;
            updated += 1;
        } else {
            ingredient_entity::ActiveModel {
                id: NotSet,
                uuid: NotSet,
                tenant_id: Set(Some(tenant_id)),
                name: Set(row.name.clone()),
                kcal: Set(kcal),
                protein: Set(protein),
                carbs: Set(carbs),
                fat: Set(fat),
                fiber: Set(fiber),
                taco_id: Set(row.taco_id),
                moisture: Set(Some(row.moisture.unwrap_or(0.0))),
                kj: Set(Some(row.kj.unwrap_or(0.0))),
                cholesterol: Set(Some(row.cholesterol.unwrap_or(0.0))),
                ash: Set(Some(row.ash.unwrap_or(0.0))),
                calcium: Set(Some(row.calcium.unwrap_or(0.0))),
                magnesium: Set(Some(row.magnesium.unwrap_or(0.0))),
                manganese: Set(Some(row.manganese.unwrap_or(0.0))),
                phosphorus: Set(Some(row.phosphorus.unwrap_or(0.0))),
                iron: Set(Some(row.iron.unwrap_or(0.0))),
                sodium: Set(Some(row.sodium.unwrap_or(0.0))),
                potassium: Set(Some(row.potassium.unwrap_or(0.0))),
                copper: Set(Some(row.copper.unwrap_or(0.0))),
                zinc: Set(Some(row.zinc.unwrap_or(0.0))),
                retinol: Set(Some(row.retinol.unwrap_or(0.0))),
                re: Set(Some(row.re.unwrap_or(0.0))),
                rae: Set(Some(row.rae.unwrap_or(0.0))),
                thiamine: Set(Some(row.thiamine.unwrap_or(0.0))),
                riboflavin: Set(Some(row.riboflavin.unwrap_or(0.0))),
                pyridoxine: Set(Some(row.pyridoxine.unwrap_or(0.0))),
                niacin: Set(Some(row.niacin.unwrap_or(0.0))),
                vitamin_c: Set(Some(row.vitamin_c.unwrap_or(0.0))),
                saturated_fat: Set(Some(row.saturated_fat.unwrap_or(0.0))),
                monounsaturated_fat: Set(Some(row.monounsaturated_fat.unwrap_or(0.0))),
                polyunsaturated_fat: Set(Some(row.polyunsaturated_fat.unwrap_or(0.0))),
                created_at: NotSet,
                created_by: NotSet,
                updated_at: NotSet,
                updated_by: NotSet,
            }
            .save(transaction)
            .await
            .map_err(|error| BusinessError::new(format!("Database error: {error}")))?;
            created += 1;
        }
    }

    Ok(CatalogImportResult {
        total: rows.len(),
        created,
        updated,
    })
}

fn required_nutrient(value: Option<f64>, field: &str) -> Result<f64, BusinessError> {
    value.ok_or_else(|| BusinessError::new(format!("Missing ingredient field '{field}'")))
}
