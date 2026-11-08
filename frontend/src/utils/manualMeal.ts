import type { Ingredient } from '../types/ingredient';

// Gramas (ou ml) equivalentes a uma unidade de medida caseira.
export const UNIT_MULTIPLIERS: Record<string, number> = {
  Grams: 1, Kg: 1000, Ml: 1, Liter: 1000, Units: 1, Cup: 120, TableSpoon: 15, Tablespoon: 15, TeaSpoon: 5,
  CoffeeSpoon: 2.5, DessertSpoon: 10, Pinch: 0.5, Slice: 30, Shell: 100, Glass: 200, LittleSquares: 10, Scoop: 30,
};

export interface Macros { calories: number; protein: number; carbs: number; fat: number }

export interface MealItem {
  ingredientId: number;
  name: string;
  quantity: number;
  unit: string;
  macros: Macros;
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Macros de uma porção: os valores do ingrediente são por 100 g. */
export const itemMacros = (ingredient: Pick<Ingredient, 'kcal' | 'protein' | 'carbs' | 'fat'>, quantity: number, unit: string): Macros => {
  const factor = ((Number(quantity) || 0) * (UNIT_MULTIPLIERS[unit] ?? 1)) / 100;
  return {
    calories: round1((ingredient.kcal || 0) * factor),
    protein: round1((ingredient.protein || 0) * factor),
    carbs: round1((ingredient.carbs || 0) * factor),
    fat: round1((ingredient.fat || 0) * factor),
  };
};

export const sumMacros = (items: Array<{ macros: Macros }>): Macros => {
  const total = items.reduce((acc, { macros }) => ({
    calories: acc.calories + (macros.calories || 0), protein: acc.protein + (macros.protein || 0),
    carbs: acc.carbs + (macros.carbs || 0), fat: acc.fat + (macros.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  return { calories: Math.round(total.calories), protein: round1(total.protein), carbs: round1(total.carbs), fat: round1(total.fat) };
};

export const toAnalysisPayload = (mealSlotId: string, date: string, items: MealItem[]) => ({
  daily_meal_id: Number(mealSlotId),
  meal_date: date,
  items: items.map((item) => ({ ingredient_id: item.ingredientId, quantity: item.quantity, unit: item.unit })),
});

export interface PlanMacros { kcal: string; p: string; c: string; f: string; fi: string }

/** Soma os macros dos itens de uma opção, procurando cada ingrediente no cache; valores por 100 g. */
export const optionMacros = (
  items: Array<{ ingredientId: number | string; quantity: number | string; unit?: string }> | undefined,
  ingredients: Array<Pick<Ingredient, 'id' | 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber'>> | undefined,
): PlanMacros => {
  const total = { kcal: 0, p: 0, c: 0, f: 0, fi: 0 };
  (items ?? []).forEach((item) => {
    const ingredient = ingredients?.find((candidate) => candidate.id === Number(item.ingredientId));
    const quantity = Number.parseFloat(String(item.quantity));
    if (!item.ingredientId || !quantity || !ingredient) return;
    const ratio = (quantity * (UNIT_MULTIPLIERS[item.unit || 'Grams'] ?? 1)) / 100;
    total.kcal += (ingredient.kcal || 0) * ratio;
    total.p += (ingredient.protein || 0) * ratio;
    total.c += (ingredient.carbs || 0) * ratio;
    total.f += (ingredient.fat || 0) * ratio;
    total.fi += (ingredient.fiber || 0) * ratio;
  });
  return { kcal: total.kcal.toFixed(1), p: total.p.toFixed(1), c: total.c.toFixed(1), f: total.f.toFixed(1), fi: total.fi.toFixed(1) };
};
