use chrono::{DateTime, NaiveTime, Utc};
use entity::{daily_meal_entity, meal_point_tier_entity};
use sea_orm::{ActiveModelTrait, ColumnTrait, DbConn, DbErr, EntityTrait, NotSet, QueryFilter, Set};
use uuid::Uuid;

pub enum SaveMealPointTierError {
    InvalidDailyMeal,
    NotFound,
    Db(DbErr),
}

impl From<DbErr> for SaveMealPointTierError {
    fn from(e: DbErr) -> Self {
        SaveMealPointTierError::Db(e)
    }
}

pub struct MealPointTierRecord {
    pub id: i32,
    pub uuid: String,
    pub tenant_id: Option<i32>,
    pub daily_meal_id: i32,
    pub deadline_time: NaiveTime,
    pub points: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<meal_point_tier_entity::Model> for MealPointTierRecord {
    fn from(m: meal_point_tier_entity::Model) -> Self {
        MealPointTierRecord {
            id: m.id,
            uuid: Uuid::from_slice(&m.uuid).map(|u| u.to_string()).unwrap_or_default(),
            tenant_id: m.tenant_id,
            daily_meal_id: m.daily_meal_id,
            deadline_time: m.deadline_time,
            points: m.points,
            created_at: m.created_at,
            updated_at: m.updated_at,
        }
    }
}

pub struct MealPointTierUseCase;

impl MealPointTierUseCase {
    pub async fn create(
        db: &DbConn,
        tenant_id: Option<i32>,
        daily_meal_id: i32,
        deadline_time: NaiveTime,
        points: i32,
        created_by: String,
    ) -> Result<MealPointTierRecord, SaveMealPointTierError> {
        Self::ensure_daily_meal_exists(db, tenant_id, daily_meal_id).await?;

        let active = meal_point_tier_entity::ActiveModel {
            id: NotSet,
            uuid: NotSet,
            tenant_id: Set(tenant_id),
            daily_meal_id: Set(daily_meal_id),
            deadline_time: Set(deadline_time),
            points: Set(points),
            created_at: NotSet,
            created_by: Set(Some(created_by.clone())),
            updated_at: NotSet,
            updated_by: Set(Some(created_by)),
        };

        Ok(active.insert(db).await?.into())
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn update(
        db: &DbConn,
        id: i32,
        tenant_id: Option<i32>,
        daily_meal_id: i32,
        deadline_time: NaiveTime,
        points: i32,
        updated_by: String,
    ) -> Result<MealPointTierRecord, SaveMealPointTierError> {
        Self::ensure_daily_meal_exists(db, tenant_id, daily_meal_id).await?;

        let existing = meal_point_tier_entity::Entity::find_by_id(id)
            .one(db)
            .await?
            .ok_or(SaveMealPointTierError::NotFound)?;

        let mut active: meal_point_tier_entity::ActiveModel = existing.into();
        active.tenant_id = Set(tenant_id);
        active.daily_meal_id = Set(daily_meal_id);
        active.deadline_time = Set(deadline_time);
        active.points = Set(points);
        active.updated_by = Set(Some(updated_by));

        Ok(active.update(db).await?.into())
    }

    pub async fn find_by_id(db: &DbConn, id: i32) -> Result<Option<MealPointTierRecord>, DbErr> {
        Ok(meal_point_tier_entity::Entity::find_by_id(id).one(db).await?.map(Into::into))
    }

    pub async fn find_all(db: &DbConn) -> Result<Vec<MealPointTierRecord>, DbErr> {
        Ok(meal_point_tier_entity::Entity::find().all(db).await?.into_iter().map(Into::into).collect())
    }

    async fn ensure_daily_meal_exists(db: &DbConn, tenant_id: Option<i32>, daily_meal_id: i32) -> Result<(), SaveMealPointTierError> {
        let mut query = daily_meal_entity::Entity::find()
            .filter(daily_meal_entity::Column::Id.eq(daily_meal_id));
        if let Some(id) = tenant_id {
            query = query.filter(
                sea_orm::Condition::any()
                    .add(daily_meal_entity::Column::TenantId.eq(id))
                    .add(daily_meal_entity::Column::TenantId.is_null())
            );
        }
        let exists = query.one(db).await?;
        if exists.is_none() {
            return Err(SaveMealPointTierError::InvalidDailyMeal);
        }
        Ok(())
    }
}
