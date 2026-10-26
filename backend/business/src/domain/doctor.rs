use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::{bytes_para_string, string_to_bytes};
use chrono::{NaiveDate, NaiveDateTime};
use entity::doctor_entity::{ActiveModel, Model};
use sea_orm::{NotSet, Set, TryIntoModel};

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct Doctor {
    pub id: Option<i32>,
    pub uuid: Option<String>,
    pub tenant_id: Option<i32>,
    pub name: String,
    pub document: Option<String>,
    pub date_of_birth: Option<NaiveDate>,
    pub photo_base64: Option<Vec<u8>>,
    pub city: Option<String>,
    pub province: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub created_at: Option<NaiveDateTime>,
    pub created_by: Option<String>,
    pub updated_at: Option<NaiveDateTime>,
    pub updated_by: Option<String>,
}

pub struct DoctorEntityMapper {}

impl EntityMapper<Doctor, Model, ActiveModel> for DoctorEntityMapper {
    fn build_active_model(d: Doctor) -> ActiveModel {
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
            document: Set(d.document),
            date_of_birth: Set(d.date_of_birth),
            photo_base64: Set(d.photo_base64),
            city: Set(d.city),
            province: Set(d.province),
            email: Set(d.email),
            phone: Set(d.phone),
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

    fn from_model(e: Model) -> Doctor {
        Doctor {
            id: Some(e.id),
            uuid: Some(bytes_para_string(e.uuid)),
            tenant_id: e.tenant_id,
            name: e.name,
            document: e.document,
            date_of_birth: e.date_of_birth,
            photo_base64: e.photo_base64,
            city: e.city,
            province: e.province,
            email: e.email,
            phone: e.phone,
            created_by: e.created_by,
            updated_by: e.updated_by,
            created_at: Some(e.created_at.naive_utc()),
            updated_at: Some(e.updated_at.naive_utc()),
        }
    }

    fn from_active_model(mut e: ActiveModel) -> Doctor {
        let model: Result<Model, _> = e.clone().try_into_model();
        match model {
            Ok(m) => Self::from_model(m),
            Err(_) => Doctor {
                id: e.id.take(),
                uuid: e.uuid.take().map(bytes_para_string),
                tenant_id: e.tenant_id.take().flatten(),
                name: e.name.take().unwrap_or_default(),
                document: e.document.take().flatten(),
                date_of_birth: e.date_of_birth.take().flatten(),
                photo_base64: e.photo_base64.take().flatten(),
                city: e.city.take().flatten(),
                province: e.province.take().flatten(),
                email: e.email.take().flatten(),
                phone: e.phone.take().flatten(),
                created_at: e.created_at.take().map(|dt| dt.naive_utc()),
                created_by: e.created_by.take().flatten(),
                updated_at: e.updated_at.take().map(|dt| dt.naive_utc()),
                updated_by: e.updated_by.take().flatten(),
            },
        }
    }
}
