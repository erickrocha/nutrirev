use axum::{
	http::{header, Method},
	routing::{get},
	Router,
};
use business::sea_orm::{ConnectionTrait, Database, DatabaseConnection, Statement};
use migration::{Migrator, MigratorTrait};
use std::env;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use utoipa::openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme};
use utoipa::{Modify, OpenApi};
use utoipa_swagger_ui::SwaggerUi;

mod authentication;
mod commons;
mod http;
mod infrastructure;
pub mod routes;

use crate::http::welcome_controller::welcome;
use crate::routes::authentication_routes::auth_routes;
use crate::routes::legal_routes::legal_routes;
use crate::routes::tenant_routes::tenant_routes;
use crate::routes::business_plan_routes::business_plan_routes;
use crate::routes::sysadmin_dashboard_routes::sysadmin_dashboard_routes;
use crate::routes::tenant_dashboard_routes::tenant_dashboard_routes;
use crate::routes::user_routes::user_routes;
use crate::routes::prepare_meal_routes::prepare_meal_routes;
use crate::routes::clinical_plan_routes::clinical_plan_routes;
use crate::routes::customer_routes::customer_routes;
use crate::routes::dietary_restriction_routes::dietary_restriction_routes;
use crate::routes::customer_dietary_restriction_routes::customer_dietary_restriction_routes;
use crate::routes::bowel_function_routes::bowel_function_routes;
use crate::routes::customer_bowel_function_routes::customer_bowel_function_routes;
use crate::routes::pre_existing_conditions_routes::pre_existing_conditions_routes;
use crate::routes::customer_pre_existing_conditions_routes::customer_pre_existing_conditions_routes;
use crate::routes::clinical_conditions_routes::clinical_conditions_routes;
use crate::routes::daily_meal_routes::daily_meal_routes;
use crate::routes::customer_daily_meal_routes::customer_daily_meal_routes;
use crate::routes::formula_routes::formula_routes;
use crate::routes::activity_factor_routes::activity_factor_routes;
use crate::routes::objective_routes::objective_routes;
use crate::routes::physical_activity_level_routes::physical_activity_level_routes;
use crate::routes::customer_goal_setting_routes::customer_goal_setting_routes;
use crate::routes::payment_date_routes::payment_date_routes;
use crate::routes::doctor_routes::doctor_routes;
use crate::routes::province_routes::province_routes;
use crate::routes::city_routes::city_routes;
use crate::routes::ingredient_routes::ingredient_routes;
use crate::routes::cycle_routes::cycle_routes;
use crate::routes::eat_routes::eat_routes;
use crate::routes::meal_plan_routes::meal_plan_routes;
use crate::routes::meal_analysis_routes::meal_analysis_routes;
use crate::routes::meal_log_routes::meal_log_routes;
use crate::routes::meal_point_tier_routes::meal_point_tier_routes;
use crate::routes::points_routes::points_routes;
use crate::routes::body_analysis_routes::body_analysis_routes;
use crate::routes::card_payment_routes::card_payment_routes;
use crate::routes::payment_webhook_routes::payment_webhook_routes;
use crate::routes::pix_payment_routes::pix_payment_routes;
use crate::routes::payment_settings_routes::payment_settings_routes;
use crate::routes::recurring_payment_routes::recurring_payment_routes;
use crate::routes::payment_charge_routes::payment_charge_routes;


struct SecurityAddon;

impl Modify for SecurityAddon {
	fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
		if let Some(components) = openapi.components.as_mut() {
			components.add_security_scheme(
				"bearer_auth",
				SecurityScheme::Http(
					HttpBuilder::new()
						.scheme(HttpAuthScheme::Bearer)
						.bearer_format("JWT")
						.build(),
				),
			);
		}
	}
}

