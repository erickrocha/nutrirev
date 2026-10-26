import { ENUM_VALUES, enumLabel } from '../../utils/enums';

export const MEAL_PLAN_CATEGORIES = ENUM_VALUES.mealPlanCategory;

export const mealPlanCategoryLabel = (t, category) =>
  enumLabel(t, 'mealPlanCategory', category || 'KeepFit');
