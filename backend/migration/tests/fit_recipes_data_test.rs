//! Consistência dos CSVs das receitas fit: toda referência precisa existir nos catálogos carregados.
use std::collections::{HashMap, HashSet};
use std::fs;

use migration::csv_lite::parse;

fn data(name: &str) -> (Vec<String>, Vec<Vec<String>>) {
    let path = format!("{}/data/{name}", env!("CARGO_MANIFEST_DIR"));
    parse(&fs::read_to_string(&path).unwrap_or_else(|e| panic!("{path}: {e}")))
}

fn ids(file: &str, column: &str) -> HashSet<String> {
    let (header, rows) = data(file);
    let index = header.iter().position(|h| h == column).expect("coluna do catálogo");
    rows.iter().map(|row| row[index].clone()).collect()
}

const UNITS: [&str; 4] = ["Grams", "Ml", "TableSpoon", "TeaSpoon"];

#[test]
fn has_fifty_unique_recipes_with_filled_fields() {
    let (header, recipes) = data("fit_recipes.csv");
    assert_eq!(recipes.len(), 50);
    let codes: HashSet<_> = recipes.iter().map(|r| r[0].clone()).collect();
    let names: HashSet<_> = recipes.iter().map(|r| r[1].clone()).collect();
    assert_eq!((codes.len(), names.len()), (50, 50), "códigos e nomes devem ser únicos");
    for row in &recipes {
        assert_eq!(row.len(), header.len(), "{}: número de colunas", row[0]);
        assert!(row[1..=7].iter().take(2).all(|f| !f.trim().is_empty()), "{}: nome e descrição", row[0]);
        assert!(row[3].parse::<u32>().is_ok_and(|n| n > 0), "{}: tempo", row[0]);
        assert!(row[4].parse::<u32>().is_ok_and(|n| n > 0), "{}: porções", row[0]);
        assert!(!row[5].is_empty() && !row[6].is_empty(), "{}: refeição e tags", row[0]);
    }
}

#[test]
fn every_ingredient_exists_in_the_global_catalog_with_a_valid_unit() {
    let taco = ids("taco_ingredients.csv", "taco_id");
    let usda = ids("usda_sr_legacy.csv", "fdc_id");
    let (_, recipes) = data("fit_recipes.csv");
    let codes: HashSet<_> = recipes.iter().map(|r| r[0].clone()).collect();
    let (_, rows) = data("fit_recipe_ingredients.csv");
    let mut per_recipe: HashMap<&str, usize> = HashMap::new();
    for row in &rows {
        assert!(codes.contains(&row[0]), "receita desconhecida {}", row[0]);
        *per_recipe.entry(row[0].as_str()).or_default() += 1;
        match (row[1].as_str(), row[2].as_str()) {
            (t, "") => assert!(taco.contains(t), "{}: taco_id {t} inexistente", row[0]),
            ("", u) => assert!(usda.contains(u), "{}: fdc_id {u} inexistente", row[0]),
            _ => panic!("{}: informe só taco_id ou só fdc_id", row[0]),
        }
        assert!(row[3].parse::<f64>().is_ok_and(|q| q > 0.0), "{}: quantidade", row[0]);
        assert!(UNITS.contains(&row[4].as_str()), "{}: unidade {}", row[0], row[4]);
    }
    assert!(codes.iter().all(|c| per_recipe.get(c.as_str()).copied().unwrap_or(0) >= 2), "toda receita tem ao menos 2 ingredientes");
}

#[test]
fn every_recipe_has_numbered_directions() {
    let (_, recipes) = data("fit_recipes.csv");
    let (_, rows) = data("fit_recipe_directions.csv");
    for recipe in &recipes {
        let steps: Vec<u32> = rows.iter().filter(|r| r[0] == recipe[0]).map(|r| r[1].parse().expect("passo")).collect();
        assert!(steps.len() >= 2, "{}: poucos passos", recipe[0]);
        assert_eq!(steps, (1..=steps.len() as u32).collect::<Vec<_>>(), "{}: passos fora de ordem", recipe[0]);
    }
    assert!(rows.iter().all(|r| !r[2].trim().is_empty()));
}
