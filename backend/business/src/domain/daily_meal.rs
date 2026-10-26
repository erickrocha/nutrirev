use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::{bytes_para_string, string_to_bytes};
use chrono::NaiveDateTime;
use entity::daily_meal_entity::{ActiveModel, Model};
use sea_orm::{NotSet, Set, TryIntoModel};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DailyMeal {
    pub id: Option<i32>,
    pub uuid: Option<String>,
    pub tenant_id: Option<i32>,
    pub name: String,
    pub code: Option<String>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
}

pub struct DailyMealEntityMapper {}

impl EntityMapper<DailyMeal, Model, ActiveModel> for DailyMealEntityMapper {
    fn build_active_model(d: DailyMeal) -> ActiveModel {
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
            code: Set(d.code),
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

    fn from_model(e: Model) -> DailyMeal {
        DailyMeal {
            id: Some(e.id),
            uuid: Some(bytes_para_string(e.uuid)),
            tenant_id: e.tenant_id,
            name: e.name,
            code: e.code,
            created_by: e.created_by,
            updated_by: e.updated_by,
            created_at: Some(e.created_at.naive_utc()),
            updated_at: Some(e.updated_at.naive_utc()),
        }
    }

    fn from_active_model(mut e: ActiveModel) -> DailyMeal {
        let model: Result<Model, _> = e.clone().try_into_model();
        match model {
            Ok(m) => Self::from_model(m),
            Err(_) => DailyMeal {
                id: e.id.take(),
                uuid: e.uuid.take().map(bytes_para_string),
                tenant_id: e.tenant_id.take().flatten(),
                name: e.name.take().unwrap_or_default(),
                code: e.code.take().flatten(),
                created_by: e.created_by.take().flatten(),
                updated_by: e.updated_by.take().flatten(),
                created_at: e.created_at.take().map(|dt| dt.naive_utc()),
                updated_at: e.updated_at.take().map(|dt| dt.naive_utc()),
            },
        }
    }
}
