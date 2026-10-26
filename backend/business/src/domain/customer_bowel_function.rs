use crate::commons::entity_mapper::EntityMapper;
use entity::customer_bowel_function_entity::{ActiveModel, Model};
use sea_orm::{Set, TryIntoModel};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CustomerBowelFunction {
    pub customer_id: i32,
    pub bowel_function_id: i32,
}

pub struct CustomerBowelFunctionEntityMapper {}

impl EntityMapper<CustomerBowelFunction, Model, ActiveModel> for CustomerBowelFunctionEntityMapper {
    fn build_active_model(d: CustomerBowelFunction) -> ActiveModel {
        ActiveModel {
            customer_id: Set(d.customer_id),
            bowel_function_id: Set(d.bowel_function_id),
        }
    }

    fn from_model(e: Model) -> CustomerBowelFunction {
        CustomerBowelFunction {
            customer_id: e.customer_id,
            bowel_function_id: e.bowel_function_id,
        }
    }

    fn from_active_model(mut e: ActiveModel) -> CustomerBowelFunction {
        let model: Result<Model, _> = e.clone().try_into_model();
        match model {
            Ok(m) => Self::from_model(m),
            Err(_) => CustomerBowelFunction {
                customer_id: e.customer_id.take().unwrap_or_default(),
                bowel_function_id: e.bowel_function_id.take().unwrap_or_default(),
            },
        }
    }
}
