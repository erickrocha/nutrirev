import type { Recipe, RecipePayload } from '../types/recipe';
import type { ItemValues } from './mealPlanForm';

export interface RecipeFormValues {
  name: string;
  videoUrl: string;
  price: string;
  time: string;
  portion: string;
  description: string;
  recommendedPeriod: string;
  isHighlight: boolean;
  /** Sem campo na tela: são carregados da receita e devolvidos como vieram. */
  recommendedDays: string;
  recommendedMessage: string;
  cycleId: string;
  ingredients: ItemValues[];
  directions: Array<{ description: string }>;
  restrictions: string;
  tags: string;
}

export const emptyRecipeForm = (): RecipeFormValues => ({
  name: '', videoUrl: '', price: '', time: '', portion: '', description: '', recommendedPeriod: 'Weekly', isHighlight: false,
  recommendedDays: '', recommendedMessage: '', cycleId: '', ingredients: [], directions: [], restrictions: '', tags: '',
});

const text = (value: number | string | null | undefined): string => (value === null || value === undefined ? '' : String(value));

export const recipeToForm = (recipe: Recipe): RecipeFormValues => ({
  name: recipe.name || '',
  videoUrl: recipe.videoUrl || '',
  price: text(recipe.price),
  time: text(recipe.time),
  portion: text(recipe.portion),
  description: recipe.description || '',
  recommendedPeriod: recipe.recommendedPeriod || 'Weekly',
  isHighlight: Boolean(recipe.isHighlight),
  recommendedDays: recipe.recommendedDays ? String(recipe.recommendedDays) : '',
  recommendedMessage: recipe.recommendedMessage || '',
  cycleId: recipe.cycleId ? String(recipe.cycleId) : '',
  ingredients: (recipe.ingredients ?? []).map((item) => ({
    ingredientId: item.ingredientId || item.ingredient?.id || '',
    quantity: String(item.quantity || 100),
    unit: item.unit || 'Grams',
  })),
  directions: [...(recipe.directions ?? [])].sort((a, b) => a.stepNumber - b.stepNumber).map((step) => ({ description: step.description })),
  restrictions: (recipe.restrictions ?? []).map((item) => item.name).join(', '),
  tags: (recipe.tags ?? []).map((item) => item.name).join(', '),
});

const names = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean).map((name) => ({ id: 0, name }));
const intOrNull = (value: string): number | null => (value !== '' ? Number.parseInt(value, 10) : null);

export const hasUnselectedIngredient = (values: RecipeFormValues): boolean =>
  values.ingredients.some((item) => !(Number.parseInt(String(item.ingredientId), 10) > 0));

/** A foto não entra: vai separada, só quando o usuário escolhe uma nova. */
export const toRecipePayload = (values: RecipeFormValues, existing?: Recipe): RecipePayload => ({
  name: values.name.trim(),
  videoUrl: values.videoUrl,
  description: values.description,
  recommendedPeriod: values.recommendedPeriod,
  recommendedDays: values.recommendedDays,
  recommendedMessage: values.recommendedMessage,
  isHighlight: values.isHighlight,
  photo: existing?.photo ?? '',
  views: existing?.views || 0,
  additions: existing?.additions || 0,
  price: values.price !== '' ? Number.parseFloat(values.price) : null,
  time: intOrNull(values.time),
  portion: intOrNull(values.portion),
  cycleId: intOrNull(values.cycleId),
  ingredients: values.ingredients.map((item) => ({
    ingredientId: Number.parseInt(String(item.ingredientId), 10),
    quantity: Number.parseFloat(item.quantity) || 0,
    unit: item.unit || 'Grams',
    substitutes: [],
  })),
  directions: values.directions.map((step, index) => ({ stepNumber: index + 1, description: step.description })),
  restrictions: names(values.restrictions),
  tags: names(values.tags),
  meals: [],
  biotypes: [],
  sideDishes: [],
});
