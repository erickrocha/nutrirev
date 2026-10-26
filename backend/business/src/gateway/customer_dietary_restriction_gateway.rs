use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::{customer_is_visible, tenant_select, visible_customer_ids};
use entity::dietary_restriction_entity;
use crate::domain::customer_dietary_restriction::{CustomerDietaryRestriction, CustomerDietaryRestrictionEntityMapper};
use entity::customer_dietary_restriction_entity;
use entity::prelude::CustomerDietaryRestrictionEntity as CustomerDietaryRestrictionQuery;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter};

pub struct CustomerDietaryRestrictionGateway {
    db: DbConn,
}

impl CustomerDietaryRestrictionGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }

    pub async fn persist(&self, entity: CustomerDietaryRestriction) -> Result<customer_dietary_restriction_entity::ActiveModel, DbErr> {
        if !customer_is_visible(&self.db, entity.customer_id).await? {
            return Err(DbErr::Custom("Customer not found for tenant".to_string()));
        }
        if tenant_select(dietary_restriction_entity::Entity::find(), dietary_restriction_entity::Column::TenantId)
            .filter(dietary_restriction_entity::Column::Id.eq(entity.dietary_restriction_id)).one(&self.db).await?.is_none() {
            return Err(DbErr::Custom("Dietary restriction not found for tenant".to_string()));
        }
        let active_model = CustomerDietaryRestrictionEntityMapper::build_active_model(entity);
        let model = active_model.insert(&self.db).await?;
        Ok(CustomerDietaryRestrictionEntityMapper::build_active_model(
            CustomerDietaryRestrictionEntityMapper::from_model(model),
        ))
    }

    pub async fn find_by_customer_id(&self, customer_id: i32) -> Result<Vec<customer_dietary_restriction_entity::Model>, DbErr> {
        if !customer_is_visible(&self.db, customer_id).await? {
            return Ok(Vec::new());
        }
        CustomerDietaryRestrictionQuery::find()
            .filter(customer_dietary_restriction_entity::Column::CustomerId.eq(customer_id))
            .all(&self.db)
            .await
    }

    pub async fn find_all(&self) -> Result<Vec<customer_dietary_restriction_entity::Model>, DbErr> {
        let customer_ids = visible_customer_ids(&self.db).await?;
        CustomerDietaryRestrictionQuery::find()
            .filter(customer_dietary_restriction_entity::Column::CustomerId.is_in(customer_ids))
            .all(&self.db)
            .await
    }

    pub async fn delete_by_customer_and_restriction(&self, customer_id: i32, dietary_restriction_id: i32) -> Result<DeleteResult, DbErr> {
        if !customer_is_visible(&self.db, customer_id).await? { return Err(DbErr::Custom("Customer not found for tenant".to_string())); }
        CustomerDietaryRestrictionQuery::delete_many()
            .filter(customer_dietary_restriction_entity::Column::CustomerId.eq(customer_id))
            .filter(customer_dietary_restriction_entity::Column::DietaryRestrictionId.eq(dietary_restriction_id))
            .exec(&self.db)
            .await
    }
}
