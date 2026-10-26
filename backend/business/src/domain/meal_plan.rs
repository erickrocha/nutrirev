use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::{bytes_para_string, string_to_bytes};
use crate::domain::enums::{MealPlanCategory, MealPlanGenerationStatus};
use crate::domain::ingredient::Ingredient;
use chrono::NaiveDateTime;
use entity::meal_plan_entity::{ActiveModel, Model};
use sea_orm::{NotSet, Set, TryIntoModel};

#[derive(Debug, Clone, PartialEq)]
pub struct MealPlanMacros {
    pub kcal: f64,
    pub protein_g: f64,
    pub carbs_g: f64,
    pub carbs_pct: f64,
    pub lipids_g: f64,
    pub lipids_pct: f64,
    pub fiber_g: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct MealPlanItem {
    pub id: Option<i32>,
    pub ingredient_id: i32,
    pub ingredient: Option<Ingredient>,
    pub quantity: f64,
    pub unit: String,
    pub substitutes: Vec<Ingredient>,
    pub item_macros: Option<MealPlanMacros>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct MealPlanOption {
    pub id: Option<i32>,
    pub label: String,
    pub position: i32,
    pub items: Vec<MealPlanItem>,
    pub option_macros: Option<MealPlanMacros>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct MealPlanMeal {
    pub id: Option<i32>,
    pub meal_type: String,
    pub is_pre_workout: bool,
    pub is_post_workout: bool,
    pub nutritionist_note: Option<String>,
    pub position: i32,
    pub options: Vec<MealPlanOption>,
    pub meal_macros: Option<MealPlanMacros>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct MealPlan {
    pub id: Option<i32>,
    pub uuid: Option<String>,
    pub tenant_id: Option<i32>,
    pub name: String,
    pub category: MealPlanCategory,
    pub generation_status: MealPlanGenerationStatus,
    pub viewed: bool,
    pub is_favorite: bool,
    pub generated_at: Option<NaiveDateTime>,
    pub nutritionist_id: Option<i32>,
    pub patient_id: Option<i32>,
    pub meals: Vec<MealPlanMeal>,
    pub total_macros: Option<MealPlanMacros>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
}

pub struct MealPlanEntityMapper {}

impl EntityMapper<MealPlan, Model, ActiveModel> for MealPlanEntityMapper {
    fn build_active_model(d: MealPlan) -> ActiveModel {
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
            category: Set(d.category.to_string()),
            generation_status: Set(d.generation_status.to_string()),
            viewed: Set(d.viewed),
            is_favorite: Set(d.is_favorite),
            generated_at: Set(d.generated_at.map(|dt| dt.and_utc())),
            nutritionist_id: Set(d.nutritionist_id),
            patient_id: Set(d.patient_id),
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

    fn from_model(m: Model) -> MealPlan {
        MealPlan {
            id: Some(m.id),
            uuid: Some(bytes_para_string(m.uuid)),
            tenant_id: m.tenant_id,
            name: m.name,
            category: m.category.parse().unwrap_or_default(),
            generation_status: m.generation_status.parse().unwrap_or_default(),
            viewed: m.viewed,
            is_favorite: m.is_favorite,
            generated_at: m.generated_at.map(|dt| dt.naive_utc()),
            nutritionist_id: m.nutritionist_id,
            patient_id: m.patient_id,
            meals: Vec::new(),
            total_macros: None,
            created_at: Some(m.created_at.naive_utc()),
            updated_at: Some(m.updated_at.naive_utc()),
            created_by: m.created_by,
            updated_by: m.updated_by,
        }
    }

    fn from_active_model(a: ActiveModel) -> MealPlan {
        let m = a.try_into_model().unwrap();
        Self::from_model(m)
    }
}
