use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::{bytes_para_string, string_to_bytes};
use chrono::NaiveDateTime;
use entity::customer_goal_setting_entity::{ActiveModel, Model};
use sea_orm::{NotSet, Set, TryIntoModel};

#[derive(Debug, Clone, PartialEq)]
pub struct CustomerGoalSetting {
    pub id: Option<i32>,
    pub uuid: Option<String>,
    pub tenant_id: Option<i32>,
    pub customer_id: Option<i32>,
    pub name: String,
    pub formula_id: Option<i32>,
    pub activity_factor_id: Option<i32>,
    pub objective_id: Option<i32>,
    pub physical_activity_level_id: Option<i32>,
    pub height: Option<f64>,
    pub actual_weight: Option<f64>,
    pub desired_weight: Option<f64>,
    pub carbohydrate: Option<f64>,
    pub lipids: Option<f64>,
    pub protein: Option<f64>,
    pub customer_caloric_goal: Option<f64>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
}

pub struct CustomerGoalSettingEntityMapper {}

impl EntityMapper<CustomerGoalSetting, Model, ActiveModel> for CustomerGoalSettingEntityMapper {
    fn build_active_model(d: CustomerGoalSetting) -> ActiveModel {
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
            customer_id: Set(d.customer_id),
            name: Set(d.name),
            formula_id: Set(d.formula_id),
            activity_factor_id: Set(d.activity_factor_id),
            objective_id: Set(d.objective_id),
            physical_activity_level_id: Set(d.physical_activity_level_id),
            height: Set(d.height),
            actual_weight: Set(d.actual_weight),
            desired_weight: Set(d.desired_weight),
            carbohydrate: Set(d.carbohydrate),
            lipids: Set(d.lipids),
            protein: Set(d.protein),
            customer_caloric_goal: Set(d.customer_caloric_goal),
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

    fn from_model(e: Model) -> CustomerGoalSetting {
        CustomerGoalSetting {
            id: Some(e.id),
            uuid: Some(bytes_para_string(e.uuid)),
            tenant_id: e.tenant_id,
            customer_id: e.customer_id,
            name: e.name,
            formula_id: e.formula_id,
            activity_factor_id: e.activity_factor_id,
            objective_id: e.objective_id,
            physical_activity_level_id: e.physical_activity_level_id,
            height: e.height,
            actual_weight: e.actual_weight,
            desired_weight: e.desired_weight,
            carbohydrate: e.carbohydrate,
            lipids: e.lipids,
            protein: e.protein,
            customer_caloric_goal: e.customer_caloric_goal,
            created_by: e.created_by,
            updated_by: e.updated_by,
            created_at: Some(e.created_at.naive_utc()),
            updated_at: Some(e.updated_at.naive_utc()),
        }
    }

    fn from_active_model(mut e: ActiveModel) -> CustomerGoalSetting {
        let model: Result<Model, _> = e.clone().try_into_model();
        match model {
            Ok(m) => Self::from_model(m),
            Err(_) => CustomerGoalSetting {
                id: e.id.take(),
                uuid: e.uuid.take().map(bytes_para_string),
                tenant_id: e.tenant_id.take().flatten(),
                customer_id: e.customer_id.take().flatten(),
                name: e.name.take().unwrap_or_default(),
                formula_id: e.formula_id.take().flatten(),
                activity_factor_id: e.activity_factor_id.take().flatten(),
                objective_id: e.objective_id.take().flatten(),
                physical_activity_level_id: e.physical_activity_level_id.take().flatten(),
                height: e.height.take().flatten(),
                actual_weight: e.actual_weight.take().flatten(),
                desired_weight: e.desired_weight.take().flatten(),
                carbohydrate: e.carbohydrate.take().flatten(),
                lipids: e.lipids.take().flatten(),
                protein: e.protein.take().flatten(),
                customer_caloric_goal: e.customer_caloric_goal.take().flatten(),
                created_by: e.created_by.take().flatten(),
                updated_by: e.updated_by.take().flatten(),
                created_at: e.created_at.take().map(|dt| dt.naive_utc()),
                updated_at: e.updated_at.take().map(|dt| dt.naive_utc()),
            },
        }
    }
}
