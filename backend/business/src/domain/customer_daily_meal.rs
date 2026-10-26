use crate::commons::entity_mapper::EntityMapper;
use entity::customer_daily_meal_entity::{ActiveModel, Model};
use sea_orm::{Set, TryIntoModel};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CustomerDailyMeal {
    pub customer_id: i32,
    pub daily_meal_id: i32,
}

pub struct CustomerDailyMealEntityMapper {}

impl EntityMapper<CustomerDailyMeal, Model, ActiveModel> for CustomerDailyMealEntityMapper {
    fn build_active_model(d: CustomerDailyMeal) -> ActiveModel {
        ActiveModel {
            customer_id: Set(d.customer_id),
            daily_meal_id: Set(d.daily_meal_id),
        }
    }

    fn from_model(e: Model) -> CustomerDailyMeal {
        CustomerDailyMeal {
            customer_id: e.customer_id,
            daily_meal_id: e.daily_meal_id,
        }
    }

    fn from_active_model(mut e: ActiveModel) -> CustomerDailyMeal {
        let model: Result<Model, _> = e.clone().try_into_model();
        match model {
            Ok(m) => Self::from_model(m),
            Err(_) => CustomerDailyMeal {
                customer_id: e.customer_id.take().unwrap_or_default(),
                daily_meal_id: e.daily_meal_id.take().unwrap_or_default(),
            },
        }
    }
}
