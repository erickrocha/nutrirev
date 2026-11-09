use std::collections::HashMap;

use sea_orm_migration::prelude::*;
use uuid::Uuid;

#[derive(DeriveMigrationName)]
pub struct Migration;

// 50 receitas fit globais (tenant_id nulo, visíveis a todas as clínicas).
// Geradas por docs/fit_recipes/build_fit_recipes.py; ingredientes referenciam a TACO (taco_id) ou o USDA (fdc_id).
static RECIPES: &str = include_str!("../data/fit_recipes.csv");
static INGREDIENTS: &str = include_str!("../data/fit_recipe_ingredients.csv");
static DIRECTIONS: &str = include_str!("../data/fit_recipe_directions.csv");

const AUTHOR: &str = "fit-recipes";

fn custom(message: impl Into<String>) -> DbErr {
    DbErr::Custom(message.into())
}

/// Campo `index` da linha, ou erro descrevendo o arquivo.
fn field<'a>(row: &'a [String], index: usize, what: &str) -> Result<&'a str, DbErr> {
    row.get(index).map(|value| value.trim()).ok_or_else(|| custom(format!("{what}: missing column {index}")))
}

fn number<T: std::str::FromStr>(row: &[String], index: usize, what: &str) -> Result<T, DbErr> {
    field(row, index, what)?.parse::<T>().map_err(|_| custom(format!("{what}: invalid number at column {index}")))
}

/// Devolve o id de cada nome, criando na tabela mestre os que ainda não existem.
async fn ensure_names(manager: &SchemaManager<'_>, table: &str, names: &[String]) -> Result<HashMap<String, i32>, DbErr> {
    let db = manager.get_connection();
    let mut ids: HashMap<String, i32> = HashMap::new();
    for name in names {
        if ids.contains_key(name) {
            continue;
        }
        let select = Query::select().column(Alias::new("id")).from(Alias::new(table)).and_where(Expr::col(Alias::new("name")).eq(name.as_str())).to_owned();
        let id = match db.query_one(&select).await? {
            Some(row) => row.try_get::<i32>("", "id")?,
            None => {
                let insert = Query::insert().into_table(Alias::new(table)).columns([Alias::new("name")]).values([name.as_str().into()]).map_err(|e| custom(e.to_string()))?.to_owned();
                db.execute(&insert).await?.last_insert_id() as i32
            }
        };
        ids.insert(name.clone(), id);
    }
    Ok(ids)
}

/// `taco_id` -> id e `fdc_id` -> id do catálogo global de ingredientes.
async fn ingredient_ids(manager: &SchemaManager<'_>, column: &str) -> Result<HashMap<i64, i32>, DbErr> {
    let select = Query::select()
        .columns([Alias::new("id"), Alias::new(column)])
        .from(Alias::new("ingredient"))
        .and_where(Expr::cust("tenant_id IS NULL"))
        .and_where(Expr::col(Alias::new(column)).is_not_null())
        .to_owned();
    let mut ids = HashMap::new();
    for row in manager.get_connection().query_all(&select).await? {
        ids.insert(i64::from(row.try_get::<i32>("", column)?), row.try_get::<i32>("", "id")?);
    }
    Ok(ids)
}

