use business::domain::enums::AnalysisType;
use business::use_cases::manual_meal_analysis_use_case::{
    ManualMealAnalysisError, ManualMealAnalysisInput, ManualMealAnalysisUseCase,
    ManualMealItemInput,
};
use chrono::{NaiveDate, Utc};
use entity::{customer_entity, daily_meal_entity, ingredient_entity, meal_log_entity, meal_point_tier_entity};
use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};

#[tokio::test]
async fn test_manual_meal_analysis_empty_items_error() {
    let db = MockDatabase::new(DatabaseBackend::MySql).into_connection();

    let input = ManualMealAnalysisInput {
        daily_meal_id: 1,
        meal_date: NaiveDate::from_ymd_opt(2026, 9, 2).unwrap(),
        items: vec![],
    };

    let result = ManualMealAnalysisUseCase::analyze_and_log(&db, 10, input).await;
    assert_eq!(result, Err(ManualMealAnalysisError::EmptyItems));
}

#[tokio::test]
async fn test_manual_meal_analysis_invalid_quantity_error() {
    let db = MockDatabase::new(DatabaseBackend::MySql)
        .append_query_results([[daily_meal_entity::Model {
            id: 1,
            uuid: vec![0; 16],
            tenant_id: None,
            name: "Lunch".to_string(),
            code: Some("LUNCH".to_string()),
            created_at: Utc::now(),
            created_by: None,
            updated_at: Utc::now(),
            updated_by: None,
        }]])
        .into_connection();

    let input = ManualMealAnalysisInput {
        daily_meal_id: 1,
        meal_date: NaiveDate::from_ymd_opt(2026, 9, 2).unwrap(),
        items: vec![ManualMealItemInput {
            ingredient_id: 10,
            quantity: 0.0,
            unit: None,
        }],
    };

    let result = ManualMealAnalysisUseCase::analyze_and_log(&db, 10, input).await;
    assert_eq!(result, Err(ManualMealAnalysisError::InvalidQuantity));
}

#[tokio::test]
async fn test_manual_meal_analysis_invalid_unit_error() {
    let db = MockDatabase::new(DatabaseBackend::MySql)
        .append_query_results([[daily_meal_entity::Model {
            id: 1,
            uuid: vec![0; 16],
            tenant_id: None,
            name: "Lunch".to_string(),
            code: Some("LUNCH".to_string()),
            created_at: Utc::now(),
            created_by: None,
            updated_at: Utc::now(),
            updated_by: None,
        }]])
        .into_connection();

    let input = ManualMealAnalysisInput {
        daily_meal_id: 1,
        meal_date: NaiveDate::from_ymd_opt(2026, 9, 2).unwrap(),
        items: vec![ManualMealItemInput {
            ingredient_id: 10,
            quantity: 100.0,
            unit: Some("non_existent_unit".to_string()),
        }],
    };

    let result = ManualMealAnalysisUseCase::analyze_and_log(&db, 10, input).await;
    assert!(matches!(result, Err(ManualMealAnalysisError::InvalidUnit(_))));
}

#[tokio::test]
async fn test_manual_meal_analysis_daily_meal_not_found_error() {
    let db = MockDatabase::new(DatabaseBackend::MySql)
        .append_query_results([Vec::<daily_meal_entity::Model>::new()])
        .into_connection();

    let input = ManualMealAnalysisInput {
        daily_meal_id: 999,
        meal_date: NaiveDate::from_ymd_opt(2026, 9, 2).unwrap(),
        items: vec![ManualMealItemInput {
            ingredient_id: 10,
            quantity: 100.0,
            unit: None,
        }],
    };

    let result = ManualMealAnalysisUseCase::analyze_and_log(&db, 10, input).await;
    assert_eq!(result, Err(ManualMealAnalysisError::InvalidDailyMeal));
}

#[tokio::test]
async fn test_manual_meal_analysis_ingredient_not_found_error() {
    let db = MockDatabase::new(DatabaseBackend::MySql)
        .append_query_results([[daily_meal_entity::Model {
            id: 1,
            uuid: vec![0; 16],
            tenant_id: None,
            name: "Breakfast".to_string(),
            code: Some("BREAKFAST".to_string()),
            created_at: Utc::now(),
            created_by: None,
            updated_at: Utc::now(),
            updated_by: None,
        }]])
        .append_query_results([Vec::<ingredient_entity::Model>::new()])
        .into_connection();

    let input = ManualMealAnalysisInput {
        daily_meal_id: 1,
        meal_date: NaiveDate::from_ymd_opt(2026, 9, 2).unwrap(),
        items: vec![ManualMealItemInput {
            ingredient_id: 999,
            quantity: 150.0,
            unit: Some("Grams".to_string()),
        }],
    };

    let result = ManualMealAnalysisUseCase::analyze_and_log(&db, 10, input).await;
    assert_eq!(result, Err(ManualMealAnalysisError::IngredientNotFound(999)));
}

