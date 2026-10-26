#!/usr/bin/env python3
"""Convert Taco-4a-Edicao.xlsx into taco_ingredients.csv ready for the /ingredient/import endpoint."""

import csv
import os
import xml.etree.ElementTree as ET
import zipfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
XLSX_PATH = os.path.join(SCRIPT_DIR, "Taco-4a-Edicao.xlsx")
CSV_PATH = os.path.join(SCRIPT_DIR, "taco_ingredients.csv")


def parse_sheet(sheet_file: str, z: zipfile.ZipFile, shared_strings: list[str]) -> list[dict[str, str]]:
    tree = ET.fromstring(z.read(sheet_file))
    ns = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    rows = []
    for r in tree.findall(".//main:row", ns):
        row_cells = {}
        for c in r.findall("main:c", ns):
            ref = c.attrib.get("r", "")
            col = "".join([ch for ch in ref if ch.isalpha()])
            t = c.attrib.get("t")
            v = c.find("main:v", ns)
            val = ""
            if v is not None and v.text is not None:
                val = v.text
                if t == "s":
                    val = shared_strings[int(val)]
            row_cells[col] = val
        if row_cells:
            rows.append(row_cells)
    return rows


def convert_taco_xlsx_to_csv():
    with zipfile.ZipFile(XLSX_PATH) as z:
        sst_tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
        ns = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
        shared_strings = []
        for si in sst_tree.findall(".//main:si", ns):
            t = si.find("main:t", ns)
            if t is not None and t.text:
                shared_strings.append(t.text)
            else:
                t_parts = [elem.text for elem in si.findall(".//main:t", ns) if elem.text]
                shared_strings.append("".join(t_parts))

        rows1 = parse_sheet("xl/worksheets/sheet1.xml", z, shared_strings)
        rows2 = parse_sheet("xl/worksheets/sheet2.xml", z, shared_strings)

    sheet2_by_id = {}
    for r in rows2[3:]:
        a = r.get("A", "").strip()
        if a.isdigit():
            sheet2_by_id[int(a)] = {
                "saturated_fat": r.get("C", "").strip(),
                "monounsaturated_fat": r.get("D", "").strip(),
                "polyunsaturated_fat": r.get("E", "").strip(),
            }

    headers = [
        "taco_id",
        "name",
        "kcal",
        "protein",
        "carbs",
        "fat",
        "fiber",
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
    ]

    fallbacks = {
        450: {"kcal": "75.0", "protein": "2.7", "carbs": "12.0", "fat": "1.8", "fiber": "0.0"},  # Iogurte sabor abacaxi
        457: {"kcal": "35.0", "protein": "3.4", "carbs": "4.9", "fat": "0.1", "fiber": "0.0"},   # Leite desnatado UHT
        458: {"kcal": "60.0", "protein": "3.2", "carbs": "4.6", "fat": "3.2", "fiber": "0.0"},   # Leite integral
        591: {"kcal": "354.0", "protein": "3.3", "carbs": "15.2", "fat": "33.5", "fiber": "9.0"},  # Coco verde cru
    }

    def clean_val(v: str, tid: int | None = None, field_name: str | None = None, is_required_macro: bool = False) -> str:
        v = v.strip() if v else ""
        if tid in fallbacks and field_name in fallbacks[tid]:
            return fallbacks[tid][field_name]

        if not v or v == "*" or v.lower() in ["tr", "traço", "traços", "na", "n/a"]:
            return "0"

        cleaned = v.strip(" ,").replace(",", ".")
        if cleaned.count(".") > 1:
            parts = cleaned.split(".")
            cleaned = parts[0] + "." + "".join(parts[1:])

        try:
            f = float(cleaned)
            if f <= 0.0:
                return "0"
            return f"{f:.4f}".rstrip("0").rstrip(".")
        except ValueError:
            return v

    output_rows = []
    for r in rows1[3:]:
        a = r.get("A", "").strip()
        b = r.get("B", "").strip()
        if not a.isdigit() or not b:
            continue
        tid = int(a)
        s2 = sheet2_by_id.get(tid, {})

        row_dict = {
            "taco_id": str(tid),
            "name": b,
            "kcal": clean_val(r.get("D", ""), tid, "kcal", True),
            "protein": clean_val(r.get("F", ""), tid, "protein", True),
            "carbs": clean_val(r.get("I", ""), tid, "carbs", True),
            "fat": clean_val(r.get("G", ""), tid, "fat", True),
            "fiber": clean_val(r.get("J", ""), tid, "fiber", True),
            "moisture": clean_val(r.get("C", ""), tid, "moisture"),
            "kj": clean_val(r.get("E", ""), tid, "kj"),
            "cholesterol": clean_val(r.get("H", ""), tid, "cholesterol"),
            "ash": clean_val(r.get("K", ""), tid, "ash"),
            "calcium": clean_val(r.get("L", ""), tid, "calcium"),
            "magnesium": clean_val(r.get("M", ""), tid, "magnesium"),
            "manganese": clean_val(r.get("O", ""), tid, "manganese"),
            "phosphorus": clean_val(r.get("P", ""), tid, "phosphorus"),
            "iron": clean_val(r.get("Q", ""), tid, "iron"),
            "sodium": clean_val(r.get("R", ""), tid, "sodium"),
            "potassium": clean_val(r.get("S", ""), tid, "potassium"),
            "copper": clean_val(r.get("T", ""), tid, "copper"),
            "zinc": clean_val(r.get("U", ""), tid, "zinc"),
            "retinol": clean_val(r.get("V", ""), tid, "retinol"),
            "re": clean_val(r.get("W", ""), tid, "re"),
            "rae": clean_val(r.get("X", ""), tid, "rae"),
            "thiamine": clean_val(r.get("Y", ""), tid, "thiamine"),
            "riboflavin": clean_val(r.get("Z", ""), tid, "riboflavin"),
            "pyridoxine": clean_val(r.get("AA", ""), tid, "pyridoxine"),
            "niacin": clean_val(r.get("AB", ""), tid, "niacin"),
            "vitamin_c": clean_val(r.get("AC", ""), tid, "vitamin_c"),
            "saturated_fat": clean_val(s2.get("saturated_fat", ""), tid, "saturated_fat"),
            "monounsaturated_fat": clean_val(s2.get("monounsaturated_fat", ""), tid, "monounsaturated_fat"),
            "polyunsaturated_fat": clean_val(s2.get("polyunsaturated_fat", ""), tid, "polyunsaturated_fat"),
        }
        output_rows.append(row_dict)

    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(output_rows)

    print(f"Successfully generated {CSV_PATH} with {len(output_rows)} food items.")


if __name__ == "__main__":
    convert_taco_xlsx_to_csv()
