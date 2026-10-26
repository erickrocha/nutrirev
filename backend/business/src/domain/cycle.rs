use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::{bytes_para_string, string_to_bytes};
use chrono::NaiveDateTime;
use entity::cycle_entity::{ActiveModel, Model};
use sea_orm::{NotSet, Set, TryIntoModel};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Cycle {
    pub id: Option<i32>,
    pub uuid: Option<String>,
    pub tenant_id: Option<i32>,
    pub name: String,
    pub description: Option<String>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
}

pub struct CycleEntityMapper {}

impl EntityMapper<Cycle, Model, ActiveModel> for CycleEntityMapper {
    fn build_active_model(d: Cycle) -> ActiveModel {
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
            description: Set(d.description),
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

    fn from_model(m: Model) -> Cycle {
        Cycle {
            id: Some(m.id),
            uuid: Some(bytes_para_string(m.uuid)),
            tenant_id: m.tenant_id,
            name: m.name,
            description: m.description,
            created_at: Some(m.created_at.naive_utc()),
            updated_at: Some(m.updated_at.naive_utc()),
            created_by: m.created_by,
            updated_by: m.updated_by,
        }
    }

    fn from_active_model(a: ActiveModel) -> Cycle {
        let m = a.try_into_model().unwrap();
        Self::from_model(m)
    }
}
