use sea_orm_migration::prelude::*;
use uuid::Uuid;

#[derive(DeriveMigrationName)]
pub struct Migration;

// USDA FoodData Central SR Legacy como catálogo global (tenant_id nulo), nomes em PT e EN.
// Gerado por docs/usda/build_ingredient_i18n.py.
static USDA_CSV: &str = include_str!("../data/usda_sr_legacy.csv");

const BATCH: usize = 100;
const TEXT_COLUMNS: [&str; 2] = ["name", "name_en"];

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Idempotente: se o catálogo já foi carregado, não duplica.
        let count = Query::select()
            .expr(Expr::cust("COUNT(*) AS total"))
            .from(Alias::new("ingredient"))
            .and_where(Expr::cust("tenant_id IS NULL AND fdc_id IS NOT NULL"))
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

        let (header, rows) = crate::csv_lite::parse(USDA_CSV);
        if header.is_empty() {
            return Err(DbErr::Custom("USDA csv is empty".into()));
        }

        for chunk in rows.chunks(BATCH) {
            let mut insert = Query::insert();
            insert.into_table(Alias::new("ingredient"));
            let mut columns: Vec<Alias> = ["uuid", "source", "created_by", "created_at", "updated_by", "updated_at"]
                .iter()
                .map(|name| Alias::new(*name))
                .collect();
            columns.extend(header.iter().map(|name| Alias::new(name.as_str())));
            insert.columns(columns);

            for row in chunk {
                if row.len() != header.len() {
                    return Err(DbErr::Custom(format!("USDA csv row has {} fields, expected {}", row.len(), header.len())));
                }
                let mut values: Vec<SimpleExpr> = vec![
                    Uuid::new_v4().as_bytes().to_vec().into(),
                    "USDA".into(),
                    "usda".into(),
                    Expr::current_timestamp(),
                    "usda".into(),
                    Expr::current_timestamp(),
                ];
                for (name, raw) in header.iter().zip(row) {
                    let raw = raw.trim();
                    values.push(if TEXT_COLUMNS.contains(&name.as_str()) {
                        raw.into()
                    } else if name == "fdc_id" {
                        raw.parse::<i32>().map_err(|e| DbErr::Custom(format!("fdc_id: {e}")))?.into()
                    } else if raw.is_empty() {
                        SimpleExpr::Value(Value::Double(None))
                    } else {
                        raw.parse::<f64>().map_err(|e| DbErr::Custom(format!("{name}: {e}")))?.into()
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
                    .and_where(Expr::cust("tenant_id IS NULL AND fdc_id IS NOT NULL"))
                    .to_owned(),
            )
            .await
    }
}
