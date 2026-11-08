import type { CsvColumn } from '../utils/csvImport';

export const MACRO_FIELDS = ['kcal', 'protein', 'carbs', 'fat', 'fiber'] as const;
export const MINERAL_FIELDS = ['calcium', 'magnesium', 'manganese', 'phosphorus', 'iron', 'sodium', 'potassium', 'copper', 'zinc'] as const;
export const VITAMIN_FIELDS = ['vitaminC', 'thiamine', 'riboflavin', 'pyridoxine', 'niacin', 'retinol', 're', 'rae'] as const;
export const LIPID_OTHER_FIELDS = ['tacoId', 'moisture', 'kj', 'cholesterol', 'ash', 'saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat'] as const;

/** Campos opcionais: vazio vira null na API. */
export const OPTIONAL_FIELDS = [...MINERAL_FIELDS, ...VITAMIN_FIELDS, ...LIPID_OTHER_FIELDS] as const;
export const ALL_NUTRIENT_FIELDS = [...MACRO_FIELDS, ...OPTIONAL_FIELDS] as const;

export type NutrientField = (typeof ALL_NUTRIENT_FIELDS)[number];
export type IngredientTab = 'macros' | 'minerals' | 'vitamins' | 'lipids';

export const TAB_FIELDS: Record<IngredientTab, readonly NutrientField[]> = {
  macros: MACRO_FIELDS,
  minerals: MINERAL_FIELDS,
  vitamins: VITAMIN_FIELDS,
  lipids: LIPID_OTHER_FIELDS,
};

/** Unidade de exibição por 100 g. */
export const unitOf = (field: NutrientField): string => {
  if (field === 'kcal') return 'kcal';
  if (field === 'kj') return 'kJ';
  if (field === 'moisture') return '%';
  if (field === 'retinol' || field === 're' || field === 'rae') return 'mcg';
  if (['protein', 'carbs', 'fat', 'fiber', 'ash', 'saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat'].includes(field)) return 'g';
  if (field === 'tacoId') return '';
  return 'mg';
};

const snake = (field: string): string => field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

// A ordem das colunas é a do modelo de CSV baixado pelo usuário.
const CSV_ORDER: NutrientField[] = [
  ...MACRO_FIELDS, 'tacoId', 'moisture', 'kj', 'cholesterol', 'ash',
  ...MINERAL_FIELDS, 'retinol', 're', 'rae', 'thiamine', 'riboflavin', 'pyridoxine', 'niacin', 'vitaminC',
  'saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat',
];

export const ingredientCsvColumns = (t: (key: string) => string): CsvColumn[] => [
  { key: 'name', label: t('common.name'), type: 'text', required: true },
  ...CSV_ORDER.map((field): CsvColumn => ({
    key: snake(field), label: t(`ingredients.${field}`), type: 'number', required: (MACRO_FIELDS as readonly string[]).includes(field),
  })),
];
