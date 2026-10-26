use std::str::FromStr;
use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::domain::business_error::BusinessError;
use crate::domain::enums::MeasurementUnit;
use crate::domain::eat::{Eat, EatEntityMapper, MacrosTotal};
use crate::gateway::eat_gateway::EatGateway;
use crate::gateway::ingredient_gateway::IngredientGateway;
use crate::use_cases::image_storage_use_case::ImageStorageUseCase;

use entity::{
    eat_biotype_relation_entity, eat_direction_entity, eat_ingredient_entity,
    eat_ingredient_substitute_entity, eat_meal_relation_entity, eat_restriction_relation_entity,
    eat_side_dish_entity, eat_tag_relation_entity,
};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};

pub struct EatUseCase {
    gateway: EatGateway,
}

impl EatUseCase {
    pub fn new(gateway: EatGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(
        &self,
        mut entity: Eat,
        ingredient_gateway: &IngredientGateway,
    ) -> Result<Eat, BusinessError> {
        log::info!("[EatUseCase::create] Executing create recipe for name: {}", entity.name);
        if entity.name.trim().is_empty() {
            let msg = "Eat recipe name is required".to_string();
            log::error!("[EatUseCase::create] {}", msg);
            return Err(BusinessError::new(msg));
        }
        self.validate_tenant_references(&entity, ingredient_gateway).await?;
        entity.id = None;
        let active = self
            .gateway
            .persist(entity.clone())
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[EatUseCase::create] {}", msg);
                BusinessError::new(msg)
            })?;
        let eat_id = active.id.clone().unwrap();

        // 1. Save Directions
        for dir in &entity.directions {
            let active_dir = eat_direction_entity::ActiveModel {
                id: sea_orm::ActiveValue::NotSet,
                eat_id: Set(eat_id),
                step_number: Set(dir.step_number),
                description: Set(dir.description.clone()),
            };
            let _ = active_dir.insert(self.gateway.db()).await;
        }

        // 2. Save Ingredients & Substitutes
        for ing in &entity.ingredients {
            let active_ing = eat_ingredient_entity::ActiveModel {
                id: sea_orm::ActiveValue::NotSet,
                eat_id: Set(eat_id),
                ingredient_id: Set(ing.ingredient_id),
                quantity: Set(ing.quantity),
                unit: Set(ing.unit.clone()),
            };
            if let Ok(saved_ing) = active_ing.insert(self.gateway.db()).await {
                for sub in &ing.substitutes {
                    if let Some(sub_id) = sub.id {
                        let active_sub = eat_ingredient_substitute_entity::ActiveModel {
                            eat_ingredient_id: Set(saved_ing.id),
                            substitute_ingredient_id: Set(sub_id),
                        };
                        let _ = active_sub.insert(self.gateway.db()).await;
                    }
                }
            }
        }

        // 3. Save Restrictions
        for r in &entity.restrictions {
            let master = self.gateway.find_or_create_restriction(&r.name).await.map_err(|e| BusinessError::new(format!("{}", e)))?;
            let rel = eat_restriction_relation_entity::ActiveModel {
                eat_id: Set(eat_id),
                restriction_id: Set(master.id),
            };
            let _ = rel.insert(self.gateway.db()).await;
        }

        // 4. Save Tags
        for t in &entity.tags {
            let master = self.gateway.find_or_create_tag(&t.name).await.map_err(|e| BusinessError::new(format!("{}", e)))?;
            let rel = eat_tag_relation_entity::ActiveModel {
                eat_id: Set(eat_id),
                tag_id: Set(master.id),
            };
            let _ = rel.insert(self.gateway.db()).await;
        }

        // 5. Save Meals
        for m in &entity.meals {
            let master = self.gateway.find_or_create_meal(&m.name).await.map_err(|e| BusinessError::new(format!("{}", e)))?;
            let rel = eat_meal_relation_entity::ActiveModel {
                eat_id: Set(eat_id),
                meal_id: Set(master.id),
            };
            let _ = rel.insert(self.gateway.db()).await;
        }

