use std::str::FromStr;
use crate::http::json::access_token_json::AccessTokenJson;
use crate::http::json::tenant_json::TenantJson;
use crate::http::json::tenant_plan_json::TenantPlanJson;
use crate::http::json::user_json::UserJson;
use crate::http::json::prepare_meal_json::PrepareMealJson;
use crate::http::json::clinical_plan_json::ClinicalPlanJson;
use crate::http::json::customer_json::CustomerJson;
use crate::http::json::dietary_restriction_json::DietaryRestrictionJson;
use crate::http::json::customer_dietary_restriction_json::CustomerDietaryRestrictionJson;
use crate::http::json::bowel_function_json::BowelFunctionJson;
use crate::http::json::customer_bowel_function_json::CustomerBowelFunctionJson;
use crate::http::json::pre_existing_conditions_json::PreExistingConditionsJson;
use crate::http::json::customer_pre_existing_conditions_json::CustomerPreExistingConditionsJson;
use crate::http::json::clinical_conditions_json::ClinicalConditionsJson;
use crate::http::json::daily_meal_json::DailyMealJson;
use crate::http::json::customer_daily_meal_json::CustomerDailyMealJson;
use crate::http::json::formula_json::FormulaJson;
use crate::http::json::activity_factor_json::ActivityFactorJson;
use crate::http::json::objective_json::ObjectiveJson;
use crate::http::json::physical_activity_level_json::PhysicalActivityLevelJson;
use crate::http::json::customer_goal_setting_json::CustomerGoalSettingJson;
use crate::http::json::payment_charge_json::PaymentChargeJson;
use crate::http::json::payment_date_json::PaymentDateJson;
use crate::http::json::doctor_json::DoctorJson;
use crate::http::json::province_json::ProvinceJson;
use crate::http::json::city_json::CityJson;

use business::domain::access_token::AccessToken;
use business::domain::enums::Role;
use business::domain::tenant::Tenant;
use business::domain::tenant_plan::TenantPlan;
use business::domain::user::User;
use business::domain::prepare_meal::PrepareMeal;
use business::domain::clinical_plan::ClinicalPlan;
use business::domain::customer::Customer;
use business::domain::dietary_restriction::DietaryRestriction;
use business::domain::customer_dietary_restriction::CustomerDietaryRestriction;
use business::domain::bowel_function::BowelFunction;
use business::domain::customer_bowel_function::CustomerBowelFunction;
use business::domain::pre_existing_conditions::PreExistingConditions;
use business::domain::customer_pre_existing_conditions::CustomerPreExistingConditions;
use business::domain::clinical_conditions::ClinicalConditions;
use business::domain::daily_meal::DailyMeal;
use business::domain::customer_daily_meal::CustomerDailyMeal;
use business::domain::formula::Formula;
use business::domain::activity_factor::ActivityFactor;
use business::domain::objective::Objective;
use business::domain::physical_activity_level::PhysicalActivityLevel;
use business::domain::customer_goal_setting::CustomerGoalSetting;
use business::domain::payment_date::PaymentDate;
use business::domain::payment_records::PaymentCharge;
use business::domain::payment_schedule::{BillingMode, SubscriptionStatus};
use business::domain::doctor::Doctor;
use business::domain::province::Province;
use business::domain::city::City;


pub trait Mapper<T, U> {
    fn json(t: T) -> U;

    fn domain(u: U) -> T;

    fn json_vec(u: Vec<T>) -> Vec<U> {
        u.into_iter().map(Self::json).collect()
    }
}

pub struct AccessTokenMapper {}

impl Mapper<AccessToken, AccessTokenJson> for AccessTokenMapper {
    fn json(access_token: AccessToken) -> AccessTokenJson {
        AccessTokenJson {
            access_token: access_token.access_token,
            token_type: access_token.token_type,
            expire_in: access_token.expire_in,
            refresh_token: access_token.refresh_token,
            email: access_token.email,
            uuid: access_token.uuid,
            name: access_token.name,
            user_id: access_token.user_id,
            role: access_token.role,
            tenant_id: access_token.tenant_id,
            first_login: access_token.first_login,
        }
    }

    fn domain(u: AccessTokenJson) -> AccessToken {
        AccessToken {
            access_token: u.access_token,
            token_type: u.token_type,
            expire_in: u.expire_in,
            refresh_token: u.refresh_token,
            email: u.email,
            uuid: u.uuid,
            name: u.name,
            user_id: u.user_id,
            role: u.role,
            tenant_id: u.tenant_id,
            first_login: u.first_login,
        }
    }
}

pub struct UserMapper {}

impl Mapper<User, UserJson> for UserMapper {
    fn json(user: User) -> UserJson {
        UserJson {
            id: user.id,
            uuid: user.uuid,
            name: user.name,
            email: user.email,
            password: user.password,
            enabled: user.enabled,
            first_login: user.first_login,
            role: user.role.to_string(),
            tenant_id: user.tenant_id,
            created_at: user.created_at,
            created_by: user.created_by,
            updated_at: user.updated_at,
            updated_by: user.updated_by,
        }
    }

