use crate::commons::entity_mapper::EntityMapper;
use crate::commons::functions::string_to_bytes;
use crate::commons::gateway::{tenant_delete, tenant_or_global_select, Gateway};
use crate::domain::ingredient::{Ingredient, IngredientEntityMapper};
use entity::ingredient_entity;
use entity::prelude::IngredientEntity as IngredientQuery;
use sea_orm::prelude::async_trait::async_trait;
use crate::domain::ingredient_search::{contains_pattern, prefix_pattern, IngredientSearch, SearchLanguage};
use sea_orm::sea_query::Expr;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, DbConn, DbErr, DeleteResult, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect,
};

pub struct IngredientGateway {
    db: DbConn,
}

impl IngredientGateway {
    pub fn new(db: DbConn) -> Self {
        Self { db }
    }

    pub fn db(&self) -> &DbConn {
        &self.db
    }

    /// Busca paginada, sem acento e sem diferenciar maiúsculas, nos dois idiomas.
    /// Os itens que começam com a primeira palavra no idioma da interface vêm primeiro.
    pub async fn search(&self, search: &IngredientSearch) -> Result<(Vec<ingredient_entity::Model>, u64), DbErr> {
        let mut select = tenant_or_global_select(IngredientQuery::find(), ingredient_entity::Column::TenantId);
        for term in &search.terms {
            let pattern = contains_pattern(term);
            select = select.filter(
                Condition::any()
                    .add(Expr::cust_with_values("`name` LIKE ?", [pattern.clone()]))
                    .add(Expr::cust_with_values("`name_en` LIKE ?", [pattern])),
            );
        }
        let total = select.clone().count(&self.db).await?;

        let column = match search.language {
            SearchLanguage::Portuguese => "`name`",
            SearchLanguage::English => "COALESCE(`name_en`, `name`)",
        };
        if let Some(first) = search.terms.first() {
            select = select.order_by_asc(Expr::cust_with_values(
                format!("CASE WHEN {column} LIKE ? THEN 0 WHEN {column} LIKE ? THEN 1 ELSE 2 END"),
                [prefix_pattern(first), contains_pattern(first)],
            ));
        }
        let items = select
            .order_by_asc(Expr::cust(column))
            .order_by_asc(ingredient_entity::Column::Id)
            .limit(search.limit)
            .offset(search.offset)
            .all(&self.db)
            .await?;
        Ok((items, total))
    }

    pub async fn find_by_ids(&self, ids: &[i32]) -> Result<Vec<ingredient_entity::Model>, DbErr> {
        tenant_or_global_select(IngredientQuery::find(), ingredient_entity::Column::TenantId)
            .filter(ingredient_entity::Column::Id.is_in(ids.iter().copied()))
            .all(&self.db)
            .await
    }
}

#[async_trait]
impl Gateway<Ingredient, ingredient_entity::Model, ingredient_entity::ActiveModel> for IngredientGateway {
    async fn persist(&self, entity: Ingredient) -> Result<ingredient_entity::ActiveModel, DbErr> {
        let active_model = IngredientEntityMapper::build_active_model(entity);
        active_model.save(&self.db).await
    }

    async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tenant_delete(
            IngredientQuery::delete_many().filter(ingredient_entity::Column::Id.eq(id)),
            ingredient_entity::Column::TenantId,
        ).exec(&self.db).await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<ingredient_entity::Model>, DbErr> {
        tenant_or_global_select(IngredientQuery::find(), ingredient_entity::Column::TenantId)
            .filter(ingredient_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
    }

    async fn find_by_uuid(&self, uuid: String) -> Result<Option<ingredient_entity::Model>, DbErr> {
        tenant_or_global_select(IngredientQuery::find(), ingredient_entity::Column::TenantId)
            .filter(ingredient_entity::Column::Uuid.eq(string_to_bytes(&uuid)))
            .one(&self.db)
            .await
    }

    async fn find_all(&self) -> Result<Vec<ingredient_entity::Model>, DbErr> {
        tenant_or_global_select(IngredientQuery::find(), ingredient_entity::Column::TenantId).all(&self.db).await
    }
}
