import { ENUM_VALUES, enumLabel } from '../../utils/enums';

export const MEAL_PLAN_CATEGORIES: string[] = ENUM_VALUES.mealPlanCategory;

export const mealPlanCategoryLabel = (t: (key: string, options?: Record<string, unknown>) => string, category?: string | null): string =>
  enumLabel(t, 'mealPlanCategory', category || 'KeepFit');