    fn domain(u: UserJson) -> User {
        User {
            id: u.id,
            uuid: u.uuid,
            email: u.email,
            name: u.name,
            password: u.password,
            enabled: u.enabled,
            first_login: u.first_login,
            role: Role::from_str(&u.role).unwrap(),
            tenant_id: u.tenant_id,
            created_at: u.created_at,
            created_by: u.created_by,
            updated_at: u.updated_at,
            updated_by: u.updated_by,
        }
    }
}

pub struct TenantMapper{}

fn optional_text(value: Option<String>) -> Option<String> {
    value.map(|value| value.trim().to_string()).filter(|value| !value.is_empty())
}

fn canonical_address(canonical: Option<String>, alias: Option<String>) -> Option<String> {
    optional_text(canonical).or_else(|| optional_text(alias))
}

fn country_code(value: Option<String>) -> Option<String> {
    optional_text(value).map(|value| value.to_uppercase())
}

#[cfg(test)]
mod address_mapping_tests {
    use super::{canonical_address, country_code, optional_text};

    #[test]
    fn canonical_address_wins_and_legacy_alias_fills_missing_value() {
        assert_eq!(canonical_address(Some("  Campinas ".into()), Some("São Paulo".into())), Some("Campinas".into()));
        assert_eq!(canonical_address(Some("  ".into()), Some(" São Paulo ".into())), Some("São Paulo".into()));
    }

    #[test]
    fn optional_address_values_are_cleaned_and_country_is_uppercase() {
        assert_eq!(optional_text(Some("  ".into())), None);
        assert_eq!(country_code(Some(" br ".into())), Some("BR".into()));
    }
}

