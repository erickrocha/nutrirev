use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::{bytes_para_string, string_to_bytes};
use chrono::NaiveDateTime;
use entity::ingredient_entity::{ActiveModel, Model};
use sea_orm::{NotSet, Set, TryIntoModel};

#[derive(Debug, Clone, PartialEq)]
pub struct Ingredient {
    pub id: Option<i32>,
    pub uuid: Option<String>,
    pub tenant_id: Option<i32>,
    pub name: String,
    pub kcal: f64,
    pub protein: f64,
    pub carbs: f64,
    pub fat: f64,
    pub fiber: f64,
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
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
}

impl Ingredient {
    /// Computes (kcal, protein, carbs, fat, fiber) for a given quantity of this
    /// ingredient. `kcal`/`protein`/`carbs`/`fat`/`fiber` on `Ingredient` are
    /// per-100g values, so `quantity_in_grams` must be scaled down by 100.
    pub fn macros_for_quantity(&self, quantity: f64, unit_gram_multiplier: f64) -> (f64, f64, f64, f64, f64) {
        let ratio = (quantity * unit_gram_multiplier) / 100.0;
        (
            self.kcal * ratio,
            self.protein * ratio,
            self.carbs * ratio,
            self.fat * ratio,
            self.fiber * ratio,
        )
    }
}

pub struct IngredientEntityMapper {}

impl EntityMapper<Ingredient, Model, ActiveModel> for IngredientEntityMapper {
    fn build_active_model(d: Ingredient) -> ActiveModel {
        ActiveModel {
            id: match d.id {
                Some(id) => Set(id),
                None => NotSet,
            },
            uuid: match d.uuid {
                Some(uuid) => Set(string_to_bytes(&uuid)),
                None => NotSet,
            },
            tenant_id: Set(d.tenant_id),
            name: Set(d.name),
            kcal: Set(d.kcal),
            protein: Set(d.protein),
            carbs: Set(d.carbs),
            fat: Set(d.fat),
            fiber: Set(d.fiber),
            taco_id: Set(d.taco_id),
            moisture: Set(d.moisture),
            kj: Set(d.kj),
            cholesterol: Set(d.cholesterol),
            ash: Set(d.ash),
            calcium: Set(d.calcium),
            magnesium: Set(d.magnesium),
            manganese: Set(d.manganese),
            phosphorus: Set(d.phosphorus),
            iron: Set(d.iron),
            sodium: Set(d.sodium),
            potassium: Set(d.potassium),
            copper: Set(d.copper),
            zinc: Set(d.zinc),
            retinol: Set(d.retinol),
            re: Set(d.re),
            rae: Set(d.rae),
            thiamine: Set(d.thiamine),
            riboflavin: Set(d.riboflavin),
            pyridoxine: Set(d.pyridoxine),
            niacin: Set(d.niacin),
            vitamin_c: Set(d.vitamin_c),
            saturated_fat: Set(d.saturated_fat),
            monounsaturated_fat: Set(d.monounsaturated_fat),
            polyunsaturated_fat: Set(d.polyunsaturated_fat),
            created_at: NotSet,
            created_by: match d.created_by {
                Some(cb) => Set(Some(cb)),
                None => NotSet,
            },
            updated_at: NotSet,
            updated_by: match d.updated_by {
                Some(ub) => Set(Some(ub)),
                None => NotSet,
            },
        }
    }

    fn from_model(m: Model) -> Ingredient {
        Ingredient {
            id: Some(m.id),
            uuid: Some(bytes_para_string(m.uuid)),
            tenant_id: m.tenant_id,
            name: m.name,
            kcal: m.kcal,
            protein: m.protein,
            carbs: m.carbs,
            fat: m.fat,
            fiber: m.fiber,
            taco_id: m.taco_id,
            moisture: m.moisture,
            kj: m.kj,
            cholesterol: m.cholesterol,
            ash: m.ash,
            calcium: m.calcium,
            magnesium: m.magnesium,
            manganese: m.manganese,
            phosphorus: m.phosphorus,
            iron: m.iron,
            sodium: m.sodium,
            potassium: m.potassium,
            copper: m.copper,
            zinc: m.zinc,
            retinol: m.retinol,
            re: m.re,
            rae: m.rae,
            thiamine: m.thiamine,
            riboflavin: m.riboflavin,
            pyridoxine: m.pyridoxine,
            niacin: m.niacin,
            vitamin_c: m.vitamin_c,
            saturated_fat: m.saturated_fat,
            monounsaturated_fat: m.monounsaturated_fat,
            polyunsaturated_fat: m.polyunsaturated_fat,
            created_at: Some(m.created_at.naive_utc()),
            updated_at: Some(m.updated_at.naive_utc()),
            created_by: m.created_by,
            updated_by: m.updated_by,
        }
    }

    fn from_active_model(a: ActiveModel) -> Ingredient {
        let m = a.try_into_model().unwrap();
        Self::from_model(m)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ingredient(kcal: f64, protein: f64, carbs: f64, fat: f64, fiber: f64) -> Ingredient {
        Ingredient {
            id: None,
            uuid: None,
            tenant_id: None,
            name: "Test".to_string(),
            kcal,
            protein,
            carbs,
            fat,
            fiber,
            taco_id: None,
            moisture: None,
            kj: None,
            cholesterol: None,
            ash: None,
            calcium: None,
            magnesium: None,
            manganese: None,
            phosphorus: None,
            iron: None,
            sodium: None,
            potassium: None,
            copper: None,
            zinc: None,
            retinol: None,
            re: None,
            rae: None,
            thiamine: None,
            riboflavin: None,
            pyridoxine: None,
            niacin: None,
            vitamin_c: None,
            saturated_fat: None,
            monounsaturated_fat: None,
            polyunsaturated_fat: None,
            created_at: None,
            updated_at: None,
            created_by: None,
            updated_by: None,
        }
    }

    #[test]
    fn macros_for_quantity_scales_per_100g_values_by_grams_over_100() {
        // 100 kcal / 100g, 300g consumed => 300 kcal, not 30_000 kcal.
        let ing = ingredient(100.0, 8.0, 20.0, 1.0, 5.0);

        let (kcal, protein, carbs, fat, fiber) = ing.macros_for_quantity(300.0, 1.0);

        assert_eq!(kcal, 300.0);
        assert_eq!(protein, 24.0);
        assert_eq!(carbs, 60.0);
        assert_eq!(fat, 3.0);
        assert_eq!(fiber, 15.0);
    }

    #[test]
    fn macros_for_quantity_applies_unit_gram_multiplier_before_scaling() {
        // 1 Kg (multiplier 1000.0) of a 100 kcal/100g ingredient => 1000 kcal.
        let ing = ingredient(100.0, 8.0, 20.0, 1.0, 5.0);

        let (kcal, _, _, _, _) = ing.macros_for_quantity(1.0, 1000.0);

        assert_eq!(kcal, 1000.0);
    }
}
