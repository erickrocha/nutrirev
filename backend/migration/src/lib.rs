pub use sea_orm_migration::prelude::*;

mod m20260812_000001_create_table_user;
mod m20260812_000002_create_tenant_table;
mod m20260812_000003_create_prepare_meal_table;
mod m20260812_000004_create_clinical_plan_table;
mod m20260812_000005_create_customer_table;
mod m20260812_000006_create_dietary_restriction_table;
mod m20260812_000007_create_customer_dietary_restriction_table;
mod m20260812_000008_create_bowel_function_table;
mod m20260812_000009_create_customer_bowel_function_table;
mod m20260812_000010_create_pre_existing_conditions_table;
mod m20260812_000011_create_customer_pre_existing_conditions_table;
mod m20260812_000012_create_clinical_conditions_table;
mod m20260812_000013_create_daily_meal_table;
mod m20260812_000014_create_customer_daily_meal_table;
mod m20260812_000015_create_formula_table;
mod m20260812_000016_create_activity_factor_table;
mod m20260812_000017_create_objective_table;
mod m20260812_000018_create_physical_activity_level_table;
mod m20260812_000019_create_customer_goal_setting_table;
mod m20260812_000020_create_province_table;
mod m20260812_000021_create_city_table;
mod m20260812_000022_dataload_provinces_and_cities;
mod m20260813_000026_create_ingredient_table;
mod m20260813_000027_create_cycle_table;
mod m20260813_000028_create_eat_tables;
mod m20260813_000029_create_meal_plan_tables;
mod m20260814_000032_create_analysis_job_table;
mod m20260814_000033_create_meal_log_table;
mod m20260814_000035_create_meal_point_tier_table;
mod m20260814_000036_create_point_transaction_table;
mod m20260819_000041_create_payment_date_table;
mod m20260819_000042_create_doctor_table;
mod m20260821_000043_add_country_code_to_province;
mod m20260821_000044_dataload_us_provinces_and_cities;
mod m20260821_000045_add_catalog_name_unique_indexes;

mod m20260828_000046_create_card_payment_foundation;
mod m20260828_000047_add_card_submission_result;
mod m20260901_000048_create_business_plan_table;
mod m20260901_000049_ai_quota;
mod m20260901_000050_business_plan_tiers;
mod m20260901_000051_ingredient_taco_fields;
mod m20260902_000001_add_tenant_business_plan_id;
mod m20260902_000002_create_tenant_plan_table;
mod m20260902_000003_meal_log_manual_analysis;
mod m20260902_000004_create_account_deletion;
mod m20260902_000005_create_data_access_log;
mod m20260902_000006_create_legal_consent;
mod m20260903_000001_payment_schedule;
mod m20260903_000002_rename_charge_sequence;
mod m20260904_000001_asaas_pix_foundation;
mod m20260904_000002_pix_attempt;
mod m20260904_000003_card_on_file;
mod m20260904_000004_payment_reversal;
mod m20260904_000005_merchant_capabilities;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260812_000001_create_table_user::Migration),
            Box::new(m20260812_000002_create_tenant_table::Migration),
            Box::new(m20260812_000003_create_prepare_meal_table::Migration),
            Box::new(m20260812_000004_create_clinical_plan_table::Migration),
            Box::new(m20260812_000005_create_customer_table::Migration),
            Box::new(m20260812_000006_create_dietary_restriction_table::Migration),
            Box::new(m20260812_000007_create_customer_dietary_restriction_table::Migration),
            Box::new(m20260812_000008_create_bowel_function_table::Migration),
            Box::new(m20260812_000009_create_customer_bowel_function_table::Migration),
            Box::new(m20260812_000010_create_pre_existing_conditions_table::Migration),
            Box::new(m20260812_000011_create_customer_pre_existing_conditions_table::Migration),
            Box::new(m20260812_000012_create_clinical_conditions_table::Migration),
            Box::new(m20260812_000013_create_daily_meal_table::Migration),
            Box::new(m20260812_000014_create_customer_daily_meal_table::Migration),
            Box::new(m20260812_000015_create_formula_table::Migration),
            Box::new(m20260812_000016_create_activity_factor_table::Migration),
            Box::new(m20260812_000017_create_objective_table::Migration),
            Box::new(m20260812_000018_create_physical_activity_level_table::Migration),
            Box::new(m20260812_000019_create_customer_goal_setting_table::Migration),
            Box::new(m20260812_000020_create_province_table::Migration),
            Box::new(m20260812_000021_create_city_table::Migration),
            Box::new(m20260813_000026_create_ingredient_table::Migration),
            Box::new(m20260813_000027_create_cycle_table::Migration),
            Box::new(m20260813_000028_create_eat_tables::Migration),
            Box::new(m20260819_000042_create_doctor_table::Migration),
            Box::new(m20260813_000029_create_meal_plan_tables::Migration),
            Box::new(m20260814_000032_create_analysis_job_table::Migration),
            Box::new(m20260814_000033_create_meal_log_table::Migration),
            Box::new(m20260814_000035_create_meal_point_tier_table::Migration),
            Box::new(m20260814_000036_create_point_transaction_table::Migration),
            Box::new(m20260819_000041_create_payment_date_table::Migration),
            Box::new(m20260812_000022_dataload_provinces_and_cities::Migration),
            Box::new(m20260821_000043_add_country_code_to_province::Migration),
            Box::new(m20260821_000044_dataload_us_provinces_and_cities::Migration),
            Box::new(m20260821_000045_add_catalog_name_unique_indexes::Migration),
            Box::new(m20260828_000046_create_card_payment_foundation::Migration),
            Box::new(m20260828_000047_add_card_submission_result::Migration),
            Box::new(m20260901_000048_create_business_plan_table::Migration),
            Box::new(m20260901_000049_ai_quota::Migration),
            Box::new(m20260901_000050_business_plan_tiers::Migration),
            Box::new(m20260901_000051_ingredient_taco_fields::Migration),
            Box::new(m20260902_000001_add_tenant_business_plan_id::Migration),
            Box::new(m20260902_000002_create_tenant_plan_table::Migration),
            Box::new(m20260902_000003_meal_log_manual_analysis::Migration),
            Box::new(m20260902_000004_create_account_deletion::Migration),
            Box::new(m20260902_000005_create_data_access_log::Migration),
            Box::new(m20260902_000006_create_legal_consent::Migration),
            Box::new(m20260903_000001_payment_schedule::Migration),
            Box::new(m20260903_000002_rename_charge_sequence::Migration),
            Box::new(m20260904_000001_asaas_pix_foundation::Migration),
            Box::new(m20260904_000002_pix_attempt::Migration),
            Box::new(m20260904_000003_card_on_file::Migration),
            Box::new(m20260904_000004_payment_reversal::Migration),
            Box::new(m20260904_000005_merchant_capabilities::Migration),
        ]
    }
}
