export interface RecipeIngredient {
  ingredientId?: number;
  ingredient?: { id: number };
  quantity: number | string;
  unit: string;
}

export interface Recipe {
  id: number;
  name: string;
  photo?: string | null;
  videoUrl?: string | null;
  price?: number | null;
  time?: number | null;
  portion?: number | null;
  description?: string | null;
  recommendedPeriod?: string | null;
  recommendedDays?: string | number | null;
  recommendedMessage?: string | null;
  isHighlight?: boolean;
  cycleId?: number | null;
  views?: number;
  additions?: number;
  ingredients?: RecipeIngredient[];
  directions?: Array<{ stepNumber: number; description: string }>;
  restrictions?: Array<{ id: number; name: string }>;
  tags?: Array<{ id: number; name: string }>;
  total_macros?: { kcal: number; protein_g: number; carbs_g: number; fat_g?: number };
}

export interface RecipePayload extends Omit<Recipe, 'id' | 'total_macros' | 'ingredients' | 'directions'> {
  ingredients: Array<{ ingredientId: number; quantity: number; unit: string; substitutes: unknown[] }>;
  directions: Array<{ stepNumber: number; description: string }>;
  meals: unknown[];
  biotypes: unknown[];
  sideDishes: unknown[];
}

export interface PhotoPayload {
  imageBase64: string;
  extension: string;
  contentType: string;
}

export interface Cycle {
  id: number;
  name: string;
}
