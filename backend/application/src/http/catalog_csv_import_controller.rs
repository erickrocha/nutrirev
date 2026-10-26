use std::collections::HashMap;

use axum::extract::{Extension, Multipart, Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use business::domain::enums::Role;
use business::domain::user::User;
use business::use_cases::catalog_csv_import_use_case::{
    CatalogCsvImportUseCase, CatalogImportKind, CatalogImportRow,
};
use serde::Deserialize;

use crate::http::json::catalog_csv_import_json::{
    CsvImportErrorResponseJson, CsvImportResponseJson, CsvImportValidationErrorJson,
};
use crate::AppState;

const MAX_IMPORT_ROWS: usize = 10_000;

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[serde(rename_all = "camelCase")]
pub struct CsvImportQuery {
    pub tenant_id: Option<i32>,
}

#[utoipa::path(
    post,
    tag = "Clinical Conditions",
    path = "/clinical-conditions/import",
    params(CsvImportQuery),
    request_body(content = String, content_type = "multipart/form-data", description = "CSV file in multipart field 'file'"),
    responses(
        (status = 200, body = CsvImportResponseJson),
        (status = 400, body = CsvImportErrorResponseJson),
        (status = 403, body = CsvImportErrorResponseJson),
        (status = 404, body = CsvImportErrorResponseJson),
        (status = 413, description = "CSV exceeds the upload limit"),
        (status = 500, body = CsvImportErrorResponseJson)
    ),
    security(("bearer_auth" = []))
)]
pub async fn import_clinical_conditions(
    state: State<AppState>,
    Extension(user): Extension<User>,
    Query(query): Query<CsvImportQuery>,
    multipart: Multipart,
) -> Response {
    import_catalog(
        state,
        user,
        query,
        multipart,
        CatalogImportKind::ClinicalConditions,
    )
    .await
}

#[utoipa::path(
    post,
    tag = "Dietary Restriction",
    path = "/dietary-restriction/import",
    params(CsvImportQuery),
    request_body(content = String, content_type = "multipart/form-data", description = "CSV file in multipart field 'file'"),
    responses(
        (status = 200, body = CsvImportResponseJson),
        (status = 400, body = CsvImportErrorResponseJson),
        (status = 403, body = CsvImportErrorResponseJson),
        (status = 404, body = CsvImportErrorResponseJson),
        (status = 413, description = "CSV exceeds the upload limit"),
        (status = 500, body = CsvImportErrorResponseJson)
    ),
    security(("bearer_auth" = []))
)]
pub async fn import_dietary_restrictions(
    state: State<AppState>,
    Extension(user): Extension<User>,
    Query(query): Query<CsvImportQuery>,
    multipart: Multipart,
) -> Response {
    import_catalog(
        state,
        user,
        query,
        multipart,
        CatalogImportKind::DietaryRestriction,
    )
    .await
}

#[utoipa::path(
    post,
    tag = "Ingredient",
    path = "/ingredient/import",
    params(CsvImportQuery),
    request_body(content = String, content_type = "multipart/form-data", description = "CSV file in multipart field 'file'"),
    responses(
        (status = 200, body = CsvImportResponseJson),
        (status = 400, body = CsvImportErrorResponseJson),
        (status = 403, body = CsvImportErrorResponseJson),
        (status = 404, body = CsvImportErrorResponseJson),
        (status = 413, description = "CSV exceeds the upload limit"),
        (status = 500, body = CsvImportErrorResponseJson)
    ),
    security(("bearer_auth" = []))
)]
pub async fn import_ingredients(
    state: State<AppState>,
    Extension(user): Extension<User>,
    Query(query): Query<CsvImportQuery>,
    multipart: Multipart,
) -> Response {
    import_catalog(state, user, query, multipart, CatalogImportKind::Ingredient).await
}

