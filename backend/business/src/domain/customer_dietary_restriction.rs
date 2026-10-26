use crate::commons::entity_mapper::EntityMapper;
use entity::customer_dietary_restriction_entity::{ActiveModel, Model};
use sea_orm::{Set, TryIntoModel};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CustomerDietaryRestriction {
    pub customer_id: i32,
    pub dietary_restriction_id: i32,
}

pub struct CustomerDietaryRestrictionEntityMapper {}

impl EntityMapper<CustomerDietaryRestriction, Model, ActiveModel> for CustomerDietaryRestrictionEntityMapper {
    fn build_active_model(d: CustomerDietaryRestriction) -> ActiveModel {
        ActiveModel {
            customer_id: Set(d.customer_id),
            dietary_restriction_id: Set(d.dietary_restriction_id),
        }
    }

    fn from_model(e: Model) -> CustomerDietaryRestriction {
        CustomerDietaryRestriction {
            customer_id: e.customer_id,
            dietary_restriction_id: e.dietary_restriction_id,
        }
    }

    fn from_active_model(mut e: ActiveModel) -> CustomerDietaryRestriction {
        let model: Result<Model, _> = e.clone().try_into_model();
        match model {
            Ok(m) => Self::from_model(m),
            Err(_) => CustomerDietaryRestriction {
                customer_id: e.customer_id.take().unwrap_or_default(),
                dietary_restriction_id: e.dietary_restriction_id.take().unwrap_or_default(),
            },
        }
    }
}
