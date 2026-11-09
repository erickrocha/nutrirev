export interface Ingredient {
  id: number;
  name: string;
  nameEn?: string | null;
  tenantId?: number | null;
  tacoId?: number | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  [nutrient: string]: string | number | null | undefined;
}

export type IngredientPayload = Record<string, string | number | null>;

export interface IngredientPage {
  items: Ingredient[];
  total: number;
}
