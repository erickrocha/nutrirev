use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::{bytes_para_string, string_to_bytes};
use chrono::{NaiveDate, NaiveDateTime};
use entity::customer_entity::{ActiveModel, Model};
use sea_orm::{NotSet, Set, TryIntoModel};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Customer {
    pub id: Option<i32>,
    pub uuid: Option<String>,
    pub tenant_id: Option<i32>,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub date_of_birth: NaiveDate,
    pub gender: String,
    pub address_line1: Option<String>,
    pub address_line2: Option<String>,
    pub locality: Option<String>,
    pub administrative_area: Option<String>,
    pub postal_code: Option<String>,
    pub country_code: Option<String>,
    pub clinical_plan_id: Option<i32>,
    pub prepare_meal_id: Option<i32>,
    pub mobile_enabled: Option<bool>,
    pub photo: Option<String>,
    pub photo_base64: Option<Vec<u8>>,
    pub user_id: Option<i32>,
    /// CPF/CNPJ, digits only. Validated by `crate::domain::tax_id`.
    pub tax_id: Option<String>,
    pub provider_customer_id: Option<String>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
}

pub struct CustomerEntityMapper {}

impl EntityMapper<Customer, Model, ActiveModel> for CustomerEntityMapper {
    fn build_active_model(d: Customer) -> ActiveModel {
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
            email: Set(d.email),
            phone: Set(d.phone),
            date_of_birth: Set(d.date_of_birth),
            gender: Set(d.gender),
            address_line1: Set(d.address_line1),
            address_line2: Set(d.address_line2),
            locality: Set(d.locality),
            administrative_area: Set(d.administrative_area),
            postal_code: Set(d.postal_code),
            country_code: Set(d.country_code),
            clinical_plan_id: Set(d.clinical_plan_id),
            prepare_meal_id: Set(d.prepare_meal_id),
            mobile_enabled: match d.mobile_enabled {
                Some(me) => Set(me),
                None => Set(false),
            },
            photo: Set(d.photo),
            photo_base64: Set(d.photo_base64),
            user_id: Set(d.user_id),
            tax_id: Set(d.tax_id),
            provider_customer_id: Set(d.provider_customer_id),
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

    fn from_model(e: Model) -> Customer {
        Customer {
            id: Some(e.id),
            uuid: Some(bytes_para_string(e.uuid)),
            tenant_id: e.tenant_id,
            name: e.name,
            email: e.email,
            phone: e.phone,
            date_of_birth: e.date_of_birth,
            gender: e.gender,
            address_line1: e.address_line1,
            address_line2: e.address_line2,
            locality: e.locality,
            administrative_area: e.administrative_area,
            postal_code: e.postal_code,
            country_code: e.country_code,
            clinical_plan_id: e.clinical_plan_id,
            prepare_meal_id: e.prepare_meal_id,
            mobile_enabled: Some(e.mobile_enabled),
            photo: e.photo,
            photo_base64: e.photo_base64,
            user_id: e.user_id,
            tax_id: e.tax_id,
            provider_customer_id: e.provider_customer_id,
            created_by: e.created_by,
            updated_by: e.updated_by,
            created_at: Some(e.created_at.naive_utc()),
            updated_at: Some(e.updated_at.naive_utc()),
        }
    }

    fn from_active_model(mut e: ActiveModel) -> Customer {
        let model: Result<Model, _> = e.clone().try_into_model();
        match model {
            Ok(m) => Self::from_model(m),
            Err(_) => Customer {
                id: e.id.take(),
                uuid: e.uuid.take().map(bytes_para_string),
                tenant_id: e.tenant_id.take().flatten(),
                name: e.name.take().unwrap_or_default(),
                email: e.email.take().unwrap_or_default(),
                phone: e.phone.take().unwrap_or_default(),
                date_of_birth: e.date_of_birth.take().unwrap_or_default(),
                gender: e.gender.take().unwrap_or_default(),
                address_line1: e.address_line1.take().flatten(),
                address_line2: e.address_line2.take().flatten(),
                locality: e.locality.take().flatten(),
                administrative_area: e.administrative_area.take().flatten(),
                postal_code: e.postal_code.take().flatten(),
                country_code: e.country_code.take().flatten(),
                clinical_plan_id: e.clinical_plan_id.take().flatten(),
                prepare_meal_id: e.prepare_meal_id.take().flatten(),
                mobile_enabled: e.mobile_enabled.take(),
                photo: e.photo.take().flatten(),
                photo_base64: e.photo_base64.take().flatten(),
                user_id: e.user_id.take().flatten(),
                tax_id: e.tax_id.take().flatten(),
                provider_customer_id: e.provider_customer_id.take().flatten(),
                created_by: e.created_by.take().flatten(),
                updated_by: e.updated_by.take().flatten(),
                created_at: e.created_at.take().map(|dt| dt.naive_utc()),
                updated_at: e.updated_at.take().map(|dt| dt.naive_utc()),
            },
        }
    }
}
