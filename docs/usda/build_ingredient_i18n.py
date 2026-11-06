#!/usr/bin/env python3
"""Gera os CSVs de dados das migrações de ingredientes bilíngues (PT/EN).

Entradas
  - USDA FoodData Central SR Legacy (CSV), extraído em um diretório:
      https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
  - docs/taco_ingredients.csv (TACO, em português)
  - docs/usda/segments_pt.tsv  (trecho em inglês -> português, para os nomes do USDA)
  - docs/usda/segments_en.tsv  (trecho em português -> inglês, para os nomes da TACO)

Saídas (backend/migration/data)
  - usda_sr_legacy.csv   fdc_id,name (PT),name_en,<nutrientes>
  - taco_names_en.csv    taco_id,name_en

Os nomes são divididos em trechos separados por vírgula; trecho sem tradução fica como está
(marcas, variedades). Uso: build_ingredient_i18n.py <diretório do SR Legacy>
"""
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "backend" / "migration" / "data"

# nutriente USDA -> coluna de ingredient
NUTRIENTS = {
    "1008": "kcal", "1003": "protein", "1005": "carbs", "1004": "fat", "1079": "fiber",
    "1051": "moisture", "1062": "kj", "1253": "cholesterol", "1007": "ash", "1087": "calcium",
    "1090": "magnesium", "1101": "manganese", "1091": "phosphorus", "1089": "iron",
    "1093": "sodium", "1092": "potassium", "1098": "copper", "1095": "zinc", "1105": "retinol",
    "1106": "rae", "1165": "thiamine", "1166": "riboflavin", "1175": "pyridoxine", "1167": "niacin",
    "1162": "vitamin_c", "1258": "saturated_fat", "1292": "monounsaturated_fat", "1293": "polyunsaturated_fat",
}
REQUIRED = ["kcal", "protein", "carbs", "fat", "fiber"]  # colunas NOT NULL: ausente vira 0
COLUMNS = list(NUTRIENTS.values())


def load_dictionary(path):
    pairs = {}
    for line in path.read_text(encoding="utf-8").split("\n"):
        if line:
            source, _, target = line.partition("\t")
            pairs[source] = target
    return pairs


def translate(name, dictionary):
    return ", ".join(dictionary.get(part.strip(), part.strip()) for part in name.split(","))


def upper_first(text):
    return text[:1].upper() + text[1:]


def build_usda(sr_dir):
    dictionary = load_dictionary(Path(__file__).parent / "segments_pt.tsv")
    foods = {r["fdc_id"]: r["description"] for r in csv.DictReader(open(sr_dir / "food.csv", encoding="utf-8"))}
    values = {}
    for r in csv.DictReader(open(sr_dir / "food_nutrient.csv", encoding="utf-8")):
        column = NUTRIENTS.get(r["nutrient_id"])
        if column and r["amount"] != "":
            values.setdefault(r["fdc_id"], {}).setdefault(column, r["amount"])

    taco_names = {r["name"].strip().lower() for r in csv.DictReader(open(ROOT / "docs" / "taco_ingredients.csv", encoding="utf-8"))}
    rows, seen = [], set(taco_names)
    for fdc_id, english in sorted(foods.items(), key=lambda kv: int(kv[0])):
        portuguese = upper_first(translate(english, dictionary))
        if portuguese.lower() in seen:  # nomes únicos no catálogo
            portuguese = f"{portuguese} (USDA {fdc_id})"
        seen.add(portuguese.lower())
        nutrients = values.get(fdc_id, {})
        row = {"fdc_id": fdc_id, "name": portuguese, "name_en": english}
        for column in COLUMNS:
            row[column] = nutrients.get(column, "0" if column in REQUIRED else "")
        rows.append(row)

    with open(OUT / "usda_sr_legacy.csv", "w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=["fdc_id", "name", "name_en"] + COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"usda_sr_legacy.csv: {len(rows)} alimentos")


def build_taco():
    dictionary = load_dictionary(Path(__file__).parent / "segments_en.tsv")
    rows = [(r["taco_id"], upper_first(translate(r["name"], dictionary)))
            for r in csv.DictReader(open(ROOT / "docs" / "taco_ingredients.csv", encoding="utf-8"))]
    with open(OUT / "taco_names_en.csv", "w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["taco_id", "name_en"])
        writer.writerows(rows)
    print(f"taco_names_en.csv: {len(rows)} nomes")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    build_usda(Path(sys.argv[1]))
    build_taco()