impl Mapper<Tenant, TenantJson> for TenantMapper {
    fn json(t: Tenant) -> TenantJson {
        let province = t.administrative_area.clone();
        let city = t.locality.clone();
        let zipcode = t.postal_code.clone();
        TenantJson {
            id: t.id,
            uuid: t.uuid,
            name: t.name,
            tax_id: t.tax_id,
            email: t.email,
            phone: t.phone,
            address_line1: t.address_line1,
            address_line2: t.address_line2,
            locality: t.locality,
            administrative_area: t.administrative_area,
            postal_code: t.postal_code,
            country_code: t.country_code,
            province,
            city,
            zipcode,
            payment_grace_days: t.payment_grace_days,
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: TenantJson) -> Tenant {
        let locality = canonical_address(u.locality, u.city);
        let administrative_area = canonical_address(u.administrative_area, u.province);
        let postal_code = canonical_address(u.postal_code, u.zipcode);
        Tenant {
            id: u.id,
            uuid: u.uuid,
            name: u.name,
            tax_id: optional_text(u.tax_id),
            email: optional_text(u.email),
            phone: optional_text(u.phone),
            address_line1: optional_text(u.address_line1),
            address_line2: optional_text(u.address_line2),
            locality,
            administrative_area,
            postal_code,
            country_code: country_code(u.country_code),
            payment_grace_days: u.payment_grace_days,
            created_at: u.created_at,
            created_by: u.created_by,
            updated_at: u.updated_at,
            updated_by: u.updated_by,
        }
    }
}

pub struct PrepareMealMapper;
impl Mapper<PrepareMeal, PrepareMealJson> for PrepareMealMapper {
    fn json(t: PrepareMeal) -> PrepareMealJson {
        PrepareMealJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            name: t.name,
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: PrepareMealJson) -> PrepareMeal {
        PrepareMeal {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            name: u.name,
            created_at: u.created_at,
            created_by: u.created_by,
            updated_at: u.updated_at,
            updated_by: u.updated_by,
        }
    }
}

pub struct ClinicalPlanMapper;
impl Mapper<ClinicalPlan, ClinicalPlanJson> for ClinicalPlanMapper {
    fn json(t: ClinicalPlan) -> ClinicalPlanJson {
        ClinicalPlanJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            name: t.name,
            price_in_cents: t.price_in_cents,
            renew_period_days: t.renew_period_days,
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: ClinicalPlanJson) -> ClinicalPlan {
        ClinicalPlan {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            name: u.name,
            price_in_cents: u.price_in_cents,
            renew_period_days: u.renew_period_days,
            created_at: u.created_at,
            created_by: u.created_by,
            updated_at: u.updated_at,
            updated_by: u.updated_by,
        }
    }
}

pub struct CustomerMapper;
impl Mapper<Customer, CustomerJson> for CustomerMapper {
    fn json(t: Customer) -> CustomerJson {
        let photo_base64_str = t.photo_base64.as_ref().and_then(|bytes| String::from_utf8(bytes.clone()).ok());
        let photo_url = if let Some(ref b64) = photo_base64_str {
            Some(b64.clone())
        } else {
            t.photo.as_deref().filter(|key| !key.trim().is_empty()).and_then(|key| {
                business::use_cases::image_storage_use_case::ImageStorageUseCase::generate_cloudfront_signed_url(key).ok()
            })
        };

        let province = t.administrative_area.clone();
        let city = t.locality.clone();
        let zipcode = t.postal_code.clone();
        CustomerJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            name: t.name,
            email: t.email,
            phone: t.phone,
            date_of_birth: t.date_of_birth,
            gender: t.gender,
            address_line1: t.address_line1,
            address_line2: t.address_line2,
            locality: t.locality,
            administrative_area: t.administrative_area,
            postal_code: t.postal_code,
            country_code: t.country_code,
            province,
            city,
            zipcode,
            clinical_plan_id: t.clinical_plan_id,
            prepare_meal_id: t.prepare_meal_id,
            mobile_enabled: t.mobile_enabled,
            photo: t.photo,
            photo_url,
            photo_base64: photo_base64_str,
            user_id: t.user_id,
            tax_id: t.tax_id,
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: CustomerJson) -> Customer {
        let photo_base64 = u.photo_base64.filter(|p| !p.trim().is_empty()).map(|p| p.into_bytes());
        let locality = canonical_address(u.locality, u.city);
        let administrative_area = canonical_address(u.administrative_area, u.province);
        let postal_code = canonical_address(u.postal_code, u.zipcode);
        Customer {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            date_of_birth: u.date_of_birth,
            gender: u.gender,
            address_line1: optional_text(u.address_line1),
            address_line2: optional_text(u.address_line2),
            locality,
            administrative_area,
            postal_code,
            country_code: country_code(u.country_code),
            clinical_plan_id: u.clinical_plan_id,
            prepare_meal_id: u.prepare_meal_id,
            mobile_enabled: u.mobile_enabled,
            photo: u.photo.filter(|p| !p.trim().is_empty()),
            photo_base64,
            user_id: u.user_id,
            tax_id: u.tax_id,
            // Never taken from the request; the use case carries the stored
            // value forward, the same way it does for uuid and user_id.
            provider_customer_id: None,
            created_at: u.created_at,
            created_by: u.created_by,
            updated_at: u.updated_at,
            updated_by: u.updated_by,
        }
    }
}

pub struct DietaryRestrictionMapper;
impl Mapper<DietaryRestriction, DietaryRestrictionJson> for DietaryRestrictionMapper {
    fn json(t: DietaryRestriction) -> DietaryRestrictionJson {
        DietaryRestrictionJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            name: t.name,
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: DietaryRestrictionJson) -> DietaryRestriction {
        DietaryRestriction {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            name: u.name,
            created_at: u.created_at,
            created_by: u.created_by,
            updated_at: u.updated_at,
            updated_by: u.updated_by,
        }
    }
}

pub struct CustomerDietaryRestrictionMapper;
impl Mapper<CustomerDietaryRestriction, CustomerDietaryRestrictionJson> for CustomerDietaryRestrictionMapper {
    fn json(t: CustomerDietaryRestriction) -> CustomerDietaryRestrictionJson {
        CustomerDietaryRestrictionJson {
            customer_id: t.customer_id,
            dietary_restriction_id: t.dietary_restriction_id,
        }
    }

    fn domain(u: CustomerDietaryRestrictionJson) -> CustomerDietaryRestriction {
        CustomerDietaryRestriction {
            customer_id: u.customer_id,
            dietary_restriction_id: u.dietary_restriction_id,
        }
    }
}

pub struct BowelFunctionMapper;
impl Mapper<BowelFunction, BowelFunctionJson> for BowelFunctionMapper {
    fn json(t: BowelFunction) -> BowelFunctionJson {
        BowelFunctionJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            name: t.name,
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: BowelFunctionJson) -> BowelFunction {
        BowelFunction {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            name: u.name,
            created_at: u.created_at,
            created_by: u.created_by,
            updated_at: u.updated_at,
            updated_by: u.updated_by,
        }
    }
}

pub struct CustomerBowelFunctionMapper;
impl Mapper<CustomerBowelFunction, CustomerBowelFunctionJson> for CustomerBowelFunctionMapper {
    fn json(t: CustomerBowelFunction) -> CustomerBowelFunctionJson {
        CustomerBowelFunctionJson {
            customer_id: t.customer_id,
            bowel_function_id: t.bowel_function_id,
        }
    }