#[derive(OpenApi)]
#[openapi(
	modifiers(&SecurityAddon),
	paths(
		http::auth_controller::sign_in,
		http::auth_controller::refresh_token,
		http::tenant_controller::add,
		http::tenant_controller::get_by_id,
		http::tenant_controller::get_by_uuid,
		http::tenant_controller::list_all,
		http::tenant_controller::update,
		http::tenant_controller::add_plan,
		http::tenant_controller::get_active_plan,
		http::business_plan_controller::add,
		http::business_plan_controller::list_all,
		http::business_plan_controller::get_by_id,
		http::business_plan_controller::get_by_uuid,
		http::business_plan_controller::update,
		http::business_plan_controller::delete,
		http::sysadmin_dashboard_controller::get_dashboard,
		http::tenant_dashboard_controller::get_dashboard,
		http::user_controller::add,
		http::user_controller::get_by_id,
		http::user_controller::list_all,
		http::user_controller::update,
		http::user_controller::change_password,
		http::prepare_meal_controller::add,
		http::prepare_meal_controller::get_by_id,
		http::prepare_meal_controller::get_by_uuid,
		http::prepare_meal_controller::list_all,
		http::prepare_meal_controller::update,
		http::clinical_plan_controller::add,
		http::clinical_plan_controller::get_by_id,
		http::clinical_plan_controller::get_by_uuid,
		http::clinical_plan_controller::list_all,
		http::clinical_plan_controller::update,
		http::customer_controller::add,
		http::customer_controller::get_by_id,
		http::customer_controller::get_by_uuid,
		http::customer_controller::get_by_user_id,
		http::customer_controller::get_me,
		http::customer_controller::list_all,
		http::customer_controller::update,
		http::customer_controller::enable_mobile,
		http::customer_controller::get_photo_presigned_url,
		http::customer_controller::confirm_photo_upload,
		http::customer_controller::upload_photo,
		http::dietary_restriction_controller::add,
		http::dietary_restriction_controller::get_by_id,
		http::dietary_restriction_controller::get_by_uuid,
		http::dietary_restriction_controller::list_all,
		http::dietary_restriction_controller::update,
		http::customer_dietary_restriction_controller::add,
		http::customer_dietary_restriction_controller::get_by_customer_id,
		http::customer_dietary_restriction_controller::list_all,
		http::customer_dietary_restriction_controller::delete,
		http::bowel_function_controller::add,
		http::bowel_function_controller::get_by_id,
		http::bowel_function_controller::get_by_uuid,
		http::bowel_function_controller::list_all,
		http::bowel_function_controller::update,
		http::customer_bowel_function_controller::add,
		http::customer_bowel_function_controller::get_by_customer_id,
		http::customer_bowel_function_controller::list_all,
		http::customer_bowel_function_controller::delete,
		http::pre_existing_conditions_controller::add,
		http::pre_existing_conditions_controller::get_by_id,
		http::pre_existing_conditions_controller::get_by_uuid,
		http::pre_existing_conditions_controller::list_all,
		http::pre_existing_conditions_controller::update,
		http::customer_pre_existing_conditions_controller::add,
		http::customer_pre_existing_conditions_controller::get_by_customer_id,
		http::customer_pre_existing_conditions_controller::list_all,
		http::customer_pre_existing_conditions_controller::delete,
		http::clinical_conditions_controller::add,
		http::clinical_conditions_controller::get_by_id,
		http::clinical_conditions_controller::get_by_uuid,
		http::clinical_conditions_controller::list_all,
		http::clinical_conditions_controller::update,
		http::catalog_csv_import_controller::import_clinical_conditions,
		http::catalog_csv_import_controller::import_dietary_restrictions,
		http::catalog_csv_import_controller::import_ingredients,
		http::catalog_csv_import_controller::import_pre_existing_conditions,
		http::daily_meal_controller::add,
		http::daily_meal_controller::get_by_id,
		http::daily_meal_controller::get_by_uuid,
		http::daily_meal_controller::list_all,
		http::daily_meal_controller::update,
		http::customer_daily_meal_controller::add,
		http::customer_daily_meal_controller::get_by_customer_id,
		http::customer_daily_meal_controller::list_all,
		http::customer_daily_meal_controller::delete,
		http::formula_controller::add,
		http::formula_controller::get_by_id,
		http::formula_controller::get_by_uuid,
		http::formula_controller::list_all,
		http::formula_controller::update,
		http::activity_factor_controller::add,
		http::activity_factor_controller::get_by_id,
		http::activity_factor_controller::get_by_uuid,
		http::activity_factor_controller::list_all,
		http::activity_factor_controller::update,
		http::objective_controller::add,
		http::objective_controller::get_by_id,
		http::objective_controller::get_by_uuid,
		http::objective_controller::list_all,
		http::objective_controller::update,
		http::physical_activity_level_controller::add,
		http::physical_activity_level_controller::get_by_id,
		http::physical_activity_level_controller::get_by_uuid,
		http::physical_activity_level_controller::list_all,
		http::physical_activity_level_controller::update,
		http::customer_goal_setting_controller::add,
		http::customer_goal_setting_controller::get_by_id,
		http::customer_goal_setting_controller::get_by_uuid,
		http::customer_goal_setting_controller::list_all,
		http::customer_goal_setting_controller::update,
		http::payment_date_controller::add,
		http::payment_date_controller::get_by_id,
		http::payment_date_controller::get_by_uuid,
		http::payment_date_controller::list_all,
		http::payment_date_controller::update,
		http::doctor_controller::add,
		http::doctor_controller::get_by_id,
		http::doctor_controller::get_by_uuid,
		http::doctor_controller::list_all,
		http::doctor_controller::update,
		http::doctor_controller::delete,
		http::province_controller::list_all,
		http::province_controller::get_by_id,
		http::city_controller::list_all,
		http::city_controller::get_by_province,
		http::city_controller::get_by_id,
		http::cycle_controller::add,
		http::cycle_controller::get_by_id,
		http::cycle_controller::get_by_uuid,
		http::cycle_controller::list_all,
		http::cycle_controller::update,
		http::cycle_controller::delete,
		http::eat_controller::add,
		http::eat_controller::get_by_id,
		http::eat_controller::get_by_uuid,
		http::eat_controller::list_paginated,
		http::eat_controller::list_all,
		http::eat_controller::update,
		http::eat_controller::increment_views,
		http::eat_controller::increment_additions,
		http::eat_controller::delete,
		http::eat_controller::get_photo_presigned_url,
		http::eat_controller::confirm_photo_upload,
		http::eat_controller::upload_photo,
		http::ingredient_controller::add,
		http::ingredient_controller::get_by_id,
		http::ingredient_controller::get_by_uuid,
		http::ingredient_controller::list_all,
		http::ingredient_controller::update,
		http::ingredient_controller::delete,
		http::meal_analysis_controller::analyze_meal,
		http::meal_analysis_controller::analyze_meal_manual,
		http::meal_analysis_controller::get_meal_analysis_status,
		http::meal_log_controller::save_meal_log,
		http::meal_log_controller::list_meal_logs,
		http::meal_plan_controller::add,
		http::meal_plan_controller::get_by_id,
		http::meal_plan_controller::get_by_uuid,
		http::meal_plan_controller::list_all,
		http::meal_plan_controller::list_paginated,
		http::meal_plan_controller::update,
		http::meal_plan_controller::toggle_favorite,
		http::meal_plan_controller::delete,
		http::meal_point_tier_controller::add,
		http::meal_point_tier_controller::update,
		http::meal_point_tier_controller::get_by_id,
		http::meal_point_tier_controller::list_all,
		http::points_controller::get_my_balance,
		http::body_analysis_controller::analyze_body,
		http::body_analysis_controller::get_body_analysis_status,
		http::card_payment_controller::authorize,
		http::payment_charge_controller::list_charges,
		http::payment_charge_controller::prepare_charge,
		http::payment_charge_controller::list_reversals,
		http::payment_settings_controller::provision,
		http::payment_settings_controller::list_connections,
		http::payment_settings_controller::select,
		http::payment_settings_controller::offered_methods,
		http::payment_settings_controller::admin_list,
		http::payment_settings_controller::admin_update,
		http::payment_settings_controller::admin_disable,
		http::payment_settings_controller::admin_delete,
		http::pix_payment_controller::create_pix_charge,
		http::pix_payment_controller::attempt_status,
		http::pix_payment_controller::cancel,
		http::recurring_payment_controller::enable_recurring,
		http::recurring_payment_controller::disable_recurring,
		http::recurring_payment_controller::billing_mode,
	),
	components(
		schemas(
			http::json::user_json::UserJson,
			http::json::login_request::LoginRequest,
			http::json::change_password_request::ChangePasswordRequest,
			http::json::refresh_token_request::RefreshTokenRequest,
			http::json::access_token_json::AccessTokenJson,
			http::json::tenant_json::TenantJson,
			http::json::tenant_plan_json::TenantPlanJson,
			http::json::business_plan_json::CreateBusinessPlanJson,
			http::json::business_plan_json::UpdateBusinessPlanJson,
			http::json::business_plan_json::BusinessPlanJson,
			http::json::sysadmin_dashboard_json::SysAdminDashboardJson,
			http::json::sysadmin_dashboard_json::SysAdminDashboardTotalsJson,
			http::json::sysadmin_dashboard_json::RecentSysAdminTenantJson,
			http::json::sysadmin_dashboard_json::BillingAttentionItemJson,
			http::json::tenant_dashboard_json::TenantDashboardJson,
			http::json::tenant_dashboard_json::TenantDashboardTotalsJson,
			http::json::tenant_dashboard_json::RecentTenantCustomerJson,
			http::json::prepare_meal_json::PrepareMealJson,
			http::json::clinical_plan_json::ClinicalPlanJson,
			http::json::customer_json::CustomerJson,
			http::json::dietary_restriction_json::DietaryRestrictionJson,
			http::json::customer_dietary_restriction_json::CustomerDietaryRestrictionJson,
			http::json::bowel_function_json::BowelFunctionJson,
			http::json::customer_bowel_function_json::CustomerBowelFunctionJson,
			http::json::pre_existing_conditions_json::PreExistingConditionsJson,
			http::json::customer_pre_existing_conditions_json::CustomerPreExistingConditionsJson,
			http::json::clinical_conditions_json::ClinicalConditionsJson,
			http::json::catalog_csv_import_json::CsvImportResponseJson,
			http::json::catalog_csv_import_json::CsvImportErrorResponseJson,
			http::json::catalog_csv_import_json::CsvImportValidationErrorJson,
			http::json::daily_meal_json::DailyMealJson,
			http::json::customer_daily_meal_json::CustomerDailyMealJson,
			http::json::formula_json::FormulaJson,
			http::json::activity_factor_json::ActivityFactorJson,
			http::json::objective_json::ObjectiveJson,
			http::json::physical_activity_level_json::PhysicalActivityLevelJson,
			http::json::customer_goal_setting_json::CustomerGoalSettingJson,
			http::json::payment_date_json::PaymentDateJson,
			http::json::payment_charge_json::PaymentChargeJson,
			http::json::payment_charge_json::PrepareChargePaymentJson,
			http::json::payment_charge_json::PreparedAttemptJson,
			http::json::payment_reversal_json::PaymentReversalJson,
			http::json::payment_settings_json::ProvisionConnectionJson,
			http::json::payment_settings_json::SelectConnectionJson,
			http::json::payment_settings_json::UpdateConnectionJson,
			http::json::payment_settings_json::PaymentConnectionJson,
			http::json::payment_settings_json::OfferedMethodsJson,
			http::json::pix_payment_json::CreatePixChargeJson,
			http::json::pix_payment_json::PixChargeJson,
			http::json::pix_payment_json::AttemptStatusJson,
			http::json::recurring_payment_json::SaveCardJson,
			http::json::recurring_payment_json::SavedCardJson,
			http::json::recurring_payment_json::SubscriptionBillingJson,
			http::json::doctor_json::DoctorJson,
			http::json::province_json::ProvinceJson,
			http::json::city_json::CityJson,
			http::json::cycle_json::CycleJson,
			http::json::ingredient_json::IngredientJson,
			http::json::eat_json::EatJson,
			http::json::eat_json::EatMealJson,
			http::json::eat_json::EatTagJson,
			http::json::eat_json::EatIngredientJson,
			http::json::eat_json::EatRestrictionJson,
			http::json::eat_json::EatDirectionJson,
			http::json::eat_json::EatBiotypeJson,
			http::json::eat_json::MacrosTotalJson,
			http::json::meal_analysis_json::MealAnalysisResponseV1,
			http::json::meal_analysis_json::FoodItemJson,
			http::json::meal_analysis_json::MacrosJson,
			http::json::meal_analysis_json::MealAnalysisErrorJson,
			http::json::meal_analysis_json::MealAnalysisStatusJson,
			http::json::meal_analysis_json::ManualMealIngredientItemJson,
			http::json::meal_analysis_json::ManualMealAnalysisRequestJson,
			http::json::meal_analysis_json::ManualMealAnalysisResponseJson,
			http::json::meal_log_json::SaveMealLogRequestJson,
			http::json::meal_log_json::MealLogResponseJson,
			http::json::meal_log_json::MealLogEntryJson,
			http::json::meal_log_json::DailyNutritionSummaryJson,
			http::json::meal_point_tier_json::SaveMealPointTierRequestJson,
			http::json::meal_point_tier_json::MealPointTierResponseJson,
			http::json::meal_plan_json::MealPlanJson,
			http::json::meal_plan_json::MealPlanMealJson,
			http::json::meal_plan_json::MealPlanOptionJson,
			http::json::meal_plan_json::MealPlanItemJson,
			http::json::meal_plan_json::MealPlanMacrosJson,
			http::json::points_json::PointsBalanceJson,
			http::json::body_analysis_json::BodyAnalysisResponseV1,
			http::json::body_analysis_json::BodyAnalysisStatusJson,
			http::json::body_analysis_json::BodyAnalysisErrorJson,
			http::json::body_analysis_json::BodyFatEstimateJson,
			http::json::body_analysis_json::MuscleMassAnalysisJson,
			http::json::body_analysis_json::BodyMetricsEstimateJson,
			http::json::body_analysis_json::PostureAndSymmetryJson,
			http::json::body_analysis_json::BodyRecommendationsJson,
			http::json::body_analysis_json::BodyMeasurementsJson,
			http::json::error_response_json::ErrorResponseJson,
			http::json::error_response_json::BadRequestErrorJson,
			http::json::error_response_json::UnauthorizedErrorJson,
			http::json::error_response_json::ForbiddenErrorJson,
			http::json::error_response_json::NotFoundErrorJson,
			http::json::error_response_json::InternalServerErrorJson,
		),
	),
	tags(
        (name = "NutriRev", description = "REST API for NutriRev")
	)
)]
struct ApiDoc;

