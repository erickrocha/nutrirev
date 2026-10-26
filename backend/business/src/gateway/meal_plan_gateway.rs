use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::meal_plan::{MealPlan, MealPlanEntityMapper};
use entity::meal_plan_entity;
use entity::prelude::MealPlanEntity as MealPlanQuery;
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter, Set};

pub struct MealPlanGateway {
    db: DbConn,
}

impl MealPlanGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }

    pub fn db(&self) -> &DbConn {
        &self.db
    }

    pub async fn toggle_favorite(&self, id: i32) -> Result<Option<meal_plan_entity::Model>, DbErr> {
        if let Some(model) = self.find_by_id(id).await? {
            let mut active: meal_plan_entity::ActiveModel = model.into();
            let current = active.is_favorite.take().unwrap_or(false);
            active.is_favorite = Set(!current);
            let updated = active.update(&self.db).await?;
            Ok(Some(updated))
        } else {
            Ok(None)
        }
    }

    pub async fn find_paginated(
        &self,
        page: u64,
        size: u64,
        search: Option<String>,
        category: Option<String>,
        patient_id: Option<i32>,
    ) -> Result<(Vec<meal_plan_entity::Model>, u64, u64), DbErr> {
        use sea_orm::{ExprTrait, PaginatorTrait, QueryOrder};

        let mut query = tenant_select(MealPlanQuery::find(), meal_plan_entity::Column::TenantId);

        if let Some(s) = search {
            if !s.trim().is_empty() {
                let pattern = format!("%{}%", s.trim());
                query = query.filter(
                    meal_plan_entity::Column::Name
                        .like(&pattern)
                        .or(meal_plan_entity::Column::Category.like(&pattern)),
                );
            }
        }

        if let Some(cat) = category {
            if !cat.trim().is_empty() {
                query = query.filter(meal_plan_entity::Column::Category.eq(cat));
            }
        }

        if let Some(pid) = patient_id {
            query = query.filter(meal_plan_entity::Column::PatientId.eq(pid));
        }

        let paginator = query
            .order_by_desc(meal_plan_entity::Column::Id)
            .paginate(&self.db, size);
        let total_elements = paginator.num_items().await?;
        let total_pages = paginator.num_pages().await?;
        let target_page = if page == 0 { 0 } else { page - 1 };
        let items = paginator.fetch_page(target_page).await?;

        Ok((items, total_elements, total_pages))
    }
}

#[async_trait]
impl Gateway<MealPlan, meal_plan_entity::Model, meal_plan_entity::ActiveModel> for MealPlanGateway {
    async fn persist(&self, entity: MealPlan) -> Result<meal_plan_entity::ActiveModel, DbErr> {
        let active_model = MealPlanEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            MealPlanQuery::delete_many().filter(meal_plan_entity::Column::Id.eq(id)),
            meal_plan_entity::Column::TenantId,
        ).exec(&self.db).await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<meal_plan_entity::Model>, DbErr> {
        tenant_select(MealPlanQuery::find(), meal_plan_entity::Column::TenantId)
            .filter(meal_plan_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<meal_plan_entity::Model>, DbErr> {
        tenant_select(MealPlanQuery::find(), meal_plan_entity::Column::TenantId)
            .filter(meal_plan_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<meal_plan_entity::Model>, DbErr> {
        tenant_select(MealPlanQuery::find(), meal_plan_entity::Column::TenantId).all(&self.db).await
    }
}