    fn domain(u: CustomerBowelFunctionJson) -> CustomerBowelFunction {
        CustomerBowelFunction {
            customer_id: u.customer_id,
            bowel_function_id: u.bowel_function_id,
        }
    }
}

pub struct PreExistingConditionsMapper;
impl Mapper<PreExistingConditions, PreExistingConditionsJson> for PreExistingConditionsMapper {
    fn json(t: PreExistingConditions) -> PreExistingConditionsJson {
        PreExistingConditionsJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            name: t.name,
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: PreExistingConditionsJson) -> PreExistingConditions {
        PreExistingConditions {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            name: u.name,
            created_at: u.created_at,
            created_by: u.created_by,
            updated_at: u.updated_at,
            updated_by: u.updated_by,
        }
    }
}

pub struct CustomerPreExistingConditionsMapper;
impl Mapper<CustomerPreExistingConditions, CustomerPreExistingConditionsJson> for CustomerPreExistingConditionsMapper {
    fn json(t: CustomerPreExistingConditions) -> CustomerPreExistingConditionsJson {
        CustomerPreExistingConditionsJson {
            customer_id: t.customer_id,
            pre_existing_conditions_id: t.pre_existing_conditions_id,
        }
    }

    fn domain(u: CustomerPreExistingConditionsJson) -> CustomerPreExistingConditions {
        CustomerPreExistingConditions {
            customer_id: u.customer_id,
            pre_existing_conditions_id: u.pre_existing_conditions_id,
        }
    }
}

pub struct ClinicalConditionsMapper;
impl Mapper<ClinicalConditions, ClinicalConditionsJson> for ClinicalConditionsMapper {
    fn json(t: ClinicalConditions) -> ClinicalConditionsJson {
        ClinicalConditionsJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            name: t.name,
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: ClinicalConditionsJson) -> ClinicalConditions {
        ClinicalConditions {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            name: u.name,
            created_at: u.created_at,
            created_by: u.created_by,
            updated_at: u.updated_at,
            updated_by: u.updated_by,
        }
    }
}

pub struct DailyMealMapper;
impl Mapper<DailyMeal, DailyMealJson> for DailyMealMapper {
    fn json(t: DailyMeal) -> DailyMealJson {
        DailyMealJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            name: t.name,
            code: t.code,
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: DailyMealJson) -> DailyMeal {
        DailyMeal {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            name: u.name,
            code: u.code,
            created_at: u.created_at,
            created_by: u.created_by,
            updated_at: u.updated_at,
            updated_by: u.updated_by,
        }
    }
}

pub struct CustomerDailyMealMapper;
impl Mapper<CustomerDailyMeal, CustomerDailyMealJson> for CustomerDailyMealMapper {
    fn json(t: CustomerDailyMeal) -> CustomerDailyMealJson {
        CustomerDailyMealJson {
            customer_id: t.customer_id,
            daily_meal_id: t.daily_meal_id,
        }
    }