// ==================== Route Builders ====================
/// Build public welcome route
fn welcome_route() -> Router<AppState> {
	Router::new()
		.route("/", get(welcome))
}

#[tokio::main]
async fn start() -> anyhow::Result<()> {
	env::set_var("RUST_LOG", "debug");
	tracing_subscriber::fmt::init();
	dotenvy::dotenv().ok();
	let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
	let host = env::var("HOST").expect("HOST is not set in .env file");
	let port = env::var("PORT").expect("PORT is not set in .env file");
	let server_url = format!("{host}:{port}");

	let connection = Database::connect(&db_url)
		.await
		.expect("Failed to connect to database");

	// Multiple instances can boot concurrently (App Runner scale-out, rolling deploys).
	// Serialize migrations with a DB-level advisory lock so they don't race on the same DDL.
	let backend = connection.get_database_backend();
	let lock_row = connection
		.query_one_raw(Statement::from_string(
			backend,
			"SELECT GET_LOCK('nutrirev_migrations', 30) AS acquired".to_owned(),
		))
		.await?
		.expect("GET_LOCK query returned no rows");
	let acquired: i64 = lock_row.try_get("", "acquired").unwrap_or(0);
	if acquired != 1 {
		anyhow::bail!("Could not acquire migration lock within timeout");
	}

	let migration_result = Migrator::up(&connection, None).await;

	connection
		.execute_unprepared("SELECT RELEASE_LOCK('nutrirev_migrations')")
		.await
		.ok();

	migration_result?;

	business::use_cases::user_use_case::UserUseCase::seed_sysadmin(&connection).await;

	let state = AppState {
		conn: Arc::new(connection),
	};

	if business::use_cases::image_storage_use_case::ImageStorageUseCase::get_storage_mode()
		== business::use_cases::image_storage_use_case::StorageMode::S3
	{
		infrastructure::sqs_worker::start(Arc::clone(&state.conn));
	}

	// On by default: a clinic that never runs the worker silently stops billing.
	// The flag exists so local runs and one-off scripts can opt out.
	if std::env::var("BILLING_WORKER_ENABLED")
		.map(|value| !matches!(value.trim().to_ascii_lowercase().as_str(), "false" | "0" | "off"))
		.unwrap_or(true)
	{
		infrastructure::billing_worker::start(Arc::clone(&state.conn));
	}

	log::info!("Starting server...");

	let cors = CorsLayer::new()
		.allow_methods([
			Method::GET,
			Method::POST,
			Method::PUT,
			Method::PATCH,
			Method::DELETE,
			Method::HEAD,
		])
		.allow_origin(Any)
		.allow_headers([
			header::CONTENT_TYPE,
			header::AUTHORIZATION,
			header::ACCEPT,
			header::ORIGIN,
			header::ACCESS_CONTROL_ALLOW_ORIGIN,
			header::ACCESS_CONTROL_ALLOW_METHODS,
			header::ACCESS_CONTROL_ALLOW_HEADERS,
		]);

	let app = Router::new()
		.merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))

		// Public routes (no authentication)
		.merge(welcome_route())
		.merge(auth_routes(state.clone()))
		.merge(legal_routes(state.clone()))
		// API routes with authentication
		.nest("/tenant", tenant_routes(state.clone()))
		.nest("/business-plan", business_plan_routes(state.clone()))
		.merge(sysadmin_dashboard_routes(state.clone()))
		.merge(tenant_dashboard_routes(state.clone()))
		.nest("/user", user_routes(state.clone()))
		.nest("/prepare-meal", prepare_meal_routes(state.clone()))
		.nest("/clinical-plan", clinical_plan_routes(state.clone()))
		.nest("/customer", customer_routes(state.clone()))
		.nest("/dietary-restriction", dietary_restriction_routes(state.clone()))
		.nest("/customer-dietary-restriction", customer_dietary_restriction_routes(state.clone()))
		.nest("/bowel-function", bowel_function_routes(state.clone()))
		.nest("/customer-bowel-function", customer_bowel_function_routes(state.clone()))
		.nest("/pre-existing-conditions", pre_existing_conditions_routes(state.clone()))
		.nest("/customer-pre-existing-conditions", customer_pre_existing_conditions_routes(state.clone()))
		.nest("/clinical-conditions", clinical_conditions_routes(state.clone()))
		.nest("/daily-meal", daily_meal_routes(state.clone()))
		.nest("/customer-daily-meal", customer_daily_meal_routes(state.clone()))
		.nest("/formula", formula_routes(state.clone()))
		.nest("/activity-factor", activity_factor_routes(state.clone()))
		.nest("/objective", objective_routes(state.clone()))
		.nest("/physical-activity-level", physical_activity_level_routes(state.clone()))
		.nest("/customer-goal-setting", customer_goal_setting_routes(state.clone()))
		.nest("/payment-date", payment_date_routes(state.clone()))
		.nest("/doctor", doctor_routes(state.clone()))
		.nest("/province", province_routes(state.clone()))
		.nest("/city", city_routes(state.clone()))
		.nest("/ingredient", ingredient_routes(state.clone()))
		.nest("/cycle", cycle_routes(state.clone()))
		.nest("/eat", eat_routes(state.clone()))
		.nest("/meal-plan", meal_plan_routes(state.clone()))
		.nest("/v1/meals", meal_analysis_routes(state.clone()))
		.nest("/v1/meals", meal_log_routes(state.clone()))
		.nest("/meal-point-tier", meal_point_tier_routes(state.clone()))
		.nest("/v1/points", points_routes(state.clone()))
		.nest("/v1/body", body_analysis_routes(state.clone()))
		.nest("/v1/card-payments", card_payment_routes(state.clone()))
		.nest("/v1/payments", payment_charge_routes(state.clone()))
		.nest("/v1/payments", pix_payment_routes(state.clone()))
		.nest("/v1/payments", recurring_payment_routes(state.clone()))
		.nest("/v1/payments", payment_settings_routes(state.clone()))
		// No authentication layer: the handler verifies the clinic's own secret.
		.nest("/v1/payments/webhooks", payment_webhook_routes())
		.layer(cors)
		.with_state(state);

	let listener = tokio::net::TcpListener::bind(&server_url).await?;
	log::info!("Server started on address {}", server_url);
	axum::serve(listener, app).await?;

	Ok(())
}

#[derive(Clone)]
pub struct AppState {
	pub conn: Arc<DatabaseConnection>,
}

pub fn main() {
	let result = start();

	if let Some(err) = result.err() {
		println!("Error: {err}");
	}
}
