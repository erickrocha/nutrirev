use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::{bytes_para_string, string_to_bytes};
use crate::domain::ingredient::Ingredient;
use chrono::NaiveDateTime;
use entity::eat_entity::{ActiveModel, Model};
use sea_orm::{NotSet, Set, TryIntoModel};

#[derive(Debug, Clone, PartialEq)]
pub struct MacrosTotal {
    pub kcal: f64,
    pub protein_g: f64,
    pub carbs_g: f64,
    pub fat_g: f64,
    pub fiber_g: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct EatDirection {
    pub id: Option<i32>,
    pub step_number: i32,
    pub description: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct EatIngredient {
    pub id: Option<i32>,
    pub ingredient_id: i32,
    pub ingredient: Option<Ingredient>,
    pub quantity: f64,
    pub unit: String,
    pub substitutes: Vec<Ingredient>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EatRestriction {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EatTag {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EatMeal {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EatBiotype {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Eat {
    pub id: Option<i32>,
    pub uuid: Option<String>,
    pub tenant_id: Option<i32>,
    pub name: String,
    pub photo: Option<String>,
    pub photo_base64: Option<Vec<u8>>,
    pub video_url: Option<String>,
    pub price: Option<f64>,
    pub time: Option<i32>,
    pub portion: Option<i32>,
    pub description: Option<String>,
    pub recommended_period: Option<String>,
    pub recommended_days: Option<String>,
    pub recommended_message: Option<String>,
    pub views: i32,
    pub additions: i32,
    pub is_highlight: bool,
    pub cycle_id: Option<i32>,
    pub directions: Vec<EatDirection>,
    pub ingredients: Vec<EatIngredient>,
    pub restrictions: Vec<EatRestriction>,
    pub tags: Vec<EatTag>,
    pub meals: Vec<EatMeal>,
    pub biotypes: Vec<EatBiotype>,
    pub side_dishes: Vec<Eat>,
    pub total_macros: Option<MacrosTotal>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
}

pub struct EatEntityMapper {}

impl EntityMapper<Eat, Model, ActiveModel> for EatEntityMapper {
    fn build_active_model(d: Eat) -> ActiveModel {
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
            photo: Set(d.photo),
            photo_base64: Set(d.photo_base64),
            video_url: Set(d.video_url),
            price: Set(d.price),
            time: Set(d.time),
            portion: Set(d.portion),
            description: Set(d.description),
            recommended_period: Set(d.recommended_period),
            recommended_days: Set(d.recommended_days),
            recommended_message: Set(d.recommended_message),
            views: Set(d.views),
            additions: Set(d.additions),
            is_highlight: Set(d.is_highlight),
            cycle_id: Set(d.cycle_id),
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

    fn from_model(m: Model) -> Eat {
        Eat {
            id: Some(m.id),
            uuid: Some(bytes_para_string(m.uuid)),
            tenant_id: m.tenant_id,
            name: m.name,
            photo: m.photo,
            photo_base64: m.photo_base64,
            video_url: m.video_url,
            price: m.price,
            time: m.time,
            portion: m.portion,
            description: m.description,
            recommended_period: m.recommended_period,
            recommended_days: m.recommended_days,
            recommended_message: m.recommended_message,
            views: m.views,
            additions: m.additions,
            is_highlight: m.is_highlight,
            cycle_id: m.cycle_id,
            directions: Vec::new(),
            ingredients: Vec::new(),
            restrictions: Vec::new(),
            tags: Vec::new(),
            meals: Vec::new(),
            biotypes: Vec::new(),
            side_dishes: Vec::new(),
            total_macros: None,
            created_at: Some(m.created_at.naive_utc()),
            updated_at: Some(m.updated_at.naive_utc()),
            created_by: m.created_by,
            updated_by: m.updated_by,
        }
    }

    fn from_active_model(a: ActiveModel) -> Eat {
        let m = a.try_into_model().unwrap();
        Self::from_model(m)
    }
}