    fn domain(u: CustomerDailyMealJson) -> CustomerDailyMeal {
        CustomerDailyMeal {
            customer_id: u.customer_id,
            daily_meal_id: u.daily_meal_id,
        }
    }
}

pub struct FormulaMapper;
impl Mapper<Formula, FormulaJson> for FormulaMapper {
    fn json(t: Formula) -> FormulaJson {
        FormulaJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            name: t.name,
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: FormulaJson) -> Formula {
        Formula {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            name: u.name,
            created_at: u.created_at,
            created_by: u.created_by,
            updated_at: u.updated_at,
            updated_by: u.updated_by,
        }
    }
}

pub struct ActivityFactorMapper;
impl Mapper<ActivityFactor, ActivityFactorJson> for ActivityFactorMapper {
    fn json(t: ActivityFactor) -> ActivityFactorJson {
        ActivityFactorJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            name: t.name,
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: ActivityFactorJson) -> ActivityFactor {
        ActivityFactor {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            name: u.name,
            created_at: u.created_at,
            created_by: u.created_by,
            updated_at: u.updated_at,
            updated_by: u.updated_by,
        }
    }
}

pub struct ObjectiveMapper;
impl Mapper<Objective, ObjectiveJson> for ObjectiveMapper {
    fn json(t: Objective) -> ObjectiveJson {
        ObjectiveJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            name: t.name,
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: ObjectiveJson) -> Objective {
        Objective {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            name: u.name,
            created_at: u.created_at,
            created_by: u.created_by,
            updated_at: u.updated_at,
            updated_by: u.updated_by,
        }
    }
}

pub struct PhysicalActivityLevelMapper;
impl Mapper<PhysicalActivityLevel, PhysicalActivityLevelJson> for PhysicalActivityLevelMapper {
    fn json(t: PhysicalActivityLevel) -> PhysicalActivityLevelJson {
        PhysicalActivityLevelJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            name: t.name,
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: PhysicalActivityLevelJson) -> PhysicalActivityLevel {
        PhysicalActivityLevel {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            name: u.name,
            created_at: u.created_at,
            created_by: u.created_by,
            updated_at: u.updated_at,
            updated_by: u.updated_by,
        }
    }
}

pub struct CustomerGoalSettingMapper;
impl Mapper<CustomerGoalSetting, CustomerGoalSettingJson> for CustomerGoalSettingMapper {
    fn json(t: CustomerGoalSetting) -> CustomerGoalSettingJson {
        CustomerGoalSettingJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            customer_id: t.customer_id,
            name: t.name,
            formula_id: t.formula_id,
            activity_factor_id: t.activity_factor_id,
            objective_id: t.objective_id,
            physical_activity_level_id: t.physical_activity_level_id,
            height: t.height,
            actual_weight: t.actual_weight,
            desired_weight: t.desired_weight,
            carbohydrate: t.carbohydrate,
            lipids: t.lipids,
            protein: t.protein,
            customer_caloric_goal: t.customer_caloric_goal,
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: CustomerGoalSettingJson) -> CustomerGoalSetting {
        CustomerGoalSetting {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            customer_id: u.customer_id,
            name: u.name,
            formula_id: u.formula_id,
            activity_factor_id: u.activity_factor_id,
            objective_id: u.objective_id,
            physical_activity_level_id: u.physical_activity_level_id,
            height: u.height,
            actual_weight: u.actual_weight,
            desired_weight: u.desired_weight,
            carbohydrate: u.carbohydrate,
            lipids: u.lipids,
            protein: u.protein,
            customer_caloric_goal: u.customer_caloric_goal,
            created_at: u.created_at,
            created_by: u.created_by,
            updated_at: u.updated_at,
            updated_by: u.updated_by,
        }
    }
}

pub struct PaymentDateMapper;
impl Mapper<PaymentDate, PaymentDateJson> for PaymentDateMapper {
    fn json(t: PaymentDate) -> PaymentDateJson {
        PaymentDateJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            customer_id: t.customer_id,
            clinical_plan_id: t.clinical_plan_id,
            first_due_date: Some(t.first_due_date),
            next_due_date: t.next_due_date,
            status: Some(t.status),
            billing_mode: Some(t.billing_mode),
            is_active: Some(t.is_active),
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: PaymentDateJson) -> PaymentDate {
        PaymentDate {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            customer_id: u.customer_id,
            clinical_plan_id: u.clinical_plan_id,
            first_due_date: u
                .first_due_date
                .unwrap_or_else(|| chrono::Utc::now().date_naive()),
            // Both are server-owned: the use case decides where the cycle sits
            // and whether the subscription is live, never the request body.
            next_due_date: None,
            status: SubscriptionStatus::Active.as_str().to_owned(),
            // Also server-owned, and changed only through the patient's own
            // billing-mode route. A staff edit of a due date must never switch
            // off someone's automatic billing or orphan their stored card.
            billing_mode: BillingMode::Manual.as_str().to_owned(),
            payment_token_id: None,
            is_active: u.is_active.unwrap_or(true),
            created_at: u.created_at,
            created_by: u.created_by,
            updated_at: u.updated_at,
            updated_by: u.updated_by,
        }
    }
}

pub struct DoctorMapper;
impl Mapper<Doctor, DoctorJson> for DoctorMapper {
    fn json(t: Doctor) -> DoctorJson {
        use base64::Engine;
        let photo_b64 = t.photo_base64.map(|bytes| base64::engine::general_purpose::STANDARD.encode(bytes));
        DoctorJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            name: t.name,
            document: t.document,
            date_of_birth: t.date_of_birth,
            photo_base64: photo_b64,
            city: t.city,
            province: t.province,
            email: t.email,
            phone: t.phone,
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: DoctorJson) -> Doctor {
        use base64::Engine;
        let photo_bytes = u.photo_base64.and_then(|s| {
            base64::engine::general_purpose::STANDARD.decode(s).ok()
        });
        Doctor {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            name: u.name,
            document: u.document,
            date_of_birth: u.date_of_birth,
            photo_base64: photo_bytes,
            city: u.city,
            province: u.province,
            email: u.email,
            phone: u.phone,
            created_at: u.created_at,
            created_by: u.created_by,
            updated_at: u.updated_at,
            updated_by: u.updated_by,
        }
    }
}

pub struct ProvinceMapper;
impl Mapper<Province, ProvinceJson> for ProvinceMapper {
    fn json(t: Province) -> ProvinceJson {
        ProvinceJson {
            id: t.id,
            uuid: t.uuid,
            acronym: t.acronym,
            name: t.name,
            country_code: t.country_code,
        }
    }

    fn domain(u: ProvinceJson) -> Province {
        Province {
            id: u.id,
            uuid: u.uuid,
            acronym: u.acronym,
            name: u.name,
            country_code: u.country_code,
        }
    }
}

pub struct CityMapper;
impl Mapper<City, CityJson> for CityMapper {
    fn json(t: City) -> CityJson {
        CityJson {
            id: t.id,
            uuid: t.uuid,
            province_id: t.province_id,
            name: t.name,
        }
    }

