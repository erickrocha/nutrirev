use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, UnauthorizedErrorJson,
};
use crate::http::json::sysadmin_dashboard_json::{
    BillingAttentionItemJson, RecentSysAdminTenantJson, SysAdminDashboardJson,
    SysAdminDashboardTotalsJson,
};
use crate::AppState;
use axum::extract::{Extension, State};
use axum::Json;
use business::commons::functions::bytes_para_string;
use business::domain::enums::Role;
use business::domain::user::User;
use business::use_cases::sysadmin_dashboard_use_case::SysAdminDashboardUseCase;

fn authorize(user: &User, locale: Locale) -> Result<(), ExceptionResponse> {
    if user.role != Role::SysAdmin || user.tenant_id.is_some() {
        return Err(ExceptionResponse::Forbidden(
            locale,
            ErrorKey::SysAdminDashboardForbidden,
        ));
    }
    Ok(())
}

#[utoipa::path(
    get,
    tag = "SysAdmin Dashboard",
    path = "/sysadmin-dashboard",
    responses(
        (status = 200, description = "Global SysAdmin dashboard", body = SysAdminDashboardJson),
        (status = 400, body = BadRequestErrorJson),
        (status = 401, body = UnauthorizedErrorJson),
        (status = 403, body = ForbiddenErrorJson)
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_dashboard(
    State(state): State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(user): Extension<User>,
) -> HttpResponse<Json<SysAdminDashboardJson>> {
    authorize(&user, locale)?;
    let dashboard = SysAdminDashboardUseCase::load(&state.conn)
        .await
        .map_err(|error| {
            log::error!("Failed to load SysAdmin dashboard: {error}");
            ExceptionResponse::BadRequest(locale, ErrorKey::SysAdminDashboardLoadFailed)
        })?;

    Ok(Json(SysAdminDashboardJson {
        generated_at: dashboard.generated_at,
        totals: SysAdminDashboardTotalsJson {
            tenants: dashboard.totals.tenants,
            users: dashboard.totals.users,
            active_plans: dashboard.totals.active_plans,
            tenants_without_active_plan: dashboard.totals.tenants_without_active_plan,
            monthly_recurring_revenue_in_cents: dashboard.totals.monthly_recurring_revenue_in_cents,
        },
        recent_tenants: dashboard
            .recent_tenants
            .into_iter()
            .map(|tenant| RecentSysAdminTenantJson {
                id: tenant.id,
                uuid: bytes_para_string(tenant.uuid),
                name: tenant.name,
                email: tenant.email,
                created_at: tenant.created_at,
                active_plan_name: tenant.active_plan_name,
            })
            .collect(),
        billing_attention: dashboard
            .billing_attention
            .into_iter()
            .map(|item| BillingAttentionItemJson {
                business_plan_id: item.business_plan_id,
                business_plan_uuid: bytes_para_string(item.business_plan_uuid),
                tenant_id: item.tenant_id,
                tenant_name: item.tenant_name,
                plan_name: item.plan_name,
                payment_date: item.payment_date,
                contract_value_in_cents: item.contract_value_in_cents,
                overdue: item.overdue,
            })
            .collect(),
    }))
}

#[cfg(test)]
mod tests {
    use super::authorize;
    use crate::commons::i18n::Locale;
    use business::domain::enums::Role;
    use business::domain::user::User;

    fn user(role: Role, tenant_id: Option<i32>) -> User {
        User {
            id: Some(1),
            uuid: None,
            name: None,
            email: "admin@example.com".to_string(),
            password: String::new(),
            first_login: false,
            enabled: true,
            tenant_id,
            role,
            created_at: None,
            created_by: None,
            updated_at: None,
            updated_by: None,
        }
    }

    #[test]
    fn only_global_sysadmin_is_authorized() {
        assert!(authorize(&user(Role::SysAdmin, None), Locale::En).is_ok());
        assert!(authorize(&user(Role::SysAdmin, Some(1)), Locale::En).is_err());
        assert!(authorize(&user(Role::TenantOwner, Some(1)), Locale::En).is_err());
    }
}