#[utoipa::path(
    post,
    tag = "Pre-existing Conditions",
    path = "/pre-existing-conditions/import",
    params(CsvImportQuery),
    request_body(content = String, content_type = "multipart/form-data", description = "CSV file in multipart field 'file'"),
    responses(
        (status = 200, body = CsvImportResponseJson),
        (status = 400, body = CsvImportErrorResponseJson),
        (status = 403, body = CsvImportErrorResponseJson),
        (status = 404, body = CsvImportErrorResponseJson),
        (status = 413, description = "CSV exceeds the upload limit"),
        (status = 500, body = CsvImportErrorResponseJson)
    ),
    security(("bearer_auth" = []))
)]
pub async fn import_pre_existing_conditions(
    state: State<AppState>,
    Extension(user): Extension<User>,
    Query(query): Query<CsvImportQuery>,
    multipart: Multipart,
) -> Response {
    import_catalog(
        state,
        user,
        query,
        multipart,
        CatalogImportKind::PreExistingConditions,
    )
    .await
}

async fn import_catalog(
    State(state): State<AppState>,
    user: User,
    query: CsvImportQuery,
    mut multipart: Multipart,
    kind: CatalogImportKind,
) -> Response {
    let tenant_id = match effective_tenant_id(&user, query.tenant_id) {
        Ok(id) => id,
        Err((status, message)) => return error_response(status, "INVALID_TENANT", message, vec![]),
    };

    match CatalogCsvImportUseCase::tenant_exists(&state.conn, tenant_id).await {
        Ok(true) => {}
        Ok(false) => {
            return error_response(
                StatusCode::NOT_FOUND,
                "TENANT_NOT_FOUND",
                "The target tenant does not exist.",
                vec![],
            )
        }
        Err(_) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "IMPORT_FAILED",
                "Could not validate the target tenant.",
                vec![],
            )
        }
    }

    let mut file = None;
    loop {
        match multipart.next_field().await {
            Ok(Some(field)) if field.name() == Some("file") => match field.bytes().await {
                Ok(bytes) if !bytes.is_empty() => file = Some(bytes),
                Ok(_) => {}
                Err(_) => {
                    return error_response(
                        StatusCode::BAD_REQUEST,
                        "INVALID_CSV",
                        "Could not read multipart field 'file'.",
                        vec![],
                    )
                }
            },
            Ok(Some(_)) => {}
            Ok(None) => break,
            Err(_) => {
                return error_response(
                    StatusCode::BAD_REQUEST,
                    "INVALID_MULTIPART",
                    "The multipart request is malformed.",
                    vec![],
                )
            }
        }
    }

    let Some(file) = file else {
        return error_response(
            StatusCode::BAD_REQUEST,
            "FILE_REQUIRED",
            "A non-empty CSV file under multipart field 'file' is required.",
            vec![],
        );
    };

    let rows = match parse_csv(&file, kind) {
        Ok(rows) => rows,
        Err(errors) => {
            return error_response(
                StatusCode::BAD_REQUEST,
                "INVALID_CSV",
                "The CSV contains validation errors.",
                errors,
            )
        }
    };

    match CatalogCsvImportUseCase::import(&state.conn, kind, tenant_id, rows).await {
        Ok(result) => Json(CsvImportResponseJson {
            total: result.total,
            created: result.created,
            updated: result.updated,
        })
        .into_response(),
        Err(_) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "IMPORT_FAILED",
            "The import could not be completed and no rows were changed.",
            vec![],
        ),
    }
}

fn effective_tenant_id(
    user: &User,
    requested_tenant_id: Option<i32>,
) -> Result<i32, (StatusCode, &'static str)> {
    match user.role {
        Role::SysAdmin => requested_tenant_id.filter(|id| *id > 0).ok_or((
            StatusCode::BAD_REQUEST,
            "SysAdmin must provide a positive tenantId query parameter.",
        )),
        Role::TenantOwner | Role::TenantUser => {
            let own_id = user.tenant_id.filter(|id| *id > 0).ok_or((
                StatusCode::BAD_REQUEST,
                "The authenticated user has no valid tenant.",
            ))?;
            if requested_tenant_id.is_some_and(|id| id != own_id) {
                return Err((
                    StatusCode::FORBIDDEN,
                    "Tenant users cannot import data for another tenant.",
                ));
            }
            Ok(own_id)
        }
        Role::User => Err((
            StatusCode::FORBIDDEN,
            "This role cannot import catalog data.",
        )),
    }
}

