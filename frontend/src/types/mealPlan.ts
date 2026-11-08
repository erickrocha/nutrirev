export interface MealPlanItem {
  ingredientId: number | string;
  quantity: number | string;
  unit: string;
  substitutes?: unknown[];
}

export interface MealPlanOption {
  label: string;
  position: number;
  items: MealPlanItem[];
}

export interface MealPlanMeal {
  mealType: string;
  isPreWorkout: boolean;
  isPostWorkout: boolean;
  nutritionistNote: string;
  position: number;
  options: MealPlanOption[];
}

export interface MealPlanTotalMacros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  carbsPct: number;
  lipidsG: number;
  lipidsPct: number;
}

export interface MealPlan {
  id: number;
  name: string;
  category?: string | null;
  generationStatus?: string | null;
  isFavorite?: boolean;
  patientId?: number | null;
  nutritionistId?: number | null;
  meals?: MealPlanMeal[];
  totalMacros?: MealPlanTotalMacros | null;
}

export interface MealPlanPayload {
  name: string;
  category: string;
  generationStatus: string;
  isFavorite: boolean;
  patientId: number | null;
  nutritionistId: number | null;
  viewed: boolean;
  meals: MealPlanMeal[];
}

export interface PagedResponse<T> {
  content?: T[];
  total_pages?: number;
  total_elements?: number;
}
