use crate::commons::entity_mapper::EntityMapper;
use entity::customer_pre_existing_conditions_entity::{ActiveModel, Model};
use sea_orm::{Set, TryIntoModel};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CustomerPreExistingConditions {
    pub customer_id: i32,
    pub pre_existing_conditions_id: i32,
}

pub struct CustomerPreExistingConditionsEntityMapper {}

impl EntityMapper<CustomerPreExistingConditions, Model, ActiveModel> for CustomerPreExistingConditionsEntityMapper {
    fn build_active_model(d: CustomerPreExistingConditions) -> ActiveModel {
        ActiveModel {
            customer_id: Set(d.customer_id),
            pre_existing_conditions_id: Set(d.pre_existing_conditions_id),
        }
    }

    fn from_model(e: Model) -> CustomerPreExistingConditions {
        CustomerPreExistingConditions {
            customer_id: e.customer_id,
            pre_existing_conditions_id: e.pre_existing_conditions_id,
        }
    }

    fn from_active_model(mut e: ActiveModel) -> CustomerPreExistingConditions {
        let model: Result<Model, _> = e.clone().try_into_model();
        match model {
            Ok(m) => Self::from_model(m),
            Err(_) => CustomerPreExistingConditions {
                customer_id: e.customer_id.take().unwrap_or_default(),
                pre_existing_conditions_id: e.pre_existing_conditions_id.take().unwrap_or_default(),
            },
        }
    }
}