const INGREDIENT_KNOWN_HEADERS: &[&str] = &[
    "name",
    "kcal",
    "protein",
    "carbs",
    "fat",
    "fiber",
    "taco_id",
    "moisture",
    "kj",
    "cholesterol",
    "ash",
    "calcium",
    "magnesium",
    "manganese",
    "phosphorus",
    "iron",
    "sodium",
    "potassium",
    "copper",
    "zinc",
    "retinol",
    "re",
    "rae",
    "thiamine",
    "riboflavin",
    "pyridoxine",
    "niacin",
    "vitamin_c",
    "saturated_fat",
    "monounsaturated_fat",
    "polyunsaturated_fat",
];

const INGREDIENT_REQUIRED_HEADERS: &[&str] = &[
    "name",
    "kcal",
    "protein",
    "carbs",
    "fat",
    "fiber",
];

fn canonical_header(raw: &str, kind: CatalogImportKind) -> String {
    let clean = raw.trim().trim_start_matches('\u{feff}').to_lowercase();
    if matches!(kind, CatalogImportKind::Ingredient) {
        match clean.as_str() {
            "name" | "nome" | "descrição dos alimentos" | "descricao dos alimentos" | "descrição" | "descricao" | "alimento_nome" => "name".to_string(),
            "kcal" | "energia (kcal)" | "energia_kcal" | "calorias" => "kcal".to_string(),
            "protein" | "proteína" | "proteina" | "proteína (g)" | "proteina (g)" => "protein".to_string(),
            "carbs" | "carboidrato" | "carboidratos" | "carbo-idrato" | "carbo-idrato (g)" | "carboidrato (g)" => "carbs".to_string(),
            "fat" | "lipídeos" | "lipideos" | "lipídeos (g)" | "lipideos (g)" | "gordura" => "fat".to_string(),
            "fiber" | "fibra" | "fibras" | "fibra alimentar" | "fibra alimentar (g)" => "fiber".to_string(),
            "taco_id" | "tacoid" | "número do alimento" | "numero do alimento" | "número do" | "numero do" | "alimento" => "taco_id".to_string(),
            "moisture" | "umidade" | "umidade (%)" => "moisture".to_string(),
            "kj" | "energia (kj)" | "energia_kj" => "kj".to_string(),
            "cholesterol" | "colesterol" | "colesterol (mg)" => "cholesterol".to_string(),
            "ash" | "cinzas" | "cinzas (g)" => "ash".to_string(),
            "calcium" | "cálcio" | "calcio" | "cálcio (mg)" | "calcio (mg)" => "calcium".to_string(),
            "magnesium" | "magnésio" | "magnesio" | "magnésio (mg)" | "magnesio (mg)" => "magnesium".to_string(),
            "manganese" | "manganês" | "manganes" | "manganês (mg)" | "manganes (mg)" => "manganese".to_string(),
            "phosphorus" | "fósforo" | "fosforo" | "fósforo (mg)" | "fosforo (mg)" => "phosphorus".to_string(),
            "iron" | "ferro" | "ferro (mg)" => "iron".to_string(),
            "sodium" | "sódio" | "sodio" | "sódio (mg)" | "sodio (mg)" => "sodium".to_string(),
            "potassium" | "potássio" | "potassio" | "potássio (mg)" | "potassio (mg)" => "potassium".to_string(),
            "copper" | "cobre" | "cobre (mg)" => "copper".to_string(),
            "zinc" | "zinco" | "zinco (mg)" => "zinc".to_string(),
            "retinol" | "retinol (mcg)" => "retinol".to_string(),
            "re" | "re (mcg)" => "re".to_string(),
            "rae" | "rae (mcg)" | "rae " => "rae".to_string(),
            "thiamine" | "tiamina" | "tiamina (mg)" => "thiamine".to_string(),
            "riboflavin" | "riboflavina" | "riboflavina (mg)" => "riboflavin".to_string(),
            "pyridoxine" | "piridoxina" | "piridoxina (mg)" => "pyridoxine".to_string(),
            "niacin" | "niacina" | "niacina (mg)" => "niacin".to_string(),
            "vitamin_c" | "vitaminc" | "vitamina c" | "vitamina_c" | "vitamina c (mg)" | "c" => "vitamin_c".to_string(),
            "saturated_fat" | "saturatedfat" | "saturados" | "saturados (g)" => "saturated_fat".to_string(),
            "monounsaturated_fat" | "monounsaturatedfat" | "monoinsaturados" | "monoinsaturados (g)" => "monounsaturated_fat".to_string(),
            "polyunsaturated_fat" | "polyunsaturatedfat" | "poliinsaturados" | "poli-insaturados" | "poli-insaturados (g)" => "polyunsaturated_fat".to_string(),
            other => other.to_string(),
        }
    } else {
        match clean.as_str() {
            "name" | "nome" | "descrição" | "descricao" => "name".to_string(),
            other => other.to_string(),
        }
    }
}