    fn domain(u: CityJson) -> City {
        City {
            id: u.id,
            uuid: u.uuid,
            province_id: u.province_id,
            name: u.name,
        }
    }
}

// ------------------- New Domain Mappers ------------------- //

pub struct IngredientMapper;
impl Mapper<business::domain::ingredient::Ingredient, crate::http::json::ingredient_json::IngredientJson> for IngredientMapper {
    fn json(t: business::domain::ingredient::Ingredient) -> crate::http::json::ingredient_json::IngredientJson {
        crate::http::json::ingredient_json::IngredientJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            name: t.name,
            kcal: t.kcal,
            protein: t.protein,
            carbs: t.carbs,
            fat: t.fat,
            fiber: t.fiber,
            taco_id: t.taco_id,
            moisture: t.moisture,
            kj: t.kj,
            cholesterol: t.cholesterol,
            ash: t.ash,
            calcium: t.calcium,
            magnesium: t.magnesium,
            manganese: t.manganese,
            phosphorus: t.phosphorus,
            iron: t.iron,
            sodium: t.sodium,
            potassium: t.potassium,
            copper: t.copper,
            zinc: t.zinc,
            retinol: t.retinol,
            re: t.re,
            rae: t.rae,
            thiamine: t.thiamine,
            riboflavin: t.riboflavin,
            pyridoxine: t.pyridoxine,
            niacin: t.niacin,
            vitamin_c: t.vitamin_c,
            saturated_fat: t.saturated_fat,
            monounsaturated_fat: t.monounsaturated_fat,
            polyunsaturated_fat: t.polyunsaturated_fat,
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: crate::http::json::ingredient_json::IngredientJson) -> business::domain::ingredient::Ingredient {
        business::domain::ingredient::Ingredient {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            name: u.name,
            kcal: u.kcal,
            protein: u.protein,
            carbs: u.carbs,
            fat: u.fat,
            fiber: u.fiber,
            taco_id: u.taco_id,
            moisture: u.moisture,
            kj: u.kj,
            cholesterol: u.cholesterol,
            ash: u.ash,
            calcium: u.calcium,
            magnesium: u.magnesium,
            manganese: u.manganese,
            phosphorus: u.phosphorus,
            iron: u.iron,
            sodium: u.sodium,
            potassium: u.potassium,
            copper: u.copper,
            zinc: u.zinc,
            retinol: u.retinol,
            re: u.re,
            rae: u.rae,
            thiamine: u.thiamine,
            riboflavin: u.riboflavin,
            pyridoxine: u.pyridoxine,
            niacin: u.niacin,
            vitamin_c: u.vitamin_c,
            saturated_fat: u.saturated_fat,
            monounsaturated_fat: u.monounsaturated_fat,
            polyunsaturated_fat: u.polyunsaturated_fat,
            created_at: u.created_at,
            updated_at: u.updated_at,
            created_by: u.created_by,
            updated_by: u.updated_by,
        }
    }
}

pub struct CycleMapper;
impl Mapper<business::domain::cycle::Cycle, crate::http::json::cycle_json::CycleJson> for CycleMapper {
    fn json(t: business::domain::cycle::Cycle) -> crate::http::json::cycle_json::CycleJson {
        crate::http::json::cycle_json::CycleJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            name: t.name,
            description: t.description,
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: crate::http::json::cycle_json::CycleJson) -> business::domain::cycle::Cycle {
        business::domain::cycle::Cycle {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            name: u.name,
            description: u.description,
            created_at: u.created_at,
            updated_at: u.updated_at,
            created_by: u.created_by,
            updated_by: u.updated_by,
        }
    }
}

pub struct EatMapper;
impl Mapper<business::domain::eat::Eat, crate::http::json::eat_json::EatJson> for EatMapper {
    fn json(t: business::domain::eat::Eat) -> crate::http::json::eat_json::EatJson {
        let photo_base64_str = t.photo_base64.as_ref().and_then(|bytes| String::from_utf8(bytes.clone()).ok());
        let photo = if let Some(ref b64) = photo_base64_str {
            Some(b64.clone())
        } else {
            t.photo.filter(|p| !p.trim().is_empty()).map(|p| {
                if p.starts_with("http://") || p.starts_with("https://") || p.starts_with("data:") {
                    p
                } else {
                    business::use_cases::image_storage_use_case::ImageStorageUseCase::generate_cloudfront_signed_url(&p).unwrap_or(p)
                }
            })
        };

        crate::http::json::eat_json::EatJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            name: t.name,
            photo,
            photo_base64: photo_base64_str,
            video_url: t.video_url,
            price: t.price,
            time: t.time,
            portion: t.portion,
            description: t.description,
            recommended_period: t.recommended_period,
            recommended_days: t.recommended_days,
            recommended_message: t.recommended_message,
            views: t.views,
            additions: t.additions,
            is_highlight: t.is_highlight,
            cycle_id: t.cycle_id,
            directions: t.directions.into_iter().map(|d| crate::http::json::eat_json::EatDirectionJson {
                id: d.id,
                step_number: d.step_number,
                description: d.description,
            }).collect(),
            ingredients: t.ingredients.into_iter().map(|ing| crate::http::json::eat_json::EatIngredientJson {
                id: ing.id,
                ingredient_id: Some(ing.ingredient_id),
                ingredient: ing.ingredient.map(IngredientMapper::json),
                quantity: ing.quantity,
                unit: ing.unit,
                substitutes: ing.substitutes.into_iter().map(IngredientMapper::json).collect(),
            }).collect(),
            restrictions: t.restrictions.into_iter().map(|r| crate::http::json::eat_json::EatRestrictionJson { id: r.id, name: r.name }).collect(),
            tags: t.tags.into_iter().map(|tag| crate::http::json::eat_json::EatTagJson { id: tag.id, name: tag.name }).collect(),
            meals: t.meals.into_iter().map(|m| crate::http::json::eat_json::EatMealJson { id: m.id, name: m.name }).collect(),
            biotypes: t.biotypes.into_iter().map(|b| crate::http::json::eat_json::EatBiotypeJson { id: b.id, name: b.name }).collect(),
            side_dishes: t.side_dishes.into_iter().map(EatMapper::json).collect(),
            total_macros: t.total_macros.map(|tm| crate::http::json::eat_json::MacrosTotalJson {
                kcal: tm.kcal,
                protein_g: tm.protein_g,
                carbs_g: tm.carbs_g,
                fat_g: tm.fat_g,
                fiber_g: tm.fiber_g,
            }),
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: crate::http::json::eat_json::EatJson) -> business::domain::eat::Eat {
        let photo_base64 = u.photo_base64.filter(|p| !p.trim().is_empty()).map(|p| p.into_bytes());
        business::domain::eat::Eat {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            name: u.name,
            photo: u.photo.filter(|p| !p.trim().is_empty()),
            photo_base64,
            video_url: u.video_url,
            price: u.price,
            time: u.time,
            portion: u.portion,
            description: u.description,
            recommended_period: u.recommended_period,
            recommended_days: u.recommended_days,
            recommended_message: u.recommended_message,
            views: u.views,
            additions: u.additions,
            is_highlight: u.is_highlight,
            cycle_id: u.cycle_id,
            directions: u.directions.into_iter().map(|d| business::domain::eat::EatDirection {
                id: d.id,
                step_number: d.step_number,
                description: d.description,
            }).collect(),
            ingredients: u.ingredients.into_iter().map(|ing| business::domain::eat::EatIngredient {
                id: ing.id,
                ingredient_id: ing.ingredient_id
                    .or_else(|| ing.ingredient.as_ref().and_then(|i| i.id))
                    .unwrap_or(0),
                ingredient: ing.ingredient.map(IngredientMapper::domain),
                quantity: ing.quantity,
                unit: ing.unit,
                substitutes: ing.substitutes.into_iter().map(IngredientMapper::domain).collect(),
            }).collect(),
            restrictions: u.restrictions.into_iter().map(|r| business::domain::eat::EatRestriction { id: r.id, name: r.name }).collect(),
            tags: u.tags.into_iter().map(|tag| business::domain::eat::EatTag { id: tag.id, name: tag.name }).collect(),
            meals: u.meals.into_iter().map(|m| business::domain::eat::EatMeal { id: m.id, name: m.name }).collect(),
            biotypes: u.biotypes.into_iter().map(|b| business::domain::eat::EatBiotype { id: b.id, name: b.name }).collect(),
            side_dishes: u.side_dishes.into_iter().map(EatMapper::domain).collect(),
            total_macros: u.total_macros.map(|tm| business::domain::eat::MacrosTotal {
                kcal: tm.kcal,
                protein_g: tm.protein_g,
                carbs_g: tm.carbs_g,
                fat_g: tm.fat_g,
                fiber_g: tm.fiber_g,
            }),
            created_at: u.created_at,
            updated_at: u.updated_at,
            created_by: u.created_by,
            updated_by: u.updated_by,
        }
    }
}

pub struct MealPlanMapper;
impl Mapper<business::domain::meal_plan::MealPlan, crate::http::json::meal_plan_json::MealPlanJson> for MealPlanMapper {
    fn json(t: business::domain::meal_plan::MealPlan) -> crate::http::json::meal_plan_json::MealPlanJson {
        let map_macros = |m: business::domain::meal_plan::MealPlanMacros| crate::http::json::meal_plan_json::MealPlanMacrosJson {
            kcal: m.kcal,
            protein_g: m.protein_g,
            carbs_g: m.carbs_g,
            carbs_pct: m.carbs_pct,
            lipids_g: m.lipids_g,
            lipids_pct: m.lipids_pct,
            fiber_g: m.fiber_g,
        };

        crate::http::json::meal_plan_json::MealPlanJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            name: t.name,
            category: t.category.to_string(),
            generation_status: t.generation_status.to_string(),
            viewed: t.viewed,
            is_favorite: t.is_favorite,
            generated_at: t.generated_at,
            nutritionist_id: t.nutritionist_id,
            patient_id: t.patient_id,
            meals: t.meals.into_iter().map(|meal| crate::http::json::meal_plan_json::MealPlanMealJson {
                id: meal.id,
                meal_type: meal.meal_type,
                is_pre_workout: meal.is_pre_workout,
                is_post_workout: meal.is_post_workout,
                nutritionist_note: meal.nutritionist_note,
                position: meal.position,
                options: meal.options.into_iter().map(|opt| crate::http::json::meal_plan_json::MealPlanOptionJson {
                    id: opt.id,
                    label: opt.label,
                    position: opt.position,
                    items: opt.items.into_iter().map(|item| crate::http::json::meal_plan_json::MealPlanItemJson {
                        id: item.id,
                        ingredient_id: item.ingredient_id,
                        ingredient: item.ingredient.map(IngredientMapper::json),
                        quantity: item.quantity,
                        unit: item.unit,
                        substitutes: item.substitutes.into_iter().map(IngredientMapper::json).collect(),
                        item_macros: item.item_macros.map(map_macros),
                    }).collect(),
                    option_macros: opt.option_macros.map(map_macros),
                }).collect(),
                meal_macros: meal.meal_macros.map(map_macros),
            }).collect(),
            total_macros: t.total_macros.map(map_macros),
            created_at: t.created_at,
            created_by: t.created_by,
            updated_at: t.updated_at,
            updated_by: t.updated_by,
        }
    }

