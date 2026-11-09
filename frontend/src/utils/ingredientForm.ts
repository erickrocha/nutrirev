import { ALL_NUTRIENT_FIELDS, MACRO_FIELDS, OPTIONAL_FIELDS, type NutrientField } from '../config/ingredientFields';
import type { Ingredient, IngredientPayload } from '../types/ingredient';

export type IngredientFormValues = { name: string; tenantId: string } & Record<NutrientField, string>;

export const emptyIngredientForm = (tenantId = ''): IngredientFormValues => ({
  name: '', tenantId, ...(Object.fromEntries(ALL_NUTRIENT_FIELDS.map((field) => [field, ''])) as Record<NutrientField, string>),
});

export const ingredientToForm = (item: Ingredient): IngredientFormValues => ({
  ...emptyIngredientForm(item.tenantId ? String(item.tenantId) : ''),
  name: item.name || '',
  ...(Object.fromEntries(ALL_NUTRIENT_FIELDS.map((field) => [field, item[field] !== null && item[field] !== undefined ? String(item[field]) : ''])) as Record<NutrientField, string>),
});

/** Macros vazios viram 0; os demais, null. `tenantId` só segue para o SysAdmin. */
export const toIngredientPayload = (values: IngredientFormValues, isSysAdmin: boolean): IngredientPayload => {
  const payload: IngredientPayload = {
    name: values.name.trim(),
    ...Object.fromEntries(MACRO_FIELDS.map((field) => [field, Number(values[field]) || 0])),
    ...(isSysAdmin && values.tenantId ? { tenantId: Number(values.tenantId) } : {}),
  };
  OPTIONAL_FIELDS.forEach((field) => {
    const raw = values[field];
    payload[field] = raw !== '' ? (field === 'tacoId' ? Number.parseInt(raw, 10) : Number(raw)) : null;
  });
  return payload;
};

export const formatNutrient = (value: unknown, suffix = ''): string => {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  return Number.isFinite(num) ? `${num.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${suffix}`.trim() : '—';
};