fn parse_csv(
    bytes: &[u8],
    kind: CatalogImportKind,
) -> Result<Vec<CatalogImportRow>, Vec<CsvImportValidationErrorJson>> {
    let mut reader = csv::ReaderBuilder::new().flexible(false).from_reader(bytes);
    let raw_headers = reader.headers().map_err(|error| {
        vec![validation_error(
            None,
            None,
            format!("Invalid CSV header: {error}"),
        )]
    })?;
    let headers: Vec<String> = raw_headers
        .iter()
        .map(|value| canonical_header(value, kind))
        .collect();

    let (expected_required, known_headers): (&[&str], &[&str]) = match kind {
        CatalogImportKind::Ingredient => (INGREDIENT_REQUIRED_HEADERS, INGREDIENT_KNOWN_HEADERS),
        _ => (&["name"], &["name"]),
    };

    let mut header_errors = Vec::new();
    let mut seen_headers = HashMap::new();
    for header in &headers {
        if seen_headers.insert(header.as_str(), ()).is_some() {
            header_errors.push(validation_error(
                Some(1),
                Some(header.clone()),
                "Header is duplicated.".to_string(),
            ));
        }
    }
    for required in expected_required {
        if !headers.iter().any(|header| header == required) {
            header_errors.push(validation_error(
                Some(1),
                Some((*required).to_string()),
                "Required header is missing.".to_string(),
            ));
        }
    }
    for header in &headers {
        if !known_headers.contains(&header.as_str()) {
            header_errors.push(validation_error(
                Some(1),
                Some(header.clone()),
                "Unknown header.".to_string(),
            ));
        }
    }
    if !header_errors.is_empty() {
        return Err(header_errors);
    }

    let positions: HashMap<&str, usize> = headers
        .iter()
        .enumerate()
        .map(|(index, header)| (header.as_str(), index))
        .collect();
    let mut rows = Vec::new();
    let mut errors = Vec::new();
    let mut names: HashMap<String, usize> = HashMap::new();

    for (record_index, record) in reader.records().enumerate() {
        let row_number = record_index + 2;
        if record_index >= MAX_IMPORT_ROWS {
            errors.push(validation_error(
                Some(row_number),
                None,
                format!("CSV cannot contain more than {MAX_IMPORT_ROWS} data rows."),
            ));
            break;
        }
        let record = match record {
            Ok(record) => record,
            Err(error) => {
                errors.push(validation_error(
                    Some(row_number),
                    None,
                    format!("Malformed CSV row: {error}"),
                ));
                continue;
            }
        };
        let name = field(&record, &positions, "name").trim().to_string();
        let max_name_length = if matches!(kind, CatalogImportKind::Ingredient) {
            255
        } else {
            500
        };
        if name.is_empty() {
            errors.push(validation_error(
                Some(row_number),
                Some("name".to_string()),
                "Name is required.".to_string(),
            ));
        } else if name.chars().count() > max_name_length {
            errors.push(validation_error(
                Some(row_number),
                Some("name".to_string()),
                format!("Name cannot exceed {max_name_length} characters."),
            ));
        } else {
            let normalized = name.to_lowercase();
            if let Some(first_row) = names.insert(normalized, row_number) {
                errors.push(validation_error(
                    Some(row_number),
                    Some("name".to_string()),
                    format!("Duplicate name; first occurrence is on row {first_row}."),
                ));
            }
        }

        let nutrients = if matches!(kind, CatalogImportKind::Ingredient) {
            ["kcal", "protein", "carbs", "fat", "fiber"].map(|column| {
                parse_non_negative_number(&record, &positions, column, row_number, &mut errors)
            })
        } else {
            [None; 5]
        };

        let (
            taco_id,
            moisture,
            kj,
            cholesterol,
            ash,
            calcium,
            magnesium,
            manganese,
            phosphorus,
            iron,
            sodium,
            potassium,
            copper,
            zinc,
            retinol,
            re,
            rae,
            thiamine,
            riboflavin,
            pyridoxine,
            niacin,
            vitamin_c,
            saturated_fat,
            monounsaturated_fat,
            polyunsaturated_fat,
        ) = if matches!(kind, CatalogImportKind::Ingredient) {
            (
                parse_optional_integer(&record, &positions, "taco_id", row_number, &mut errors),
                parse_optional_number(&record, &positions, "moisture", row_number, &mut errors),
                parse_optional_number(&record, &positions, "kj", row_number, &mut errors),
                parse_optional_number(&record, &positions, "cholesterol", row_number, &mut errors),
                parse_optional_number(&record, &positions, "ash", row_number, &mut errors),
                parse_optional_number(&record, &positions, "calcium", row_number, &mut errors),
                parse_optional_number(&record, &positions, "magnesium", row_number, &mut errors),
                parse_optional_number(&record, &positions, "manganese", row_number, &mut errors),
                parse_optional_number(&record, &positions, "phosphorus", row_number, &mut errors),
                parse_optional_number(&record, &positions, "iron", row_number, &mut errors),
                parse_optional_number(&record, &positions, "sodium", row_number, &mut errors),
                parse_optional_number(&record, &positions, "potassium", row_number, &mut errors),
                parse_optional_number(&record, &positions, "copper", row_number, &mut errors),
                parse_optional_number(&record, &positions, "zinc", row_number, &mut errors),
                parse_optional_number(&record, &positions, "retinol", row_number, &mut errors),
                parse_optional_number(&record, &positions, "re", row_number, &mut errors),
                parse_optional_number(&record, &positions, "rae", row_number, &mut errors),
                parse_optional_number(&record, &positions, "thiamine", row_number, &mut errors),
                parse_optional_number(&record, &positions, "riboflavin", row_number, &mut errors),
                parse_optional_number(&record, &positions, "pyridoxine", row_number, &mut errors),
                parse_optional_number(&record, &positions, "niacin", row_number, &mut errors),
                parse_optional_number(&record, &positions, "vitamin_c", row_number, &mut errors),
                parse_optional_number(&record, &positions, "saturated_fat", row_number, &mut errors),
                parse_optional_number(&record, &positions, "monounsaturated_fat", row_number, &mut errors),
                parse_optional_number(&record, &positions, "polyunsaturated_fat", row_number, &mut errors),
            )
        } else {
            (
                None, None, None, None, None, None, None, None, None, None, None, None, None,
                None, None, None, None, None, None, None, None, None, None, None, None,
            )
        };

        rows.push(CatalogImportRow {
            name,
            kcal: nutrients[0],
            protein: nutrients[1],
            carbs: nutrients[2],
            fat: nutrients[3],
            fiber: nutrients[4],
            taco_id,
            moisture,
            kj,
            cholesterol,
            ash,
            calcium,
            magnesium,
            manganese,
            phosphorus,
            iron,
            sodium,
            potassium,
            copper,
            zinc,
            retinol,
            re,
            rae,
            thiamine,
            riboflavin,
            pyridoxine,
            niacin,
            vitamin_c,
            saturated_fat,
            monounsaturated_fat,
            polyunsaturated_fat,
        });
    }

    if rows.is_empty() && errors.is_empty() {
        errors.push(validation_error(
            None,
            None,
            "CSV must contain at least one data row.".to_string(),
        ));
    }
    if errors.is_empty() {
        Ok(rows)
    } else {
        Err(errors)
    }
}