        // 6. Save Biotypes
        for b in &entity.biotypes {
            let master = self.gateway.find_or_create_biotype(&b.name).await.map_err(|e| BusinessError::new(format!("{}", e)))?;
            let rel = eat_biotype_relation_entity::ActiveModel {
                eat_id: Set(eat_id),
                biotype_id: Set(master.id),
            };
            let _ = rel.insert(self.gateway.db()).await;
        }

        // 7. Save Side Dishes
        for side in &entity.side_dishes {
            if let Some(side_id) = side.id {
                let rel = eat_side_dish_entity::ActiveModel {
                    eat_id: Set(eat_id),
                    side_eat_id: Set(side_id),
                };
                let _ = rel.insert(self.gateway.db()).await;
            }
        }

        self.find_by_id(eat_id, ingredient_gateway).await
    }

    pub async fn update(&self, id: i32, mut entity: Eat, ingredient_gateway: &IngredientGateway) -> Result<Eat, BusinessError> {
        log::info!("[EatUseCase::update] Executing update recipe for id {}: {}", id, entity.name);
        if entity.name.trim().is_empty() {
            let msg = "Eat recipe name is required".to_string();
            log::error!("[EatUseCase::update] {}", msg);
            return Err(BusinessError::new(msg));
        }
        self.validate_tenant_references(&entity, ingredient_gateway).await?;
        let existing = match self.find_by_id(id, ingredient_gateway).await {
            Ok(e) => e,
            Err(err) => {
                log::error!("[EatUseCase::update] Recipe to update not found with id {}: {}", id, err);
                return Err(err);
            }
        };
        entity.id = Some(id);
        entity.uuid = existing.uuid;

        let _ = self.gateway.persist(entity.clone()).await.map_err(|e| {
            let msg = format!("Database error: {}", e);
            log::error!("[EatUseCase::update] {}", msg);
            BusinessError::new(msg)
        })?;

        // Clear existing associations
        let _ = eat_direction_entity::Entity::delete_many()
            .filter(eat_direction_entity::Column::EatId.eq(id))
            .exec(self.gateway.db())
            .await;

        let _ = eat_ingredient_entity::Entity::delete_many()
            .filter(eat_ingredient_entity::Column::EatId.eq(id))
            .exec(self.gateway.db())
            .await;

        let _ = eat_restriction_relation_entity::Entity::delete_many()
            .filter(eat_restriction_relation_entity::Column::EatId.eq(id))
            .exec(self.gateway.db())
            .await;

        let _ = eat_tag_relation_entity::Entity::delete_many()
            .filter(eat_tag_relation_entity::Column::EatId.eq(id))
            .exec(self.gateway.db())
            .await;

        let _ = eat_meal_relation_entity::Entity::delete_many()
            .filter(eat_meal_relation_entity::Column::EatId.eq(id))
            .exec(self.gateway.db())
            .await;

        let _ = eat_biotype_relation_entity::Entity::delete_many()
            .filter(eat_biotype_relation_entity::Column::EatId.eq(id))
            .exec(self.gateway.db())
            .await;

        let _ = eat_side_dish_entity::Entity::delete_many()
            .filter(eat_side_dish_entity::Column::EatId.eq(id))
            .exec(self.gateway.db())
            .await;

        // Re-insert associations
        for dir in &entity.directions {
            let active_dir = eat_direction_entity::ActiveModel {
                id: sea_orm::ActiveValue::NotSet,
                eat_id: Set(id),
                step_number: Set(dir.step_number),
                description: Set(dir.description.clone()),
            };
            let _ = active_dir.insert(self.gateway.db()).await;
        }

        for ing in &entity.ingredients {
            let active_ing = eat_ingredient_entity::ActiveModel {
                id: sea_orm::ActiveValue::NotSet,
                eat_id: Set(id),
                ingredient_id: Set(ing.ingredient_id),
                quantity: Set(ing.quantity),
                unit: Set(ing.unit.clone()),
            };
            if let Ok(saved_ing) = active_ing.insert(self.gateway.db()).await {
                for sub in &ing.substitutes {
                    if let Some(sub_id) = sub.id {
                        let active_sub = eat_ingredient_substitute_entity::ActiveModel {
                            eat_ingredient_id: Set(saved_ing.id),
                            substitute_ingredient_id: Set(sub_id),
                        };
                        let _ = active_sub.insert(self.gateway.db()).await;
                    }
                }
            }
        }

        for r in &entity.restrictions {
            if let Ok(master) = self.gateway.find_or_create_restriction(&r.name).await {
                let rel = eat_restriction_relation_entity::ActiveModel {
                    eat_id: Set(id),
                    restriction_id: Set(master.id),
                };
                let _ = rel.insert(self.gateway.db()).await;
            }
        }

        for t in &entity.tags {
            if let Ok(master) = self.gateway.find_or_create_tag(&t.name).await {
                let rel = eat_tag_relation_entity::ActiveModel {
                    eat_id: Set(id),
                    tag_id: Set(master.id),
                };
                let _ = rel.insert(self.gateway.db()).await;
            }
        }

        for m in &entity.meals {
            if let Ok(master) = self.gateway.find_or_create_meal(&m.name).await {
                let rel = eat_meal_relation_entity::ActiveModel {
                    eat_id: Set(id),
                    meal_id: Set(master.id),
                };
                let _ = rel.insert(self.gateway.db()).await;
            }
        }

        for b in &entity.biotypes {
            if let Ok(master) = self.gateway.find_or_create_biotype(&b.name).await {
                let rel = eat_biotype_relation_entity::ActiveModel {
                    eat_id: Set(id),
                    biotype_id: Set(master.id),
                };
                let _ = rel.insert(self.gateway.db()).await;
            }
        }

        for side in &entity.side_dishes {
            if let Some(side_id) = side.id {
                let rel = eat_side_dish_entity::ActiveModel {
                    eat_id: Set(id),
                    side_eat_id: Set(side_id),
                };
                let _ = rel.insert(self.gateway.db()).await;
            }
        }

        self.find_by_id(id, ingredient_gateway).await
    }

    pub async fn find_by_id(
        &self,
        id: i32,
        ingredient_gateway: &IngredientGateway,
    ) -> Result<Eat, BusinessError> {
        log::info!("[EatUseCase::find_by_id] Executing for id: {}", id);
        let model = self
            .gateway
            .find_by_id(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[EatUseCase::find_by_id] {}", msg);
                BusinessError::new(msg)
            })?;
        match model {
            Some(m) => {
                let mut eat = EatEntityMapper::from_model(m);
                self.load_eat_relations(&mut eat, ingredient_gateway).await?;
                Ok(eat)
            }
            None => {
                let msg = format!("Eat recipe not found with id: {}", id);
                log::error!("[EatUseCase::find_by_id] {}", msg);
                Err(BusinessError::new("Eat recipe not found".to_string()))
            }
        }
    }

    pub async fn find_by_uuid(
        &self,
        uuid: String,
        ingredient_gateway: &IngredientGateway,
    ) -> Result<Eat, BusinessError> {
        log::info!("[EatUseCase::find_by_uuid] Executing for uuid: {}", uuid);
        let model = self
            .gateway
            .find_by_uuid(uuid.clone())
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[EatUseCase::find_by_uuid] {}", msg);
                BusinessError::new(msg)
            })?;
        match model {
            Some(m) => {
                let mut eat = EatEntityMapper::from_model(m);
                self.load_eat_relations(&mut eat, ingredient_gateway).await?;
                Ok(eat)
            }
            None => {
                let msg = format!("Eat recipe not found with uuid: {}", uuid);
                log::error!("[EatUseCase::find_by_uuid] {}", msg);
                Err(BusinessError::new("Eat recipe not found".to_string()))
            }
        }
    }

    pub async fn find_all(
        &self,
        ingredient_gateway: &IngredientGateway,
    ) -> Result<Vec<Eat>, BusinessError> {
        log::info!("[EatUseCase::find_all] Executing find_all recipes");
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[EatUseCase::find_all] {}", msg);
                BusinessError::new(msg)
            })?;
        let mut list = Vec::new();
        for m in models {
            let mut eat = EatEntityMapper::from_model(m);
            let _ = self.load_eat_relations(&mut eat, ingredient_gateway).await;
            list.push(eat);
        }
        Ok(list)
    }

    pub async fn find_paginated(
        &self,
        page: u64,
        size: u64,
        search: Option<String>,
        recommended_period: Option<String>,
        is_highlight: Option<bool>,
        ingredient_gateway: &IngredientGateway,
    ) -> Result<(Vec<Eat>, u64, u64), BusinessError> {
        log::info!("[EatUseCase::find_paginated] Executing find_paginated (page: {}, size: {})", page, size);
        let (models, total_elements, total_pages) = self
            .gateway
            .find_paginated(page, size, search, recommended_period, is_highlight)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[EatUseCase::find_paginated] {}", msg);
                BusinessError::new(msg)
            })?;
        let mut list = Vec::new();
        for m in models {
            let mut eat = EatEntityMapper::from_model(m);
            let _ = self.load_eat_relations(&mut eat, ingredient_gateway).await;
            list.push(eat);
        }
        Ok((list, total_elements, total_pages))
    }

    pub async fn increment_views(&self, id: i32) -> Result<(), BusinessError> {
        log::info!("[EatUseCase::increment_views] Executing for id: {}", id);
        self.gateway
            .increment_views(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error incrementing views for id {}: {}", id, e);
                log::error!("[EatUseCase::increment_views] {}", msg);
                BusinessError::new(msg)
            })
    }

    pub async fn increment_additions(&self, id: i32) -> Result<(), BusinessError> {
        log::info!("[EatUseCase::increment_additions] Executing for id: {}", id);
        self.gateway
            .increment_additions(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error incrementing additions for id {}: {}", id, e);
                log::error!("[EatUseCase::increment_additions] {}", msg);
                BusinessError::new(msg)
            })
    }

    pub async fn upload_recipe_photo(&self, id: i32, bytes: Vec<u8>, extension: &str, content_type: &str, ingredient_gateway: &IngredientGateway) -> Result<(Eat, String), BusinessError> {
        log::info!("[EatUseCase::upload_recipe_photo] Executing upload_recipe_photo for recipe id: {}", id);
        let mut eat = match self.find_by_id(id, ingredient_gateway).await {
            Ok(e) => e,
            Err(err) => {
                log::error!("[EatUseCase::upload_recipe_photo] Recipe not found with id {}: {}", id, err);
                return Err(err);
            }
        };

        if crate::use_cases::image_storage_use_case::ImageStorageUseCase::get_storage_mode()
            == crate::use_cases::image_storage_use_case::StorageMode::Base64
        {
            use base64::Engine;
            let b64_str = base64::engine::general_purpose::STANDARD.encode(&bytes);
            let data_url = format!("data:{};base64,{}", content_type, b64_str);
            eat.photo_base64 = Some(data_url.as_bytes().to_vec());

            let updated = self.update(id, eat, ingredient_gateway).await?;
            return Ok((updated, data_url));
        }

        let uuid = uuid::Uuid::new_v4();
        let ext = extension.trim_start_matches('.');
        let object_key = format!("uploads/eat-{}/{}.{}", id, uuid, ext);

        if let Err(e) = crate::use_cases::image_storage_use_case::ImageStorageUseCase::upload_object(
            &object_key,
            bytes,
            content_type,
        ).await {
            log::error!("[EatUseCase::upload_recipe_photo] S3 upload error: {}", e);
            return Err(e);
        }

        let signed_url = match crate::use_cases::image_storage_use_case::ImageStorageUseCase::generate_cloudfront_signed_url(&object_key) {
            Ok(url) => url,
            Err(e) => {
                log::error!("[EatUseCase::upload_recipe_photo] CloudFront signed URL error: {}", e);
                return Err(e);
            }
        };

        eat.photo = Some(object_key);
        let updated = self.update(id, eat, ingredient_gateway).await?;

        Ok((updated, signed_url))
    }

    /// Generates a Pre-Signed S3 PUT URL for uploading Eat recipe photo directly from frontend.
    pub async fn generate_photo_presigned_url(
        &self,
        eat_id: i32,
        file_extension: &str,
        content_type: &str,
        ingredient_gateway: &IngredientGateway,
    ) -> Result<(String, String), BusinessError> {
        log::info!("[EatUseCase::generate_photo_presigned_url] Generating presigned upload URL for eat_id: {}", eat_id);
        let _ = self.find_by_id(eat_id, ingredient_gateway).await?;
        ImageStorageUseCase::generate_presigned_upload_url("eat", eat_id, file_extension, content_type).await
    }

    /// Confirms Eat recipe photo upload: updates eat.photo with object_key and returns updated Eat + CloudFront URL.
    pub async fn confirm_photo_upload(
        &self,
        eat_id: i32,
        object_key: String,
        ingredient_gateway: &IngredientGateway,
    ) -> Result<(Eat, String), BusinessError> {
        log::info!("[EatUseCase::confirm_photo_upload] Confirming photo upload for eat_id: {}, key: {}", eat_id, object_key);
        ImageStorageUseCase::verify_object_exists(&object_key).await?;
        let mut eat = self.find_by_id(eat_id, ingredient_gateway).await?;
        eat.photo = Some(object_key.clone());
        let updated = self.update(eat_id, eat, ingredient_gateway).await?;
        let signed_url = ImageStorageUseCase::generate_cloudfront_signed_url(&object_key)?;
        Ok((updated, signed_url))
    }

    pub async fn delete(&self, id: i32) -> Result<(), BusinessError> {
        log::info!("[EatUseCase::delete] Executing delete for recipe id: {}", id);
        self.gateway
            .delete_by_id(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error deleting recipe id {}: {}", id, e);
                log::error!("[EatUseCase::delete] {}", msg);
                BusinessError::new(msg)
            })?;
        Ok(())
    }



    // Helper to load sub-collections & compute total macros
    async fn validate_tenant_references(&self,eat: &Eat,ingredient_gateway: &IngredientGateway) -> Result<(), BusinessError> {
        let ingredient_ids: Vec<i32> = eat
            .ingredients
            .iter()
            .flat_map(|item| std::iter::once(item.ingredient_id).chain(item.substitutes.iter().filter_map(|sub| sub.id)))
            .collect();
        for ingredient_id in ingredient_ids {
            if ingredient_gateway
                .find_by_id(ingredient_id)
                .await
                .map_err(|e| BusinessError::new(format!("Database error: {e}")))?
                .is_none()
            {
                return Err(BusinessError::new("Ingredient not found for tenant".to_string()));
            }
        }

        let side_ids: Vec<i32> = eat.side_dishes.iter().filter_map(|side| side.id).collect();
        for side_id in side_ids {
            if self
                .gateway
                .find_by_id(side_id)
                .await
                .map_err(|e| BusinessError::new(format!("Database error: {e}")))?
                .is_none()
            {
                return Err(BusinessError::new("Side dish not found for tenant".to_string()));
            }
        }
        Ok(())
    }

    async fn load_eat_relations(
        &self,
        eat: &mut Eat,
        ingredient_gateway: &IngredientGateway,
    ) -> Result<(), BusinessError> {
        let eat_id = eat.id.unwrap();

        // 1. Directions
        if let Ok(dirs) = eat_direction_entity::Entity::find()
            .filter(eat_direction_entity::Column::EatId.eq(eat_id))
            .all(self.gateway.db())
            .await
        {
            eat.directions = dirs
                .into_iter()
                .map(|d| crate::domain::eat::EatDirection {
                    id: Some(d.id),
                    step_number: d.step_number,
                    description: d.description,
                })
                .collect();
        }

        // 2. Ingredients & compute macros
        let mut total_kcal = 0.0;
        let mut total_prot = 0.0;
        let mut total_carbs = 0.0;
        let mut total_fat = 0.0;
        let mut total_fiber = 0.0;

        if let Ok(ings) = eat_ingredient_entity::Entity::find()
            .filter(eat_ingredient_entity::Column::EatId.eq(eat_id))
            .all(self.gateway.db())
            .await
        {
            let mut domain_ings = Vec::new();
            for ing in ings {
                let ing_model = ingredient_gateway.find_by_id(ing.ingredient_id).await.unwrap_or(None);
                let ing_domain = ing_model.map(crate::domain::ingredient::IngredientEntityMapper::from_model);

                // Load substitutes
                let mut subs = Vec::new();
                if let Ok(sub_rels) = eat_ingredient_substitute_entity::Entity::find()
                    .filter(eat_ingredient_substitute_entity::Column::EatIngredientId.eq(ing.id))
                    .all(self.gateway.db())
                    .await
                {
                    for s in sub_rels {
                        if let Ok(Some(m)) = ingredient_gateway.find_by_id(s.substitute_ingredient_id).await {
                            subs.push(crate::domain::ingredient::IngredientEntityMapper::from_model(m));
                        }
                    }
                }

                if let Some(ref ing_data) = ing_domain {
                    let multiply = MeasurementUnit::from_str(&ing.unit).unwrap().gram_multiplier();
                    let (kcal, prot, carbs, fat, fiber) = ing_data.macros_for_quantity(ing.quantity, multiply);
                    total_kcal += kcal;
                    total_prot += prot;
                    total_carbs += carbs;
                    total_fat += fat;
                    total_fiber += fiber;
                }

                domain_ings.push(crate::domain::eat::EatIngredient {
                    id: Some(ing.id),
                    ingredient_id: ing.ingredient_id,
                    ingredient: ing_domain,
                    quantity: ing.quantity,
                    unit: ing.unit,
                    substitutes: subs,
                });
            }
            eat.ingredients = domain_ings;
        }

        eat.total_macros = Some(MacrosTotal {
            kcal: (total_kcal * 100.0).round() / 100.0,
            protein_g: (total_prot * 100.0).round() / 100.0,
            carbs_g: (total_carbs * 100.0).round() / 100.0,
            fat_g: (total_fat * 100.0).round() / 100.0,
            fiber_g: (total_fiber * 100.0).round() / 100.0,
        });

        // 3. Restrictions
        if let Ok(rels) = eat_restriction_relation_entity::Entity::find()
            .filter(eat_restriction_relation_entity::Column::EatId.eq(eat_id))
            .all(self.gateway.db())
            .await
        {
            let mut list = Vec::new();
            for r in rels {
                if let Ok(Some(m)) = entity::prelude::EatRestrictionEntity::find_by_id(r.restriction_id).one(self.gateway.db()).await {
                    list.push(crate::domain::eat::EatRestriction { id: m.id, name: m.name });
                }
            }
            eat.restrictions = list;
        }

        // 4. Tags
        if let Ok(rels) = eat_tag_relation_entity::Entity::find()
            .filter(eat_tag_relation_entity::Column::EatId.eq(eat_id))
            .all(self.gateway.db())
            .await
        {
            let mut list = Vec::new();
            for r in rels {
                if let Ok(Some(m)) = entity::prelude::EatTagEntity::find_by_id(r.tag_id).one(self.gateway.db()).await {
                    list.push(crate::domain::eat::EatTag { id: m.id, name: m.name });
                }
            }
            eat.tags = list;
        }

        // 5. Meals
        if let Ok(rels) = eat_meal_relation_entity::Entity::find()
            .filter(eat_meal_relation_entity::Column::EatId.eq(eat_id))
            .all(self.gateway.db())
            .await
        {
            let mut list = Vec::new();
            for r in rels {
                if let Ok(Some(m)) = entity::prelude::EatMealEntity::find_by_id(r.meal_id).one(self.gateway.db()).await {
                    list.push(crate::domain::eat::EatMeal { id: m.id, name: m.name });
                }
            }
            eat.meals = list;
        }

        // 6. Biotypes
        if let Ok(rels) = eat_biotype_relation_entity::Entity::find()
            .filter(eat_biotype_relation_entity::Column::EatId.eq(eat_id))
            .all(self.gateway.db())
            .await
        {
            let mut list = Vec::new();
            for r in rels {
                if let Ok(Some(m)) = entity::prelude::EatBiotypeEntity::find_by_id(r.biotype_id).one(self.gateway.db()).await {
                    list.push(crate::domain::eat::EatBiotype { id: m.id, name: m.name });
                }
            }
            eat.biotypes = list;
        }

        // 7. Side Dishes
        if let Ok(rels) = eat_side_dish_entity::Entity::find()
            .filter(eat_side_dish_entity::Column::EatId.eq(eat_id))
            .all(self.gateway.db())
            .await
        {
            let mut list = Vec::new();
            for r in rels {
                if let Ok(Some(m)) = self.gateway.find_by_id(r.side_eat_id).await {
                    list.push(EatEntityMapper::from_model(m));
                }
            }
            eat.side_dishes = list;
        }

        Ok(())
    }
}
