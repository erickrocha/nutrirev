use axum::{middleware, routing::get, Router};

use crate::authentication::authentication_middleware::authentication;
use crate::http::tenant_dashboard_controller::get_dashboard;
use crate::AppState;

pub fn tenant_dashboard_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/tenant-dashboard", get(get_dashboard))
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

    use super::tenant_dashboard_routes;
    use crate::AppState;

    #[tokio::test]
    async fn exact_dashboard_path_is_registered() {
        let state = AppState {
            conn: Arc::new(DatabaseConnection::default()),
        };
        let app = tenant_dashboard_routes(state.clone()).with_state(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/tenant-dashboard")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }
}