fn field<'a>(
    record: &'a csv::StringRecord,
    positions: &HashMap<&str, usize>,
    column: &str,
) -> &'a str {
    positions
        .get(column)
        .and_then(|index| record.get(*index))
        .unwrap_or("")
}

fn parse_non_negative_number(
    record: &csv::StringRecord,
    positions: &HashMap<&str, usize>,
    column: &str,
    row: usize,
    errors: &mut Vec<CsvImportValidationErrorJson>,
) -> Option<f64> {
    if !positions.contains_key(column) {
        return Some(0.0);
    }
    let raw = field(record, positions, column).trim();
    if raw.is_empty()
        || raw.eq_ignore_ascii_case("tr")
        || raw.eq_ignore_ascii_case("traço")
        || raw.eq_ignore_ascii_case("traços")
        || raw.eq_ignore_ascii_case("na")
        || raw.eq_ignore_ascii_case("n/a")
        || raw == "*"
    {
        return Some(0.0);
    }
    let normalized = raw.replace(',', ".");
    match normalized.parse::<f64>() {
        Ok(value) if value.is_finite() && value >= 0.0 => Some(value),
        _ => {
            errors.push(validation_error(
                Some(row),
                Some(column.to_string()),
                "Value must be a finite, non-negative number.".to_string(),
            ));
            None
        }
    }
}