#[tokio::test]
async fn test_manual_meal_analysis_success_with_multiple_ingredients_and_units() {
    let chicken = ingredient_entity::Model {
        id: 10,
        uuid: vec![0; 16],
        tenant_id: None,
        name: "Peito de Frango Grelhado".to_string(),
        kcal: 165.0,
        protein: 31.0,
        carbs: 0.0,
        fat: 3.6,
        fiber: 0.0,
        taco_id: None,
        moisture: None,
        kj: None,
        cholesterol: None,
        ash: None,
        calcium: None,
        magnesium: None,
        manganese: None,
        phosphorus: None,
        iron: None,
        sodium: None,
        potassium: None,
        copper: None,
        zinc: None,
        retinol: None,
        re: None,
        rae: None,
        thiamine: None,
        riboflavin: None,
        pyridoxine: None,
        niacin: None,
        vitamin_c: None,
        saturated_fat: None,
        monounsaturated_fat: None,
        polyunsaturated_fat: None,
        created_at: Utc::now(),
        created_by: None,
        updated_at: Utc::now(),
        updated_by: None,
    };

    let olive_oil = ingredient_entity::Model {
        id: 20,
        uuid: vec![0; 16],
        tenant_id: None,
        name: "Azeite de Oliva".to_string(),
        kcal: 884.0,
        protein: 0.0,
        carbs: 0.0,
        fat: 100.0,
        fiber: 0.0,
        taco_id: None,
        moisture: None,
        kj: None,
        cholesterol: None,
        ash: None,
        calcium: None,
        magnesium: None,
        manganese: None,
        phosphorus: None,
        iron: None,
        sodium: None,
        potassium: None,
        copper: None,
        zinc: None,
        retinol: None,
        re: None,
        rae: None,
        thiamine: None,
        riboflavin: None,
        pyridoxine: None,
        niacin: None,
        vitamin_c: None,
        saturated_fat: None,
        monounsaturated_fat: None,
        polyunsaturated_fat: None,
        created_at: Utc::now(),
        created_by: None,
        updated_at: Utc::now(),
        updated_by: None,
    };

    let saved_meal_log = meal_log_entity::Model {
        id: 1,
        uuid: vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
        customer_id: 100,
        daily_meal_id: 1,
        analysis_job_id: None,
        analysis_type: AnalysisType::Manual.to_string(),
        meal_date: NaiveDate::from_ymd_opt(2026, 9, 2).unwrap(),
        calories: 462.6,
        protein_g: 62.0,
        carbs_g: 0.0,
        fat_g: 22.2,
        items_json: None,
        photo: None,
        photo_base64: None,
        created_at: Utc::now(),
        created_by: None,
        updated_at: Utc::now(),
        updated_by: None,
    };

    let customer = customer_entity::Model {
        id: 100,
        uuid: vec![0; 16],
        tenant_id: None,
        name: "Test User".to_string(),
        email: "test@example.com".to_string(),
        phone: "123456789".to_string(),
        date_of_birth: NaiveDate::from_ymd_opt(1990, 1, 1).unwrap(),
        gender: "M".to_string(),
        address_line1: None,
        address_line2: None,
        locality: None,
        administrative_area: None,
        postal_code: None,
        country_code: None,
        clinical_plan_id: None,
        prepare_meal_id: None,
        mobile_enabled: true,
        photo: None,
        photo_base64: None,
        user_id: Some(100),
        created_at: Utc::now(),
        created_by: None,
        updated_at: Utc::now(),
        updated_by: None,
    };

    let db = MockDatabase::new(DatabaseBackend::MySql)
        // 1. Daily meal lookup
        .append_query_results([[daily_meal_entity::Model {
            id: 1,
            uuid: vec![0; 16],
            tenant_id: None,
            name: "Lunch".to_string(),
            code: Some("LUNCH".to_string()),
            created_at: Utc::now(),
            created_by: None,
            updated_at: Utc::now(),
            updated_by: None,
        }]])
        // 2. Ingredient 1 lookup
        .append_query_results([[chicken]])
        // 3. Ingredient 2 lookup
        .append_query_results([[olive_oil]])
        // 4. Insert meal_log
        .append_exec_results([MockExecResult {
            last_insert_id: 1,
            rows_affected: 1,
        }])
        .append_query_results([[saved_meal_log.clone()]])
        // 5. Gamification customer query
        .append_query_results([[customer]])
        // 6. Gamification meal_point_tier query (no tiers configured)
        .append_query_results([Vec::<meal_point_tier_entity::Model>::new()])
        .into_connection();

    let input = ManualMealAnalysisInput {
        daily_meal_id: 1,
        meal_date: NaiveDate::from_ymd_opt(2026, 9, 2).unwrap(),
        items: vec![
            ManualMealItemInput {
                ingredient_id: 10,
                quantity: 200.0,
                unit: Some("Grams".to_string()),
            },
            ManualMealItemInput {
                ingredient_id: 20,
                quantity: 1.0,
                unit: Some("TableSpoon".to_string()), // 15g
            },
        ],
    };

    let (saved, items, totals, points) =
        ManualMealAnalysisUseCase::analyze_and_log(&db, 100, input).await.expect("Should succeed");

    assert_eq!(saved.analysis_type, "MANUAL");
    assert_eq!(saved.analysis_job_id, None);
    assert_eq!(items.len(), 2);

    assert_eq!(items[0].name, "Peito de Frango Grelhado");
    assert_eq!(items[0].estimated_grams, 200.0);
    assert_eq!(items[0].calories, 330.0);
    assert_eq!(items[0].protein_g, 62.0);
    assert_eq!(items[0].carbs_g, 0.0);
    assert_eq!(items[0].fat_g, 7.2);

    assert_eq!(items[1].name, "Azeite de Oliva");
    assert_eq!(items[1].estimated_grams, 15.0);
    assert_eq!(items[1].calories, 132.6);
    assert_eq!(items[1].protein_g, 0.0);
    assert_eq!(items[1].carbs_g, 0.0);
    assert_eq!(items[1].fat_g, 15.0);

    assert_eq!(totals.calories, 462.6);
    assert_eq!(totals.protein_g, 62.0);
    assert_eq!(totals.carbs_g, 0.0);
    assert_eq!(totals.fat_g, 22.2);
    assert_eq!(points, None);
}
