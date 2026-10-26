use std::str::FromStr;
use crate::commons::entity_mapper::EntityMapper;
use crate::commons::gateway::Gateway;
use crate::commons::gateway::tenant_select;
use crate::domain::business_error::BusinessError;
use crate::domain::enums::MeasurementUnit;
use crate::domain::meal_plan::{MealPlan, MealPlanEntityMapper, MealPlanItem, MealPlanMacros, MealPlanMeal, MealPlanOption};
use crate::gateway::ingredient_gateway::IngredientGateway;
use crate::gateway::meal_plan_gateway::MealPlanGateway;
use entity::{
    customer_entity, doctor_entity, meal_plan_item_entity, meal_plan_item_substitute_entity, meal_plan_meal_entity,
    meal_plan_option_entity,
};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};

pub struct MealPlanUseCase {
    gateway: MealPlanGateway,
}

impl MealPlanUseCase {
    pub fn new(gateway: MealPlanGateway) -> Self {
        Self { gateway }
    }

    pub async fn create(
        &self,
        mut entity: MealPlan,
        ingredient_gateway: &IngredientGateway,
    ) -> Result<MealPlan, BusinessError> {
        log::info!("[MealPlanUseCase::create] Executing create meal plan for name: {}", entity.name);
        if entity.name.trim().is_empty() {
            let msg = "Meal plan name is required".to_string();
            log::error!("[MealPlanUseCase::create] {}", msg);
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
                log::error!("[MealPlanUseCase::create] {}", msg);
                BusinessError::new(msg)
            })?;
        let plan_id = active.id.clone().unwrap();