fn parse_optional_number(
    record: &csv::StringRecord,
    positions: &HashMap<&str, usize>,
    column: &str,
    row: usize,
    errors: &mut Vec<CsvImportValidationErrorJson>,
) -> Option<f64> {
    if !positions.contains_key(column) {
        return Some(0.0);
    }
    let raw = field(record, positions, column).trim();
    if raw.is_empty()
        || raw.eq_ignore_ascii_case("na")
        || raw.eq_ignore_ascii_case("n/a")
        || raw == "*"
        || raw.eq_ignore_ascii_case("tr")
        || raw.eq_ignore_ascii_case("traço")
        || raw.eq_ignore_ascii_case("traços")
    {
        return Some(0.0);
    }
    let normalized = raw.replace(',', ".");
    match normalized.parse::<f64>() {
        Ok(value) if value.is_finite() && value >= 0.0 => Some(value),
        _ => {
            errors.push(validation_error(
                Some(row),
                Some(column.to_string()),
                "Value must be a finite, non-negative number, 'Tr', or 'NA'.".to_string(),
            ));
            None
        }
    }
}

fn parse_optional_integer(
    record: &csv::StringRecord,
    positions: &HashMap<&str, usize>,
    column: &str,
    row: usize,
    errors: &mut Vec<CsvImportValidationErrorJson>,
) -> Option<i32> {
    if !positions.contains_key(column) {
        return None;
    }
    let raw = field(record, positions, column).trim();
    if raw.is_empty()
        || raw.eq_ignore_ascii_case("na")
        || raw.eq_ignore_ascii_case("n/a")
        || raw.eq_ignore_ascii_case("*")
    {
        return None;
    }
    match raw.parse::<i32>() {
        Ok(value) if value >= 0 => Some(value),
        _ => {
            errors.push(validation_error(
                Some(row),
                Some(column.to_string()),
                "Value must be a non-negative integer.".to_string(),
            ));
            None
        }
    }
}

fn validation_error(
    row: Option<usize>,
    column: Option<String>,
    message: String,
) -> CsvImportValidationErrorJson {
    CsvImportValidationErrorJson {
        row,
        column,
        message,
    }
}

