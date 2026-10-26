use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_select, Gateway};
use crate::domain::eat::{Eat, EatEntityMapper};
use entity::{
    eat_biotype_entity, eat_entity, eat_meal_entity, eat_restriction_entity, eat_tag_entity,
};
use entity::prelude::{
    EatBiotypeEntity, EatEntity as EatQuery, EatMealEntity, EatRestrictionEntity, EatTagEntity,
};
use sea_orm::prelude::async_trait::async_trait;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbConn, DbErr, DeleteResult, EntityTrait, QueryFilter, Set,
};

pub struct EatGateway {
    db: DbConn,
}

impl EatGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }

    pub fn db(&self) -> &DbConn {
        &self.db
    }

    pub async fn increment_views(&self, id: i32) -> Result<(), DbErr> {
        if let Some(model) = self.find_by_id(id).await? {
            let mut active: eat_entity::ActiveModel = model.into();
            let current = active.views.take().unwrap_or(0);
            active.views = Set(current + 1);
            active.save(&self.db).await?;
        }
        Ok(())
    }

    pub async fn increment_additions(&self, id: i32) -> Result<(), DbErr> {
        if let Some(model) = self.find_by_id(id).await? {
            let mut active: eat_entity::ActiveModel = model.into();
            let current = active.additions.take().unwrap_or(0);
            active.additions = Set(current + 1);
            active.save(&self.db).await?;
        }
        Ok(())
    }

    pub async fn find_paginated(
        &self,
        page: u64,
        size: u64,
        search: Option<String>,
        recommended_period: Option<String>,
        is_highlight: Option<bool>,
    ) -> Result<(Vec<eat_entity::Model>, u64, u64), DbErr> {
        use sea_orm::{ExprTrait, PaginatorTrait, QueryOrder};

        let mut query = tenant_select(EatQuery::find(), eat_entity::Column::TenantId);

        if let Some(s) = search {
            if !s.trim().is_empty() {
                let pattern = format!("%{}%", s.trim());
                query = query.filter(
                    eat_entity::Column::Name
                        .like(&pattern)
                        .or(eat_entity::Column::Description.like(&pattern)),
                );
            }
        }

        if let Some(period) = recommended_period {
            if !period.trim().is_empty() {
                query = query.filter(eat_entity::Column::RecommendedPeriod.eq(period));
            }
        }

        if let Some(highlight) = is_highlight {
            query = query.filter(eat_entity::Column::IsHighlight.eq(highlight));
        }

        let paginator = query
            .order_by_desc(eat_entity::Column::Id)
            .paginate(&self.db, size);
        let total_elements = paginator.num_items().await?;
        let total_pages = paginator.num_pages().await?;
        let target_page = if page == 0 { 0 } else { page - 1 };
        let items = paginator.fetch_page(target_page).await?;

        Ok((items, total_elements, total_pages))
    }

    // Helper functions for options / master data (Restrictions, Tags, Meals, Biotypes)
    pub async fn find_or_create_restriction(&self, name: &str) -> Result<eat_restriction_entity::Model, DbErr> {
        if let Some(existing) = EatRestrictionEntity::find()
            .filter(eat_restriction_entity::Column::Name.eq(name))
            .one(&self.db)
            .await?
        {
            Ok(existing)
        } else {
            let active = eat_restriction_entity::ActiveModel {
                id: sea_orm::ActiveValue::NotSet,
                name: Set(name.to_string()),
            };
            active.insert(&self.db).await
        }
    }

    pub async fn find_or_create_tag(&self, name: &str) -> Result<eat_tag_entity::Model, DbErr> {
        if let Some(existing) = EatTagEntity::find()
            .filter(eat_tag_entity::Column::Name.eq(name))
            .one(&self.db)
            .await?
        {
            Ok(existing)
        } else {
            let active = eat_tag_entity::ActiveModel {
                id: sea_orm::ActiveValue::NotSet,
                name: Set(name.to_string()),
            };
            active.insert(&self.db).await
        }
    }

    pub async fn find_or_create_meal(&self, name: &str) -> Result<eat_meal_entity::Model, DbErr> {
        if let Some(existing) = EatMealEntity::find()
            .filter(eat_meal_entity::Column::Name.eq(name))
            .one(&self.db)
            .await?
        {
            Ok(existing)
        } else {
            let active = eat_meal_entity::ActiveModel {
                id: sea_orm::ActiveValue::NotSet,
                name: Set(name.to_string()),
            };
            active.insert(&self.db).await
        }
    }

    pub async fn find_or_create_biotype(&self, name: &str) -> Result<eat_biotype_entity::Model, DbErr> {
        if let Some(existing) = EatBiotypeEntity::find()
            .filter(eat_biotype_entity::Column::Name.eq(name))
            .one(&self.db)
            .await?
        {
            Ok(existing)
        } else {
            let active = eat_biotype_entity::ActiveModel {
                id: sea_orm::ActiveValue::NotSet,
                name: Set(name.to_string()),
            };
            active.insert(&self.db).await
        }
    }
}

#[async_trait]
impl Gateway<Eat, eat_entity::Model, eat_entity::ActiveModel> for EatGateway {
    async fn persist(&self, entity: Eat) -> Result<eat_entity::ActiveModel, DbErr> {
        let active_model = EatEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            EatQuery::delete_many().filter(eat_entity::Column::Id.eq(id)),
            eat_entity::Column::TenantId,
        ).exec(&self.db).await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<eat_entity::Model>, DbErr> {
        tenant_select(EatQuery::find(), eat_entity::Column::TenantId)
            .filter(eat_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<eat_entity::Model>, DbErr> {
        tenant_select(EatQuery::find(), eat_entity::Column::TenantId)
            .filter(eat_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<eat_entity::Model>, DbErr> {
        tenant_select(EatQuery::find(), eat_entity::Column::TenantId).all(&self.db).await
    }
}