        // Save nested Meals, Options, Items
        for meal in &entity.meals {
            let active_meal = meal_plan_meal_entity::ActiveModel {
                id: sea_orm::ActiveValue::NotSet,
                meal_plan_id: Set(plan_id),
                meal_type: Set(meal.meal_type.clone()),
                is_pre_workout: Set(meal.is_pre_workout),
                is_post_workout: Set(meal.is_post_workout),
                nutritionist_note: Set(meal.nutritionist_note.clone()),
                position: Set(meal.position),
            };
            if let Ok(saved_meal) = active_meal.insert(self.gateway.db()).await {
                for option in &meal.options {
                    let active_opt = meal_plan_option_entity::ActiveModel {
                        id: sea_orm::ActiveValue::NotSet,
                        meal_plan_meal_id: Set(saved_meal.id),
                        label: Set(option.label.clone()),
                        position: Set(option.position),
                    };
                    if let Ok(saved_opt) = active_opt.insert(self.gateway.db()).await {
                        for item in &option.items {
                            let active_item = meal_plan_item_entity::ActiveModel {
                                id: sea_orm::ActiveValue::NotSet,
                                meal_plan_option_id: Set(saved_opt.id),
                                ingredient_id: Set(item.ingredient_id),
                                quantity: Set(item.quantity),
                                unit: Set(item.unit.clone()),
                            };
                            if let Ok(saved_item) = active_item.insert(self.gateway.db()).await {
                                for sub in &item.substitutes {
                                    if let Some(sub_id) = sub.id {
                                        let active_sub = meal_plan_item_substitute_entity::ActiveModel {
                                            meal_plan_item_id: Set(saved_item.id),
                                            substitute_ingredient_id: Set(sub_id),
                                        };
                                        let _ = active_sub.insert(self.gateway.db()).await;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        self.find_by_id(plan_id, ingredient_gateway).await
    }

    pub async fn update(
        &self,
        id: i32,
        mut entity: MealPlan,
        ingredient_gateway: &IngredientGateway,
    ) -> Result<MealPlan, BusinessError> {
        log::info!("[MealPlanUseCase::update] Executing update meal plan for id {}: {}", id, entity.name);
        if entity.name.trim().is_empty() {
            let msg = "Meal plan name is required".to_string();
            log::error!("[MealPlanUseCase::update] {}", msg);
            return Err(BusinessError::new(msg));
        }
        self.validate_tenant_references(&entity, ingredient_gateway).await?;
        let existing = match self.find_by_id(id, ingredient_gateway).await {
            Ok(p) => p,
            Err(e) => {
                log::error!("[MealPlanUseCase::update] Meal plan to update not found with id {}: {}", id, e);
                return Err(e);
            }
        };
        entity.id = Some(id);
        entity.uuid = existing.uuid;

        let _ = self
            .gateway
            .persist(entity.clone())
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[MealPlanUseCase::update] {}", msg);
                BusinessError::new(msg)
            })?;

        // Clear existing nested structures
        let _ = meal_plan_meal_entity::Entity::delete_many()
            .filter(meal_plan_meal_entity::Column::MealPlanId.eq(id))
            .exec(self.gateway.db())
            .await;

        // Re-insert nested structures
        for meal in &entity.meals {
            let active_meal = meal_plan_meal_entity::ActiveModel {
                id: sea_orm::ActiveValue::NotSet,
                meal_plan_id: Set(id),
                meal_type: Set(meal.meal_type.clone()),
                is_pre_workout: Set(meal.is_pre_workout),
                is_post_workout: Set(meal.is_post_workout),
                nutritionist_note: Set(meal.nutritionist_note.clone()),
                position: Set(meal.position),
            };
            if let Ok(saved_meal) = active_meal.insert(self.gateway.db()).await {
                for option in &meal.options {
                    let active_opt = meal_plan_option_entity::ActiveModel {
                        id: sea_orm::ActiveValue::NotSet,
                        meal_plan_meal_id: Set(saved_meal.id),
                        label: Set(option.label.clone()),
                        position: Set(option.position),
                    };
                    if let Ok(saved_opt) = active_opt.insert(self.gateway.db()).await {
                        for item in &option.items {
                            let active_item = meal_plan_item_entity::ActiveModel {
                                id: sea_orm::ActiveValue::NotSet,
                                meal_plan_option_id: Set(saved_opt.id),
                                ingredient_id: Set(item.ingredient_id),
                                quantity: Set(item.quantity),
                                unit: Set(item.unit.clone()),
                            };
                            if let Ok(saved_item) = active_item.insert(self.gateway.db()).await {
                                for sub in &item.substitutes {
                                    if let Some(sub_id) = sub.id {
                                        let active_sub = meal_plan_item_substitute_entity::ActiveModel {
                                            meal_plan_item_id: Set(saved_item.id),
                                            substitute_ingredient_id: Set(sub_id),
                                        };
                                        let _ = active_sub.insert(self.gateway.db()).await;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        self.find_by_id(id, ingredient_gateway).await
    }

    pub async fn find_by_id(
        &self,
        id: i32,
        ingredient_gateway: &IngredientGateway,
    ) -> Result<MealPlan, BusinessError> {
        log::info!("[MealPlanUseCase::find_by_id] Executing for id: {}", id);
        let model = self
            .gateway
            .find_by_id(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[MealPlanUseCase::find_by_id] {}", msg);
                BusinessError::new(msg)
            })?;
        match model {
            Some(m) => {
                let mut plan = MealPlanEntityMapper::from_model(m);
                self.load_meal_plan_relations(&mut plan, ingredient_gateway).await?;
                Ok(plan)
            }
            None => {
                let msg = format!("Meal plan not found with id: {}", id);
                log::error!("[MealPlanUseCase::find_by_id] {}", msg);
                Err(BusinessError::new("Meal plan not found".to_string()))
            }
        }
    }

    pub async fn find_by_uuid(
        &self,
        uuid: String,
        ingredient_gateway: &IngredientGateway,
    ) -> Result<MealPlan, BusinessError> {
        log::info!("[MealPlanUseCase::find_by_uuid] Executing for uuid: {}", uuid);
        let model = self
            .gateway
            .find_by_uuid(uuid.clone())
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[MealPlanUseCase::find_by_uuid] {}", msg);
                BusinessError::new(msg)
            })?;
        match model {
            Some(m) => {
                let mut plan = MealPlanEntityMapper::from_model(m);
                self.load_meal_plan_relations(&mut plan, ingredient_gateway).await?;
                Ok(plan)
            }
            None => {
                let msg = format!("Meal plan not found with uuid: {}", uuid);
                log::error!("[MealPlanUseCase::find_by_uuid] {}", msg);
                Err(BusinessError::new("Meal plan not found".to_string()))
            }
        }
    }

    pub async fn find_all(
        &self,
        ingredient_gateway: &IngredientGateway,
    ) -> Result<Vec<MealPlan>, BusinessError> {
        log::info!("[MealPlanUseCase::find_all] Executing find_all meal plans");
        let models = self
            .gateway
            .find_all()
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[MealPlanUseCase::find_all] {}", msg);
                BusinessError::new(msg)
            })?;
        let mut list = Vec::new();
        for m in models {
            let mut plan = MealPlanEntityMapper::from_model(m);
            let _ = self.load_meal_plan_relations(&mut plan, ingredient_gateway).await;
            list.push(plan);
        }
        Ok(list)
    }

    pub async fn find_paginated(
        &self,
        page: u64,
        size: u64,
        search: Option<String>,
        category: Option<String>,
        patient_id: Option<i32>,
        ingredient_gateway: &IngredientGateway,
    ) -> Result<(Vec<MealPlan>, u64, u64), BusinessError> {
        log::info!("[MealPlanUseCase::find_paginated] Executing find_paginated (page: {}, size: {})", page, size);
        let (models, total_elements, total_pages) = self
            .gateway
            .find_paginated(page, size, search, category, patient_id)
            .await
            .map_err(|e| {
                let msg = format!("Database error: {}", e);
                log::error!("[MealPlanUseCase::find_paginated] {}", msg);
                BusinessError::new(msg)
            })?;
        let mut list = Vec::new();
        for m in models {
            let mut plan = MealPlanEntityMapper::from_model(m);
            let _ = self.load_meal_plan_relations(&mut plan, ingredient_gateway).await;
            list.push(plan);
        }
        Ok((list, total_elements, total_pages))
    }

    pub async fn toggle_favorite(
        &self,
        id: i32,
        ingredient_gateway: &IngredientGateway,
    ) -> Result<MealPlan, BusinessError> {
        log::info!("[MealPlanUseCase::toggle_favorite] Executing toggle_favorite for id: {}", id);
        let result = self.gateway.toggle_favorite(id).await.map_err(|e| {
            let msg = format!("Database error toggling favorite for id {}: {}", id, e);
            log::error!("[MealPlanUseCase::toggle_favorite] {}", msg);
            BusinessError::new(msg)
        })?;

        if let Some(m) = result {
            let mut plan = MealPlanEntityMapper::from_model(m);
            self.load_meal_plan_relations(&mut plan, ingredient_gateway).await?;
            Ok(plan)
        } else {
            let msg = format!("Meal plan not found with id: {}", id);
            log::error!("[MealPlanUseCase::toggle_favorite] {}", msg);
            Err(BusinessError::new("Meal plan not found".to_string()))
        }
    }

    pub async fn delete(&self, id: i32) -> Result<(), BusinessError> {
        log::info!("[MealPlanUseCase::delete] Executing delete for meal plan id: {}", id);
        self.gateway
            .delete_by_id(id)
            .await
            .map_err(|e| {
                let msg = format!("Database error deleting meal plan id {}: {}", id, e);
                log::error!("[MealPlanUseCase::delete] {}", msg);
                BusinessError::new(msg)
            })?;
        Ok(())
    }

    // Load nested structure & calculate macros
    async fn load_meal_plan_relations(
        &self,
        plan: &mut MealPlan,
        ingredient_gateway: &IngredientGateway,
    ) -> Result<(), BusinessError> {
        let plan_id = plan.id.unwrap();

        let mut plan_kcal = 0.0;
        let mut plan_prot = 0.0;
        let mut plan_carbs = 0.0;
        let mut plan_fat = 0.0;
        let mut plan_fiber = 0.0;

        if let Ok(meals) = meal_plan_meal_entity::Entity::find()
            .filter(meal_plan_meal_entity::Column::MealPlanId.eq(plan_id))
            .all(self.gateway.db())
            .await
        {
            let mut domain_meals = Vec::new();

            for meal in meals {
                let mut meal_domain = MealPlanMeal {
                    id: Some(meal.id),
                    meal_type: meal.meal_type,
                    is_pre_workout: meal.is_pre_workout,
                    is_post_workout: meal.is_post_workout,
                    nutritionist_note: meal.nutritionist_note,
                    position: meal.position,
                    options: Vec::new(),
                    meal_macros: None,
                };

                let mut meal_kcal = 0.0;
                let mut meal_prot = 0.0;
                let mut meal_carbs = 0.0;
                let mut meal_fat = 0.0;
                let mut meal_fiber = 0.0;

                if let Ok(options) = meal_plan_option_entity::Entity::find()
                    .filter(meal_plan_option_entity::Column::MealPlanMealId.eq(meal.id))
                    .all(self.gateway.db())
                    .await
                {
                    let mut domain_options = Vec::new();

                    for opt in options {
                        let mut opt_domain = MealPlanOption {
                            id: Some(opt.id),
                            label: opt.label,
                            position: opt.position,
                            items: Vec::new(),
                            option_macros: None,
                        };

                        let mut opt_kcal = 0.0;
                        let mut opt_prot = 0.0;
                        let mut opt_carbs = 0.0;
                        let mut opt_fat = 0.0;
                        let mut opt_fiber = 0.0;

                        if let Ok(items) = meal_plan_item_entity::Entity::find()
                            .filter(meal_plan_item_entity::Column::MealPlanOptionId.eq(opt.id))
                            .all(self.gateway.db())
                            .await
                        {
                            let mut domain_items = Vec::new();

                            for item in items {
                                let ing_model = ingredient_gateway.find_by_id(item.ingredient_id).await.unwrap_or(None);
                                let ing_domain = ing_model.map(crate::domain::ingredient::IngredientEntityMapper::from_model);

                                // Load substitutes
                                let mut subs = Vec::new();
                                if let Ok(sub_rels) = meal_plan_item_substitute_entity::Entity::find()
                                    .filter(meal_plan_item_substitute_entity::Column::MealPlanItemId.eq(item.id))
                                    .all(self.gateway.db())
                                    .await
                                {
                                    for s in sub_rels {
                                        if let Ok(Some(m)) = ingredient_gateway.find_by_id(s.substitute_ingredient_id).await {
                                            subs.push(crate::domain::ingredient::IngredientEntityMapper::from_model(m));
                                        }
                                    }
                                }

                                let mut item_kcal = 0.0;
                                let mut item_prot = 0.0;
                                let mut item_carbs = 0.0;
                                let mut item_fat = 0.0;
                                let mut item_fiber = 0.0;

                                if let Some(ref ing_data) = ing_domain {
                                    let mult = MeasurementUnit::from_str(&item.unit).unwrap().gram_multiplier();
                                    let (kcal, prot, carbs, fat, fiber) = ing_data.macros_for_quantity(item.quantity, mult);
                                    item_kcal = kcal;
                                    item_prot = prot;
                                    item_carbs = carbs;
                                    item_fat = fat;
                                    item_fiber = fiber;
                                }

                                opt_kcal += item_kcal;
                                opt_prot += item_prot;
                                opt_carbs += item_carbs;
                                opt_fat += item_fat;
                                opt_fiber += item_fiber;

                                let item_macros = MealPlanMacros {
                                    kcal: (item_kcal * 100.0).round() / 100.0,
                                    protein_g: (item_prot * 100.0).round() / 100.0,
                                    carbs_g: (item_carbs * 100.0).round() / 100.0,
                                    carbs_pct: if item_kcal > 0.0 { ((item_carbs * 4.0 / item_kcal) * 100.0).round() } else { 0.0 },
                                    lipids_g: (item_fat * 100.0).round() / 100.0,
                                    lipids_pct: if item_kcal > 0.0 { ((item_fat * 9.0 / item_kcal) * 100.0).round() } else { 0.0 },
                                    fiber_g: (item_fiber * 100.0).round() / 100.0,
                                };

                                domain_items.push(MealPlanItem {
                                    id: Some(item.id),
                                    ingredient_id: item.ingredient_id,
                                    ingredient: ing_domain,
                                    quantity: item.quantity,
                                    unit: item.unit,
                                    substitutes: subs,
                                    item_macros: Some(item_macros),
                                });
                            }
                            opt_domain.items = domain_items;
                        }

                        opt_domain.option_macros = Some(MealPlanMacros {
                            kcal: (opt_kcal * 100.0).round() / 100.0,
                            protein_g: (opt_prot * 100.0).round() / 100.0,
                            carbs_g: (opt_carbs * 100.0).round() / 100.0,
                            carbs_pct: if opt_kcal > 0.0 { ((opt_carbs * 4.0 / opt_kcal) * 100.0).round() } else { 0.0 },
                            lipids_g: (opt_fat * 100.0).round() / 100.0,
                            lipids_pct: if opt_kcal > 0.0 { ((opt_fat * 9.0 / opt_kcal) * 100.0).round() } else { 0.0 },
                            fiber_g: (opt_fiber * 100.0).round() / 100.0,
                        });

                        // Sum option 1 into meal & plan macros
                        if domain_options.is_empty() {
                            meal_kcal += opt_kcal;
                            meal_prot += opt_prot;
                            meal_carbs += opt_carbs;
                            meal_fat += opt_fat;
                            meal_fiber += opt_fiber;
                        }

                        domain_options.push(opt_domain);
                    }
                    meal_domain.options = domain_options;
                }

                meal_domain.meal_macros = Some(MealPlanMacros {
                    kcal: (meal_kcal * 100.0).round() / 100.0,
                    protein_g: (meal_prot * 100.0).round() / 100.0,
                    carbs_g: (meal_carbs * 100.0).round() / 100.0,
                    carbs_pct: if meal_kcal > 0.0 { ((meal_carbs * 4.0 / meal_kcal) * 100.0).round() } else { 0.0 },
                    lipids_g: (meal_fat * 100.0).round() / 100.0,
                    lipids_pct: if meal_kcal > 0.0 { ((meal_fat * 9.0 / meal_kcal) * 100.0).round() } else { 0.0 },
                    fiber_g: (meal_fiber * 100.0).round() / 100.0,
                });

                plan_kcal += meal_kcal;
                plan_prot += meal_prot;
                plan_carbs += meal_carbs;
                plan_fat += meal_fat;
                plan_fiber += meal_fiber;

                domain_meals.push(meal_domain);
            }
            plan.meals = domain_meals;
        }

        plan.total_macros = Some(MealPlanMacros {
            kcal: (plan_kcal * 100.0).round() / 100.0,
            protein_g: (plan_prot * 100.0).round() / 100.0,
            carbs_g: (plan_carbs * 100.0).round() / 100.0,
            carbs_pct: if plan_kcal > 0.0 { ((plan_carbs * 4.0 / plan_kcal) * 100.0).round() } else { 0.0 },
            lipids_g: (plan_fat * 100.0).round() / 100.0,
            lipids_pct: if plan_kcal > 0.0 { ((plan_fat * 9.0 / plan_kcal) * 100.0).round() } else { 0.0 },
            fiber_g: (plan_fiber * 100.0).round() / 100.0,
        });

        Ok(())
    }

    async fn validate_tenant_references(
        &self,
        plan: &MealPlan,
        ingredient_gateway: &IngredientGateway,
    ) -> Result<(), BusinessError> {
        if let Some(patient_id) = plan.patient_id {
            let patient = tenant_select(
                customer_entity::Entity::find(),
                customer_entity::Column::TenantId,
            )
            .filter(customer_entity::Column::Id.eq(patient_id))
            .one(self.gateway.db())
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {e}")))?;
            if patient.is_none() {
                return Err(BusinessError::new("Patient not found for tenant".to_string()));
            }
        }

        if let Some(nutritionist_id) = plan.nutritionist_id {
            let nutritionist = tenant_select(
                doctor_entity::Entity::find(),
                doctor_entity::Column::TenantId,
            )
            .filter(doctor_entity::Column::Id.eq(nutritionist_id))
            .one(self.gateway.db())
            .await
            .map_err(|e| BusinessError::new(format!("Database error: {e}")))?;
            if nutritionist.is_none() {
                return Err(BusinessError::new("Nutritionist not found for tenant".to_string()));
            }
        }

        for item in plan.meals.iter().flat_map(|meal| &meal.options).flat_map(|option| &option.items) {
            if ingredient_gateway
                .find_by_id(item.ingredient_id)
                .await
                .map_err(|e| BusinessError::new(format!("Database error: {e}")))?
                .is_none()
            {
                return Err(BusinessError::new("Ingredient not found for tenant".to_string()));
            }
        }
        Ok(())
    }
}