    fn domain(u: crate::http::json::meal_plan_json::MealPlanJson) -> business::domain::meal_plan::MealPlan {
        let map_macros_domain = |m: crate::http::json::meal_plan_json::MealPlanMacrosJson| business::domain::meal_plan::MealPlanMacros {
            kcal: m.kcal,
            protein_g: m.protein_g,
            carbs_g: m.carbs_g,
            carbs_pct: m.carbs_pct,
            lipids_g: m.lipids_g,
            lipids_pct: m.lipids_pct,
            fiber_g: m.fiber_g,
        };

        business::domain::meal_plan::MealPlan {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            name: u.name,
            category: u.category.parse().unwrap_or_default(),
            generation_status: u.generation_status.parse().unwrap_or_default(),
            viewed: u.viewed,
            is_favorite: u.is_favorite,
            generated_at: u.generated_at,
            nutritionist_id: u.nutritionist_id,
            patient_id: u.patient_id,
            meals: u.meals.into_iter().map(|meal| business::domain::meal_plan::MealPlanMeal {
                id: meal.id,
                meal_type: meal.meal_type,
                is_pre_workout: meal.is_pre_workout,
                is_post_workout: meal.is_post_workout,
                nutritionist_note: meal.nutritionist_note,
                position: meal.position,
                options: meal.options.into_iter().map(|opt| business::domain::meal_plan::MealPlanOption {
                    id: opt.id,
                    label: opt.label,
                    position: opt.position,
                    items: opt.items.into_iter().map(|item| business::domain::meal_plan::MealPlanItem {
                        id: item.id,
                        ingredient_id: item.ingredient_id,
                        ingredient: item.ingredient.map(IngredientMapper::domain),
                        quantity: item.quantity,
                        unit: item.unit,
                        substitutes: item.substitutes.into_iter().map(IngredientMapper::domain).collect(),
                        item_macros: item.item_macros.map(map_macros_domain),
                    }).collect(),
                    option_macros: opt.option_macros.map(map_macros_domain),
                }).collect(),
                meal_macros: meal.meal_macros.map(map_macros_domain),
            }).collect(),
            total_macros: u.total_macros.map(map_macros_domain),
            created_at: u.created_at,
            updated_at: u.updated_at,
            created_by: u.created_by,
            updated_by: u.updated_by,
        }
    }
}

