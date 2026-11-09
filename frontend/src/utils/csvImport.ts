// Cada coluna canônica aceita seus nomes alternativos (inglês, português, planilha da TACO).
const HEADER_ALIASES: Record<string, string[]> = {
  name: ['name', 'nome', 'descrição dos alimentos', 'descricao dos alimentos', 'descrição', 'descricao', 'alimento_nome'],
  kcal: ['kcal', 'energia (kcal)', 'energia_kcal', 'calorias'],
  protein: ['protein', 'proteína', 'proteina', 'proteína (g)', 'proteina (g)'],
  carbs: ['carbs', 'carboidrato', 'carboidratos', 'carbo-idrato', 'carbo-idrato (g)', 'carboidrato (g)'],
  fat: ['fat', 'lipídeos', 'lipideos', 'lipídeos (g)', 'lipideos (g)', 'gordura'],
  fiber: ['fiber', 'fibra', 'fibras', 'fibra alimentar', 'fibra alimentar (g)'],
  taco_id: ['taco_id', 'tacoid', 'número do alimento', 'numero do alimento', 'número do', 'numero do', 'alimento'],
  moisture: ['moisture', 'umidade', 'umidade (%)'],
  kj: ['kj', 'energia (kj)', 'energia_kj'],
  cholesterol: ['cholesterol', 'colesterol', 'colesterol (mg)'],
  ash: ['ash', 'cinzas', 'cinzas (g)'],
  calcium: ['calcium', 'cálcio', 'calcio', 'cálcio (mg)', 'calcio (mg)'],
  magnesium: ['magnesium', 'magnésio', 'magnesio', 'magnésio (mg)', 'magnesio (mg)'],
  manganese: ['manganese', 'manganês', 'manganes', 'manganês (mg)', 'manganes (mg)'],
  phosphorus: ['phosphorus', 'fósforo', 'fosforo', 'fósforo (mg)', 'fosforo (mg)'],
  iron: ['iron', 'ferro', 'ferro (mg)'],
  sodium: ['sodium', 'sódio', 'sodio', 'sódio (mg)', 'sodio (mg)'],
  potassium: ['potassium', 'potássio', 'potassio', 'potássio (mg)', 'potassio (mg)'],
  copper: ['copper', 'cobre', 'cobre (mg)'],
  zinc: ['zinc', 'zinco', 'zinco (mg)'],
  retinol: ['retinol', 'retinol (mcg)'],
  re: ['re', 're (mcg)'],
  rae: ['rae', 'rae (mcg)', 'rae '],
  thiamine: ['thiamine', 'tiamina', 'tiamina (mg)'],
  riboflavin: ['riboflavin', 'riboflavina', 'riboflavina (mg)'],
  pyridoxine: ['pyridoxine', 'piridoxina', 'piridoxina (mg)'],
  niacin: ['niacin', 'niacina', 'niacina (mg)'],
  vitamin_c: ['vitamin_c', 'vitaminc', 'vitamina c', 'vitamina_c', 'vitamina c (mg)', 'c'],
  saturated_fat: ['saturated_fat', 'saturatedfat', 'saturados', 'saturados (g)'],
  monounsaturated_fat: ['monounsaturated_fat', 'monounsaturatedfat', 'monoinsaturados', 'monoinsaturados (g)'],
  polyunsaturated_fat: ['polyunsaturated_fat', 'polyunsaturatedfat', 'poliinsaturados', 'poli-insaturados', 'poli-insaturados (g)'],
};

const CANONICAL_BY_ALIAS = new Map<string, string>(
  Object.entries(HEADER_ALIASES).flatMap(([canonical, aliases]) => aliases.map((alias) => [alias, canonical] as const)),
);

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_ROWS = 10_000;
export const PAGE_SIZE = 20;

export interface CsvColumn {
  key: string;
  label: string;
  type: 'text' | 'number';
  required?: boolean;
}

export type CsvRow = Record<string, string | number>;

export interface CsvCellError {
  rowIndex: number;
  row: number;
  column: string;
  message: string;
}

export const canonicalHeader = (raw: unknown): string => {
  const clean = String(raw || '').trim().replace(/^\uFEFF/, '').toLowerCase();
  return CANONICAL_BY_ALIAS.get(clean) ?? clean;
};

export const formatBytes = (bytes: number): string =>
  bytes ? `${(bytes / 1024).toFixed(bytes < 1024 * 1024 ? 1 : 0)} KB` : '0 KB';

export const errorKey = (rowIndex: number, column?: string): string => `${rowIndex}:${column || '*'}`;

const NUMBER_PLACEHOLDERS = ['tr', 'traço', 'traços', 'na', 'n/a', '*'];

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Valida nome (obrigatório, tamanho, duplicado) e colunas numéricas de cada linha. */
export const validateRows = (rows: CsvRow[], columns: CsvColumn[], maxNameLength: number, t: Translate): CsvCellError[] => {
  const errors: CsvCellError[] = [];
  const names = new Map<string, number>();
  const add = (rowIndex: number, column: string, message: string) => errors.push({ rowIndex, row: rowIndex + 2, column, message });

  rows.forEach((row, rowIndex) => {
    const name = String(row.name ?? '').trim();
    if (!name) {
      add(rowIndex, 'name', t('csvImport.nameRequired'));
    } else if ([...name].length > maxNameLength) {
      add(rowIndex, 'name', t('csvImport.nameTooLong', { max: maxNameLength }));
    } else {
      const normalized = name.toLocaleLowerCase();
      const firstIndex = names.get(normalized);
      if (firstIndex === undefined) {
        names.set(normalized, rowIndex);
      } else {
        add(firstIndex, 'name', t('csvImport.duplicateName', { row: rowIndex + 2 }));
        add(rowIndex, 'name', t('csvImport.duplicateName', { row: firstIndex + 2 }));
      }
    }

    columns.filter((column) => column.type === 'number').forEach((column) => {
      const raw = String(row[column.key] ?? '').trim();
      if (!raw) {
        if (column.required !== false) add(rowIndex, column.key, t('csvImport.invalidNumber'));
        return;
      }
      if (NUMBER_PLACEHOLDERS.includes(raw.toLowerCase())) return;
      const numeric = Number(raw.replace(',', '.'));
      if (!Number.isFinite(numeric) || numeric < 0) add(rowIndex, column.key, t('csvImport.invalidNumber'));
    });
  });
  return errors;
};
