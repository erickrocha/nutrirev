import { mealPointTierService } from '../services/clinicalService';
import { createCrudSlice } from './createCrudSlice';
import type { MealPointTier, MealPointTierPayload } from '../types/clinical';

const crud = createCrudSlice<MealPointTier, MealPointTierPayload>('mealPointTier', mealPointTierService);
export const fetchMealPointTiers = crud.fetchAll;
export const saveMealPointTier = crud.save;
export const clearMealPointTierError = crud.clearError;
export default crud.reducer;
