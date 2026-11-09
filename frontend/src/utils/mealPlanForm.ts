import type { MealPlan, MealPlanPayload } from '../types/mealPlan';

export interface ItemValues { ingredientId: number | string; quantity: string; unit: string }
export interface OptionValues { label: string; items: ItemValues[] }
export interface MealValues { mealType: string; isPreWorkout: boolean; isPostWorkout: boolean; nutritionistNote: string; options: OptionValues[] }

export interface MealPlanFormValues {
  name: string;
  category: string;
  generationStatus: string;
  isFavorite: boolean;
  patientId: string;
  nutritionistId: string;
  meals: MealValues[];
}

type Translate = (key: string) => string;

export const newOption = (label: string): OptionValues => ({ label, items: [] });
export const newMeal = (mealType: string, mainOptionLabel: string): MealValues => ({
  mealType, isPreWorkout: false, isPostWorkout: false, nutritionistNote: '', options: [newOption(mainOptionLabel)],
});
export const newItem = (ingredientId: number | string = ''): ItemValues => ({ ingredientId, quantity: '100', unit: 'Grams' });

export const emptyMealPlanForm = (t: Translate): MealPlanFormValues => ({
  name: '', category: 'KeepFit', generationStatus: 'Draft', isFavorite: false, patientId: '', nutritionistId: '',
  meals: [newMeal('Breakfast', t('mealPlanForm.mainOption'))],
});

export const planToForm = (plan: MealPlan, t: Translate): MealPlanFormValues => ({
  name: plan.name || '',
  category: plan.category || 'KeepFit',
  generationStatus: plan.generationStatus || 'Draft',
  isFavorite: Boolean(plan.isFavorite),
  patientId: plan.patientId ? String(plan.patientId) : '',
  nutritionistId: plan.nutritionistId ? String(plan.nutritionistId) : '',
  meals: (plan.meals ?? []).map((meal) => ({
    mealType: meal.mealType || 'Breakfast',
    isPreWorkout: Boolean(meal.isPreWorkout),
    isPostWorkout: Boolean(meal.isPostWorkout),
    nutritionistNote: meal.nutritionistNote || '',
    options: (meal.options ?? []).map((option, index) => ({
      label: option.label || `${t('mealPlanForm.optionPrefix')}${index + 1}`,
      items: (option.items ?? []).map((item) => ({ ingredientId: item.ingredientId, quantity: String(item.quantity || 100), unit: item.unit || 'Grams' })),
    })),
  })),
});

/** Ids de todos os ingredientes do plano: o cache só busca os que faltam. */
export const ingredientIdsOf = (plan: Pick<MealPlan, 'meals'> | MealPlanFormValues): Array<number | string> =>
  (plan.meals ?? []).flatMap((meal) => (meal.options ?? []).flatMap((option) => (option.items ?? []).map((item) => item.ingredientId)));

export const toMealPlanPayload = (values: MealPlanFormValues, t: Translate): MealPlanPayload => ({
  name: values.name.trim(),
  category: values.category,
  generationStatus: values.generationStatus,
  isFavorite: values.isFavorite,
  patientId: values.patientId ? Number.parseInt(values.patientId, 10) : null,
  nutritionistId: values.nutritionistId ? Number.parseInt(values.nutritionistId, 10) : null,
  viewed: false,
  meals: values.meals.map((meal, mealIndex) => ({
    mealType: meal.mealType,
    isPreWorkout: meal.isPreWorkout,
    isPostWorkout: meal.isPostWorkout,
    nutritionistNote: meal.nutritionistNote,
    position: mealIndex + 1,
    options: meal.options.map((option, optionIndex) => ({
      label: option.label || `${t('mealPlanForm.optionPrefix')}${optionIndex + 1}`,
      position: optionIndex + 1,
      items: option.items.map((item) => ({
        ingredientId: Number.parseInt(String(item.ingredientId), 10),
        quantity: Number.parseFloat(item.quantity) || 0,
        unit: item.unit,
        substitutes: [],
      })),
    })),
  })),
});

/** Todo item precisa de um ingrediente escolhido. */
export const hasInvalidIngredient = (values: MealPlanFormValues): boolean =>
  ingredientIdsOf(values).some((id) => Number.isNaN(Number.parseInt(String(id), 10)));