fn error_response(
    status: StatusCode,
    code: &str,
    message: &str,
    errors: Vec<CsvImportValidationErrorJson>,
) -> Response {
    (
        status,
        Json(CsvImportErrorResponseJson {
            code: code.to_string(),
            message: message.to_string(),
            errors,
        }),
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::{effective_tenant_id, parse_csv};
    use business::domain::enums::Role;
    use business::domain::user::User;
    use business::use_cases::catalog_csv_import_use_case::CatalogImportKind;

    fn user(role: Role, tenant_id: Option<i32>) -> User {
        User {
            id: Some(1),
            uuid: None,
            tenant_id,
            name: Some("Importer".into()),
            email: "importer@example.com".into(),
            password: "secret".into(),
            role,
            enabled: true,
            first_login: false,
            created_at: None,
            updated_at: None,
            created_by: None,
            updated_by: None,
        }
    }

    #[test]
    fn parses_reordered_ingredient_headers_and_bom() {
        let csv = "\u{feff}fiber,name,fat,carbs,protein,kcal\n2.5, Beans ,1,20,8,110\n";
        let rows = parse_csv(csv.as_bytes(), CatalogImportKind::Ingredient).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].name, "Beans");
        assert_eq!(rows[0].kcal, Some(110.0));
        assert_eq!(rows[0].fiber, Some(2.5));
    }

    #[test]
    fn parses_taco_portuguese_headers_with_trace_and_na() {
        let csv = "Número do Alimento,Descrição dos alimentos,Umidade (%),Energia (kcal),Energia (kJ),Proteína (g),Lipídeos (g),Colesterol (mg),Carboidrato (g),Fibra Alimentar (g),Cálcio (mg),Ferro (mg),Sódio (mg),Vitamina C (mg)\n1,Arroz integral cozido,70.1,123.5,516.8,2.6,1.0,NA,25.8,2.7,5.2,0.26,1.2,Tr\n";
        let rows = parse_csv(csv.as_bytes(), CatalogImportKind::Ingredient).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].taco_id, Some(1));
        assert_eq!(rows[0].name, "Arroz integral cozido");
        assert_eq!(rows[0].moisture, Some(70.1));
        assert_eq!(rows[0].kcal, Some(123.5));
        assert_eq!(rows[0].kj, Some(516.8));
        assert_eq!(rows[0].protein, Some(2.6));
        assert_eq!(rows[0].fat, Some(1.0));
        assert_eq!(rows[0].cholesterol, Some(0.0)); // NA -> 0.0
        assert_eq!(rows[0].carbs, Some(25.8));
        assert_eq!(rows[0].fiber, Some(2.7));
        assert_eq!(rows[0].calcium, Some(5.2));
        assert_eq!(rows[0].iron, Some(0.26));
        assert_eq!(rows[0].sodium, Some(1.2));
        assert_eq!(rows[0].vitamin_c, Some(0.0)); // Tr -> 0.0
    }

    #[test]
    fn reports_headers_values_and_duplicate_names() {
        let wrong_headers =
            parse_csv(b"name,calories\nBeans,10\n", CatalogImportKind::Ingredient).unwrap_err();
        assert!(wrong_headers
            .iter()
            .any(|error| error.message == "Unknown header."));

        let invalid = parse_csv(
            b"name,kcal,protein,carbs,fat,fiber\nBeans,-1,2,3,4,5\n beans ,1,2,3,4,5\n",
            CatalogImportKind::Ingredient,
        )
        .unwrap_err();
        assert!(invalid
            .iter()
            .any(|error| error.column.as_deref() == Some("kcal")));
        assert!(invalid
            .iter()
            .any(|error| error.message.contains("Duplicate name")));
    }

    #[test]
    fn resolves_import_tenant_by_role() {
        assert_eq!(
            effective_tenant_id(&user(Role::TenantUser, Some(7)), None),
            Ok(7)
        );
        assert_eq!(
            effective_tenant_id(&user(Role::TenantOwner, Some(7)), Some(7)),
            Ok(7)
        );
        assert!(effective_tenant_id(&user(Role::TenantUser, Some(7)), Some(8)).is_err());
        assert_eq!(
            effective_tenant_id(&user(Role::SysAdmin, None), Some(9)),
            Ok(9)
        );
        assert!(effective_tenant_id(&user(Role::SysAdmin, None), None).is_err());
        assert!(effective_tenant_id(&user(Role::User, Some(7)), None).is_err());
    }

    #[test]
    fn parses_full_taco_ingredients_csv() {
        let csv_bytes = include_bytes!("../../../../docs/taco_ingredients.csv");
        let rows = parse_csv(csv_bytes, CatalogImportKind::Ingredient)
            .expect("taco_ingredients.csv must parse without validation errors");
        assert_eq!(rows.len(), 597);
        assert_eq!(rows[0].taco_id, Some(1));
        assert_eq!(rows[0].name, "Arroz, integral, cozido");
        assert_eq!(rows[596].taco_id, Some(597));
    }
}

