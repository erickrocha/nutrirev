use serde::Serialize;
use utoipa::ToSchema;

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CsvImportResponseJson {
    pub total: usize,
    pub created: usize,
    pub updated: usize,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CsvImportValidationErrorJson {
    pub row: Option<usize>,
    pub column: Option<String>,
    pub message: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CsvImportErrorResponseJson {
    pub code: String,
    pub message: String,
    pub errors: Vec<CsvImportValidationErrorJson>,
}
