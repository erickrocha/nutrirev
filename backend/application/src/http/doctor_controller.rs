use crate::commons::exception_response::{ExceptionResponse, HttpResponse};
use crate::commons::i18n::{ErrorKey, Locale};
use crate::http::json::doctor_json::DoctorJson;
use crate::http::json::error_response_json::{
    BadRequestErrorJson, ForbiddenErrorJson, InternalServerErrorJson, NotFoundErrorJson,
    UnauthorizedErrorJson,
};
use crate::infrastructure::mapper::{DoctorMapper, Mapper};
use crate::AppState;
use axum::extract::{Extension, Path, State};
use axum::http::StatusCode;
use axum::Json;
use business::domain::enums::Role;
use business::domain::user::User;
use business::gateway::doctor_gateway::DoctorGateway;
use business::use_cases::doctor_use_case::DoctorUseCase;

fn check_role_permission(role: &Role) -> bool {
    matches!(role, Role::TenantOwner | Role::TenantUser | Role::SysAdmin)
}

#[utoipa::path(
    post,
    tag = "Doctor",
    path = "/doctor",
    request_body = DoctorJson,
    responses(
        (status = 201, description = "Doctor created", body = DoctorJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn add(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(current_user): Extension<User>,
    Json(payload): Json<DoctorJson>,
) -> HttpResponse<(StatusCode, Json<DoctorJson>)> {
    if !check_role_permission(&current_user.role) {
        return Err(ExceptionResponse::Forbidden(
            locale,
            ErrorKey::RequiredHeaderValueMissing,
        ));
    }

    let mut domain = DoctorMapper::domain(payload);

    if current_user.role != Role::SysAdmin {
        if let Some(tenant_id) = current_user.tenant_id {
            domain.tenant_id = Some(tenant_id);
        } else {
            return Err(ExceptionResponse::Forbidden(
                locale,
                ErrorKey::RequiredHeaderValueMissing,
            ));
        }
    }

    let use_case = DoctorUseCase::new(DoctorGateway::new(state.conn.as_ref().clone()));
    match use_case.create(domain).await {
        Ok(res) => Ok((StatusCode::CREATED, Json(DoctorMapper::json(res)))),
        Err(_) => Err(ExceptionResponse::BadRequest(
            locale,
            ErrorKey::InvalidParameterValue,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "Doctor",
    path = "/doctor/{id}",
    params(
        ("id" = i32, Path, description = "Doctor ID")
    ),
    responses(
        (status = 200, description = "Doctor found", body = DoctorJson),
        (status = 404, description = "Doctor not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_by_id(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(current_user): Extension<User>,
    Path(id): Path<i32>,
) -> HttpResponse<Json<DoctorJson>> {
    if !check_role_permission(&current_user.role) {
        return Err(ExceptionResponse::Forbidden(
            locale,
            ErrorKey::RequiredHeaderValueMissing,
        ));
    }

    let use_case = DoctorUseCase::new(DoctorGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_id(id).await {
        Ok(doctor) => {
            if current_user.role != Role::SysAdmin && doctor.tenant_id != current_user.tenant_id {
                return Err(ExceptionResponse::Forbidden(
                    locale,
                    ErrorKey::RequiredHeaderValueMissing,
                ));
            }
            Ok(Json(DoctorMapper::json(doctor)))
        }
        Err(_) => Err(ExceptionResponse::NotFound(
            locale,
            ErrorKey::RequiredParameterMissing,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "Doctor",
    path = "/doctor/uuid/{uuid}",
    params(
        ("uuid" = String, Path, description = "Doctor UUID")
    ),
    responses(
        (status = 200, description = "Doctor found", body = DoctorJson),
        (status = 404, description = "Doctor not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_by_uuid(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(current_user): Extension<User>,
    Path(uuid): Path<String>,
) -> HttpResponse<Json<DoctorJson>> {
    if !check_role_permission(&current_user.role) {
        return Err(ExceptionResponse::Forbidden(
            locale,
            ErrorKey::RequiredHeaderValueMissing,
        ));
    }

    let use_case = DoctorUseCase::new(DoctorGateway::new(state.conn.as_ref().clone()));
    match use_case.find_by_uuid(uuid).await {
        Ok(doctor) => {
            if current_user.role != Role::SysAdmin && doctor.tenant_id != current_user.tenant_id {
                return Err(ExceptionResponse::Forbidden(
                    locale,
                    ErrorKey::RequiredHeaderValueMissing,
                ));
            }
            Ok(Json(DoctorMapper::json(doctor)))
        }
        Err(_) => Err(ExceptionResponse::NotFound(
            locale,
            ErrorKey::RequiredParameterMissing,
        )),
    }
}

#[utoipa::path(
    get,
    tag = "Doctor",
    path = "/doctor",
    responses(
        (status = 200, description = "List of doctors", body = Vec<DoctorJson>),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(current_user): Extension<User>,
) -> HttpResponse<Json<Vec<DoctorJson>>> {
    if !check_role_permission(&current_user.role) {
        return Err(ExceptionResponse::Forbidden(
            locale,
            ErrorKey::RequiredHeaderValueMissing,
        ));
    }

    let use_case = DoctorUseCase::new(DoctorGateway::new(state.conn.as_ref().clone()));

    let result = if current_user.role == Role::SysAdmin {
        use_case.find_all().await
    } else if let Some(tenant_id) = current_user.tenant_id {
        use_case.find_all_by_tenant_id(tenant_id).await
    } else {
        Ok(Vec::new())
    };

    match result {
        Ok(list) => Ok(Json(DoctorMapper::json_vec(list))),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[utoipa::path(
    put,
    tag = "Doctor",
    path = "/doctor/{id}",
    params(
        ("id" = i32, Path, description = "Doctor ID")
    ),
    request_body = DoctorJson,
    responses(
        (status = 200, description = "Doctor updated", body = DoctorJson),
        (status = 400, description = "Bad request", body = BadRequestErrorJson),
        (status = 404, description = "Doctor not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn update(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(current_user): Extension<User>,
    Path(id): Path<i32>,
    Json(payload): Json<DoctorJson>,
) -> HttpResponse<Json<DoctorJson>> {
    if !check_role_permission(&current_user.role) {
        return Err(ExceptionResponse::Forbidden(
            locale,
            ErrorKey::RequiredHeaderValueMissing,
        ));
    }

    let mut domain = DoctorMapper::domain(payload);
    let use_case = DoctorUseCase::new(DoctorGateway::new(state.conn.as_ref().clone()));

    if current_user.role != Role::SysAdmin {
        let existing = use_case.find_by_id(id).await.map_err(|_| {
            ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)
        })?;

        if existing.tenant_id != current_user.tenant_id {
            return Err(ExceptionResponse::Forbidden(
                locale,
                ErrorKey::RequiredHeaderValueMissing,
            ));
        }
        domain.tenant_id = current_user.tenant_id;
    }

    match use_case.update(id, domain).await {
        Ok(res) => Ok(Json(DoctorMapper::json(res))),
        Err(err) => {
            if err.message.contains("not found") {
                Err(ExceptionResponse::NotFound(
                    locale,
                    ErrorKey::RequiredParameterMissing,
                ))
            } else {
                Err(ExceptionResponse::BadRequest(
                    locale,
                    ErrorKey::InvalidParameterValue,
                ))
            }
        }
    }
}

#[utoipa::path(
    delete,
    tag = "Doctor",
    path = "/doctor/{id}",
    params(
        ("id" = i32, Path, description = "Doctor ID")
    ),
    responses(
        (status = 200, description = "Doctor deleted"),
        (status = 404, description = "Doctor not found", body = NotFoundErrorJson),
        (status = 401, description = "Unauthorized", body = UnauthorizedErrorJson),
        (status = 403, description = "Forbidden", body = ForbiddenErrorJson),
        (status = 500, description = "Internal server error", body = InternalServerErrorJson),
    ),
    security(("bearer_auth" = []))
)]
pub async fn delete(
    state: State<AppState>,
    Extension(locale): Extension<Locale>,
    Extension(current_user): Extension<User>,
    Path(id): Path<i32>,
) -> HttpResponse<StatusCode> {
    if !check_role_permission(&current_user.role) {
        return Err(ExceptionResponse::Forbidden(
            locale,
            ErrorKey::RequiredHeaderValueMissing,
        ));
    }

    let use_case = DoctorUseCase::new(DoctorGateway::new(state.conn.as_ref().clone()));

    if current_user.role != Role::SysAdmin {
        let existing = use_case.find_by_id(id).await.map_err(|_| {
            ExceptionResponse::NotFound(locale, ErrorKey::RequiredParameterMissing)
        })?;

        if existing.tenant_id != current_user.tenant_id {
            return Err(ExceptionResponse::Forbidden(
                locale,
                ErrorKey::RequiredHeaderValueMissing,
            ));
        }
    }

    match use_case.delete_by_id(id).await {
        Ok(_) => Ok(StatusCode::OK),
        Err(err) => {
            if err.message.contains("not found") {
                Err(ExceptionResponse::NotFound(
                    locale,
                    ErrorKey::RequiredParameterMissing,
                ))
            } else {
                Err(ExceptionResponse::BadRequest(
                    locale,
                    ErrorKey::InvalidParameterValue,
                ))
            }
        }
    }
}