fn split(list: &str) -> Vec<String> {
    list.split(';').map(str::trim).filter(|item| !item.is_empty()).map(String::from).collect()
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Idempotente: se as receitas já foram carregadas, não duplica.
        let count = Query::select()
            .expr(Expr::cust("COUNT(*) AS total"))
            .from(Alias::new("eat"))
            .and_where(Expr::cust("tenant_id IS NULL"))
            .and_where(Expr::col(Alias::new("created_by")).eq(AUTHOR))
            .to_owned();
        let already = db.query_one(&count).await?.map(|row| row.try_get::<i64>("", "total")).transpose()?.unwrap_or(0);
        if already > 0 {
            return Ok(());
        }

        let (_, recipes) = crate::csv_lite::parse(RECIPES);
        let (_, ingredients) = crate::csv_lite::parse(INGREDIENTS);
        let (_, directions) = crate::csv_lite::parse(DIRECTIONS);

        let taco = ingredient_ids(manager, "taco_id").await?;
        let usda = ingredient_ids(manager, "fdc_id").await?;

        let all = |index: usize| -> Vec<String> { recipes.iter().filter_map(|row| row.get(index)).flat_map(|list| split(list)).collect() };
        let meals = ensure_names(manager, "eat_meal", &all(5)).await?;
        let tags = ensure_names(manager, "eat_tag", &all(6)).await?;
        let restrictions = ensure_names(manager, "eat_restriction", &all(7)).await?;

        for recipe in &recipes {
            let code = field(recipe, 0, "recipe")?;
            let insert = Query::insert()
                .into_table(Alias::new("eat"))
                .columns(["uuid", "name", "description", "time", "portion", "views", "additions", "is_highlight", "created_by", "created_at", "updated_by", "updated_at"].map(Alias::new))
                .values([
                    Uuid::new_v4().as_bytes().to_vec().into(),
                    field(recipe, 1, "recipe")?.into(),
                    field(recipe, 2, "recipe")?.into(),
                    number::<i32>(recipe, 3, "recipe time")?.into(),
                    number::<i32>(recipe, 4, "recipe portion")?.into(),
                    0.into(),
                    0.into(),
                    false.into(),
                    AUTHOR.into(),
                    Expr::current_timestamp(),
                    AUTHOR.into(),
                    Expr::current_timestamp(),
                ])
                .map_err(|e| custom(e.to_string()))?
                .to_owned();
            let eat_id = db.execute(&insert).await?.last_insert_id() as i32;

            for row in ingredients.iter().filter(|row| row.first().map(|c| c.trim()) == Some(code)) {
                let (catalog, key) = match (field(row, 1, "ingredient")?, field(row, 2, "ingredient")?) {
                    (taco_id, "") => (&taco, taco_id),
                    (_, fdc_id) => (&usda, fdc_id),
                };
                let key: i64 = key.parse().map_err(|_| custom(format!("{code}: invalid ingredient id {key}")))?;
                let ingredient_id = catalog.get(&key).ok_or_else(|| custom(format!("{code}: ingredient {key} not in catalog")))?;
                let insert = Query::insert()
                    .into_table(Alias::new("eat_ingredient"))
                    .columns(["eat_id", "ingredient_id", "quantity", "unit"].map(Alias::new))
                    .values([eat_id.into(), (*ingredient_id).into(), number::<f64>(row, 3, "quantity")?.into(), field(row, 4, "unit")?.into()])
                    .map_err(|e| custom(e.to_string()))?
                    .to_owned();
                db.execute(&insert).await?;
            }

            for row in directions.iter().filter(|row| row.first().map(|c| c.trim()) == Some(code)) {
                let insert = Query::insert()
                    .into_table(Alias::new("eat_direction"))
                    .columns(["eat_id", "step_number", "description"].map(Alias::new))
                    .values([eat_id.into(), number::<i32>(row, 1, "step")?.into(), field(row, 2, "step")?.into()])
                    .map_err(|e| custom(e.to_string()))?
                    .to_owned();
                db.execute(&insert).await?;
            }

            for (table, column, names, ids) in [
                ("eat_meal_relation", "meal_id", split(field(recipe, 5, "meals")?), &meals),
                ("eat_tag_relation", "tag_id", split(field(recipe, 6, "tags")?), &tags),
                ("eat_restriction_relation", "restriction_id", split(field(recipe, 7, "restrictions")?), &restrictions),
            ] {
                for name in names {
                    let id = ids.get(&name).ok_or_else(|| custom(format!("{code}: unknown {name}")))?;
                    let insert = Query::insert()
                        .into_table(Alias::new(table))
                        .columns([Alias::new("eat_id"), Alias::new(column)])
                        .values([eat_id.into(), (*id).into()])
                        .map_err(|e| custom(e.to_string()))?
                        .to_owned();
                    db.execute(&insert).await?;
                }
            }
        }
        Ok(())
    }

    // Remove só as receitas desta carga; ingredientes, passos e vínculos saem em cascata.
    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .exec_stmt(
                Query::delete()
                    .from_table(Alias::new("eat"))
                    .and_where(Expr::cust("tenant_id IS NULL"))
                    .and_where(Expr::col(Alias::new("created_by")).eq(AUTHOR))
                    .to_owned(),
            )
            .await
    }
}
