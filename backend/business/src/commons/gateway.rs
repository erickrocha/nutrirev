use sea_orm::{ColumnTrait, DbErr, DeleteMany, DeleteResult, EntityTrait, QueryFilter, Select};
use sea_orm::sea_query::Expr;
use sea_orm::prelude::async_trait::async_trait;

#[async_trait]
pub trait Gateway<D, M, AM> {
	async fn persist(&self, domain: D) -> Result<AM, DbErr>;
	async fn delete_by_id(&self, id: i32) -> Result<DeleteResult, DbErr>;
	async fn find_by_id(&self, id: i32) -> Result<Option<M>, DbErr>;
	async fn find_by_uuid(&self, uuid: String) -> Result<Option<M>, DbErr>;
	async fn find_all(&self) -> Result<Vec<M>, DbErr>;
}

pub fn tenant_select<E, C>(query: Select<E>, tenant_column: C) -> Select<E>
where
    E: EntityTrait,
    C: ColumnTrait,
{
    match entity::audit::tenant_scope() {
        entity::audit::TenantScope::Unrestricted => query,
        entity::audit::TenantScope::Tenant(id) => query.filter(tenant_column.eq(id)),
        entity::audit::TenantScope::Denied => query.filter(Expr::cust("1 = 0")),
    }
}

pub fn tenant_delete<E, C>(query: DeleteMany<E>, tenant_column: C) -> DeleteMany<E>
where
    E: EntityTrait,
    C: ColumnTrait,
{
    match entity::audit::tenant_scope() {
        entity::audit::TenantScope::Unrestricted => query,
        entity::audit::TenantScope::Tenant(id) => query.filter(tenant_column.eq(id)),
        entity::audit::TenantScope::Denied => query.filter(Expr::cust("1 = 0")),
    }
}

pub async fn visible_customer_ids(db: &sea_orm::DbConn) -> Result<Vec<i32>, DbErr> {
    use entity::customer_entity;
    let rows = tenant_select(
        customer_entity::Entity::find(),
        customer_entity::Column::TenantId,
    )
    .all(db)
    .await?;
    Ok(rows.into_iter().map(|row| row.id).collect())
}

pub async fn customer_is_visible(db: &sea_orm::DbConn, customer_id: i32) -> Result<bool, DbErr> {
    Ok(visible_customer_ids(db).await?.contains(&customer_id))
}
