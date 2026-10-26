import { configureStore } from '@reduxjs/toolkit';
import tenantReducer from './tenantSlice';
import authReducer from './authSlice';
import userReducer from './userSlice';
import recipeReducer from './recipeSlice';
import mealPlanReducer from './mealPlanSlice';
import customerReducer from './customerSlice';
import ingredientReducer from './ingredientSlice';
import clinicalReducer from './clinicalSlice';
import planOrderReducer from './planOrderSlice';

export const store = configureStore({
  reducer: {
    tenant: tenantReducer,
    auth: authReducer,
    user: userReducer,
    recipe: recipeReducer,
    mealPlan: mealPlanReducer,
    customer: customerReducer,
    ingredient: ingredientReducer,
    clinical: clinicalReducer,
    planOrder: planOrderReducer,
  },
});

