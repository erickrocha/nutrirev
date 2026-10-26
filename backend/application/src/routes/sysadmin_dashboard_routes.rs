use crate::authentication::authentication_middleware::authentication;
use crate::http::sysadmin_dashboard_controller::get_dashboard;
use crate::AppState;
use axum::routing::get;
use axum::{middleware, Router};

pub fn sysadmin_dashboard_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/sysadmin-dashboard", get(get_dashboard))
        .route_layer(middleware::from_fn_with_state(state, authentication))
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use business::sea_orm::DatabaseConnection;
    use tower::ServiceExt;

    use super::sysadmin_dashboard_routes;
    use crate::AppState;

    #[tokio::test]
    async fn exact_sysadmin_dashboard_path_is_registered() {
        let state = AppState {
            conn: Arc::new(DatabaseConnection::default()),
        };
        let app = sysadmin_dashboard_routes(state.clone()).with_state(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/sysadmin-dashboard")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }
}
