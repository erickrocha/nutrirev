use axum::extract::{Extension, Query, State};
use axum::Json;
use business::domain::enums::Role;
use business::domain::user::User;
use business::use_cases::tenant_dashboard_use_case::TenantDashboardUseCase;

use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::http::json::tenant_dashboard_json::{
    RecentTenantCustomerJson, TenantDashboardJson, TenantDashboardTotalsJson,
};
use crate::AppState;

#[derive(Debug, serde::Deserialize, utoipa::IntoParams)]
#[serde(rename_all = "camelCase")]
pub struct TenantDashboardQuery {
    pub tenant_id: Option<i32>,
}

#[derive(Debug, PartialEq, Eq)]
enum TenantResolutionError {
    Missing,
    Forbidden,
}

fn effective_tenant_id(
    user: &User,
    requested_tenant_id: Option<i32>,
) -> Result<i32, TenantResolutionError> {
    match user.role {
        Role::SysAdmin => requested_tenant_id
            .filter(|id| *id > 0)
            .ok_or(TenantResolutionError::Missing),
        Role::TenantOwner | Role::TenantUser => {
            let own_tenant_id = user
                .tenant_id
                .filter(|id| *id > 0)
                .ok_or(TenantResolutionError::Missing)?;
            if requested_tenant_id.is_some_and(|requested| requested != own_tenant_id) {
                return Err(TenantResolutionError::Forbidden);
            }
            Ok(own_tenant_id)
        }
        Role::User => Err(TenantResolutionError::Forbidden),
    }
}

#[utoipa::path(
    get,
    tag = "Tenant Dashboard",
    path = "/tenant-dashboard",
    params(TenantDashboardQuery),
    responses(
        (status = 200, description = "Tenant operational dashboard", body = TenantDashboardJson),
        (status = 400, description = "SysAdmin tenant ID is missing", body = BadRequestErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Role cannot access tenant dashboard", body = ForbiddenErrorJson),
        (status = 404, description = "Tenant not found", body = NotFoundErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_dashboard(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(current_user): Extension<User>,
    Query(query): Query<TenantDashboardQuery>,
) -> HttpResponse<Json<TenantDashboardJson>> {
    if current_user.role == Role::User {
        return Err(ExceptionResponse::Forbidden(
            locale,
            ErrorKey::InvalidParameterValue,
        ));
    }

    let tenant_id = match effective_tenant_id(&current_user, query.tenant_id) {
        Ok(tenant_id) => tenant_id,
        Err(TenantResolutionError::Missing) => {
            return Err(ExceptionResponse::BadRequest(
                locale,
                ErrorKey::RequiredParameterMissing,
            ));
        }
        Err(TenantResolutionError::Forbidden) => {
            return Err(ExceptionResponse::Forbidden(
                locale,
                ErrorKey::InvalidParameterValue,
            ));
        }
    };

    let tenant_exists = TenantDashboardUseCase::tenant_exists(&state.conn, tenant_id)
        .await
        .map_err(|_| ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue))?;
    if !tenant_exists {
        return Err(ExceptionResponse::NotFound(
            locale,
            ErrorKey::InvalidParameterValue,
        ));
    }

    let dashboard = TenantDashboardUseCase::load(&state.conn, tenant_id)
        .await
        .map_err(|_| ExceptionResponse::BadRequest(locale, ErrorKey::InvalidParameterValue))?;

    Ok(Json(TenantDashboardJson {
        tenant_id: dashboard.tenant_id,
        generated_at: dashboard.generated_at,
        totals: TenantDashboardTotalsJson {
            customers: dashboard.totals.customers,
            doctors: dashboard.totals.doctors,
            customers_with_goals: dashboard.totals.customers_with_goals,
            meal_plans: dashboard.totals.meal_plans,
            finished_meal_plans: dashboard.totals.finished_meal_plans,
            mobile_enabled_customers: dashboard.totals.mobile_enabled_customers,
        },
        recent_customers: dashboard
            .recent_customers
            .into_iter()
            .map(|customer| {
                let photo_url = if let Some(ref b64) = customer.photo_base64 {
                    if b64.starts_with("data:") {
                        Some(b64.clone())
                    } else {
                        Some(format!("data:image/jpeg;base64,{}", b64))
                    }
                } else {
                    customer.photo.clone()
                };
                RecentTenantCustomerJson {
                    id: customer.id,
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    date_of_birth: customer.date_of_birth,
                    gender: customer.gender,
                    address_line1: customer.address_line1,
                    address_line2: customer.address_line2,
                    locality: customer.locality,
                    administrative_area: customer.administrative_area,
                    postal_code: customer.postal_code,
                    country_code: customer.country_code,
                    clinical_plan_id: customer.clinical_plan_id,
                    prepare_meal_id: customer.prepare_meal_id,
                    mobile_enabled: customer.mobile_enabled,
                    photo: customer.photo,
                    photo_url,
                    photo_base64: customer.photo_base64,
                    created_at: customer.created_at,
                }
            })
            .collect(),
    }))
}

#[cfg(test)]
mod tests {
    use super::effective_tenant_id;
    use business::domain::enums::Role;
    use business::domain::user::User;

    fn user(role: Role, tenant_id: Option<i32>) -> User {
        User {
            id: Some(1),
            uuid: None,
            tenant_id,
            name: Some("Test".into()),
            email: "test@example.com".into(),
            password: "secret".into(),
            enabled: true,
            first_login: false,
            role,
            created_at: None,
            created_by: None,
            updated_at: None,
            updated_by: None,
        }
    }

    #[test]
    fn tenant_staff_always_use_their_authenticated_tenant() {
        assert!(effective_tenant_id(&user(Role::TenantOwner, Some(7)), Some(9)).is_err());
        assert_eq!(
            effective_tenant_id(&user(Role::TenantUser, Some(8)), None),
            Ok(8)
        );
    }

    #[test]
    fn sysadmin_requires_an_explicit_tenant_and_customer_is_forbidden() {
        assert_eq!(
            effective_tenant_id(&user(Role::SysAdmin, None), Some(3)),
            Ok(3)
        );
        assert!(effective_tenant_id(&user(Role::SysAdmin, None), None).is_err());
        assert!(effective_tenant_id(&user(Role::User, Some(3)), Some(3)).is_err());
    }
}
