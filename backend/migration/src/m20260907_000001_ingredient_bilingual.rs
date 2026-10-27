use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

// taco_id,name_en — nomes em inglês da TACO (gerados por docs/usda/build_ingredient_i18n.py).
static TACO_NAMES_EN: &str = include_str!("../data/taco_names_en.csv");

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // `name` segue sendo o nome em português; `name_en` é o nome em inglês.
        // `source` identifica a origem do catálogo global (TACO/USDA); fdc_id é o id no USDA.
        manager
            .alter_table(
                Table::alter()
                    .table(Ingredient::Table)
                    .add_column(string_len_null(Ingredient::NameEn, 255))
                    .add_column(string_len_null(Ingredient::Source, 10))
                    .add_column(integer_null(Ingredient::FdcId))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("uq_ingredient_fdc_id")
                    .table(Ingredient::Table)
                    .col(Ingredient::FdcId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Catálogo TACO já carregado: marca a origem e preenche o nome em inglês.
        manager
            .exec_stmt(
                Query::update()
                    .table(Ingredient::Table)
                    .value(Ingredient::Source, "TACO")
                    .and_where(Expr::cust("tenant_id IS NULL AND taco_id IS NOT NULL"))
                    .to_owned(),
            )
            .await?;

        let (_, rows) = crate::csv_lite::parse(TACO_NAMES_EN);
        for row in rows {
            let [taco_id, name_en] = row.as_slice() else {
                return Err(DbErr::Custom("taco_names_en.csv: expected 2 columns".into()));
            };
            let taco_id: i32 = taco_id.trim().parse().map_err(|e| DbErr::Custom(format!("taco_id: {e}")))?;
            manager
                .exec_stmt(
                    Query::update()
                        .table(Ingredient::Table)
                        .value(Ingredient::NameEn, name_en.as_str())
                        .and_where(Expr::cust("tenant_id IS NULL"))
                        .and_where(Expr::col(Ingredient::TacoId).eq(taco_id))
                        .to_owned(),
                )
                .await?;
        }
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(Index::drop().name("uq_ingredient_fdc_id").table(Ingredient::Table).to_owned())
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(Ingredient::Table)
                    .drop_column(Ingredient::NameEn)
                    .drop_column(Ingredient::Source)
                    .drop_column(Ingredient::FdcId)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Ingredient {
    Table,
    NameEn,
    Source,
    FdcId,
    TacoId,
}
