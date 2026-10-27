use sea_orm_migration::prelude::*;
use uuid::Uuid;

#[derive(DeriveMigrationName)]
pub struct Migration;

// Tabela TACO (4ª edição) como catálogo global: tenant_id nulo, visível a todas as clínicas.
static TACO_CSV: &str = include_str!("../data/taco_ingredients.csv");

const BATCH: usize = 50;

/// Divide uma linha CSV respeitando aspas (nomes como "Arroz, integral, cozido").
fn split_csv_line(line: &str) -> Vec<String> {
    let mut fields = Vec::new();
    let mut current = String::new();
    let mut quoted = false;
    for c in line.chars() {
        match c {
            '"' => quoted = !quoted,
            ',' if !quoted => fields.push(std::mem::take(&mut current)),
            _ => current.push(c),
        }
    }
    fields.push(current);
    fields
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Idempotente: se o catálogo já foi carregado, não duplica.
        let count = Query::select()
            .expr(Expr::cust("COUNT(*) AS total"))
            .from(Alias::new("ingredient"))
            .and_where(Expr::cust("tenant_id IS NULL AND taco_id IS NOT NULL"))
            .to_owned();
        let already = db
            .query_one(&count)
            .await?
            .map(|row| row.try_get::<i64>("", "total"))
            .transpose()?
            .unwrap_or(0);
        if already > 0 {
            return Ok(());
        }

        let mut lines = TACO_CSV.lines().filter(|line| !line.trim().is_empty());
        let header: Vec<String> = split_csv_line(lines.next().ok_or_else(|| DbErr::Custom("TACO csv is empty".into()))?);
        let rows: Vec<Vec<String>> = lines.map(split_csv_line).collect();

        for chunk in rows.chunks(BATCH) {
            let mut insert = Query::insert();
            insert.into_table(Alias::new("ingredient"));
            let mut columns: Vec<Alias> = vec![Alias::new("uuid"), Alias::new("created_by"), Alias::new("created_at"), Alias::new("updated_by"), Alias::new("updated_at")];
            columns.extend(header.iter().map(|name| Alias::new(name.as_str())));
            insert.columns(columns);

            for row in chunk {
                if row.len() != header.len() {
                    return Err(DbErr::Custom(format!("TACO csv row has {} fields, expected {}", row.len(), header.len())));
                }
                let mut values: Vec<SimpleExpr> = vec![
                    Uuid::new_v4().as_bytes().to_vec().into(),
                    "taco".into(),
                    Expr::current_timestamp(),
                    "taco".into(),
                    Expr::current_timestamp(),
                ];
                for (name, raw) in header.iter().zip(row) {
                    values.push(match name.as_str() {
                        "name" => raw.trim().into(),
                        "taco_id" => raw.trim().parse::<i32>().map_err(|e| DbErr::Custom(format!("taco_id: {e}")))?.into(),
                        _ => raw.trim().parse::<f64>().map_err(|e| DbErr::Custom(format!("{name}: {e}")))?.into(),
                    });
                }
                insert.values(values).map_err(|e| DbErr::Custom(e.to_string()))?;
            }
            manager.exec_stmt(insert).await?;
        }
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .exec_stmt(
                Query::delete()
                    .from_table(Alias::new("ingredient"))
                    .and_where(Expr::cust("tenant_id IS NULL AND taco_id IS NOT NULL"))
                    .to_owned(),
            )
            .await
    }
}