pub struct TenantPlanMapper;
impl Mapper<TenantPlan, TenantPlanJson> for TenantPlanMapper {
    fn json(t: TenantPlan) -> TenantPlanJson {
        TenantPlanJson {
            id: t.id,
            uuid: t.uuid,
            tenant_id: t.tenant_id,
            business_plan_id: t.business_plan_id,
            payment_date: t.payment_date,
            active: t.active,
        }
    }

    fn domain(u: TenantPlanJson) -> TenantPlan {
        TenantPlan {
            id: u.id,
            uuid: u.uuid,
            tenant_id: u.tenant_id,
            business_plan_id: u.business_plan_id,
            payment_date: u.payment_date,
            active: u.active,
            created_at: None,
            created_by: None,
            updated_at: None,
            updated_by: None,
        }
    }
}

pub struct PaymentChargeJsonMapper;
impl PaymentChargeJsonMapper {
    pub fn json(t: PaymentCharge) -> PaymentChargeJson {
        PaymentChargeJson {
            id: t.id,
            customer_id: t.customer_id,
            clinical_plan_id: t.clinical_plan_id,
            payment_date_id: t.payment_date_id,
            sequence: t.sequence,
            amount_cents: t.amount_cents,
            currency: t.currency,
            due_date: t.due_date,
            status: t.status,
            paid_at: t.paid_at,
        }
    }

    pub fn json_vec(list: Vec<PaymentCharge>) -> Vec<PaymentChargeJson> {
        list.into_iter().map(Self::json).collect()
    }
}
