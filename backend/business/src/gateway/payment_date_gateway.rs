use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::payment_date::{PaymentDate, PaymentDateEntityMapper};
use entity::payment_date_entity::{self, ActiveModel, Model};
use entity::prelude::PaymentDateEntity as PaymentDateQuery;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter, QueryOrder,
};

pub struct PaymentDateGateway {
    db: DbConn,
}

impl PaymentDateGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }

    pub async fn find_active_by_customer_and_plan(
        &self,
        tenant_id: Option<i32>,
        customer_id: i32,
        clinical_plan_id: i32,
    ) -> Result<Option<Model>, DbErr> {
        let mut query = tenant_select(PaymentDateQuery::find(), payment_date_entity::Column::TenantId)
            .filter(payment_date_entity::Column::CustomerId.eq(customer_id))
            .filter(payment_date_entity::Column::ClinicalPlanId.eq(clinical_plan_id))
            .filter(payment_date_entity::Column::IsActive.eq(true));

        if let Some(tid) = tenant_id {
            query = query.filter(payment_date_entity::Column::TenantId.eq(tid));
        }

        query.one(&self.db).await
    }

    /// Tenant-scoped listing, optionally narrowed to one customer.
    pub async fn find_all_for_customer(
        &self,
        customer_id: Option<i32>,
    ) -> Result<Vec<Model>, DbErr> {
        let mut query =
            tenant_select(PaymentDateQuery::find(), payment_date_entity::Column::TenantId);
        if let Some(id) = customer_id {
            query = query.filter(payment_date_entity::Column::CustomerId.eq(id));
        }
        query
            .order_by_desc(payment_date_entity::Column::Id)
            .all(&self.db)
            .await
    }

    pub fn db(&self) -> &DbConn {
        &self.db
    }
}

#[async_trait]
impl Gateway<PaymentDate, Model, ActiveModel> for PaymentDateGateway {
    async fn persist(&self, entity: PaymentDate) -> Result<ActiveModel, DbErr> {
        let active_model = PaymentDateEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            PaymentDateQuery::delete_many().filter(payment_date_entity::Column::Id.eq(id)),
            payment_date_entity::Column::TenantId,
        )
            .exec(&self.db)
            .await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<Model>, DbErr> {
        tenant_select(PaymentDateQuery::find(), payment_date_entity::Column::TenantId)
            .filter(payment_date_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<Model>, DbErr> {
        tenant_select(PaymentDateQuery::find(), payment_date_entity::Column::TenantId)
            .filter(payment_date_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<Model>, DbErr> {
        tenant_select(PaymentDateQuery::find(), payment_date_entity::Column::TenantId).all(&self.db).await
    }
}
