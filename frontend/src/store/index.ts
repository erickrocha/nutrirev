import { configureStore } from '@reduxjs/toolkit';
import tenantReducer from './tenantSlice';
import authReducer from './authSlice';
import userReducer from './userSlice';
import recipeReducer from './recipeSlice';
import mealPlanReducer from './mealPlanSlice';
import customerReducer from './customerSlice';
import ingredientReducer from './ingredientSlice';
import planOrderReducer from './planOrderSlice';
import customerFormReducer from './customerFormSlice';
import catalogReducer from './catalogSlice';
import csvImportReducer from './csvImportSlice';
import clinicalPlanReducer from './clinicalPlanSlice';
import mealPointTierReducer from './mealPointTierSlice';
import paymentDateReducer from './paymentDateSlice';
import paymentSettingsReducer from './paymentSettingsSlice';
import ingredientCatalogReducer from './ingredientCatalogSlice';
import customerListReducer from './customerListSlice';
import goalReducer from './goalSlice';
import manualMealReducer from './manualMealSlice';
import businessPlanReducer from './businessPlanSlice';
import addressReducer from './addressSlice';
import tenantPlanReducer from './tenantPlanSlice';
import paymentConnectionReducer from './paymentConnectionSlice';
import doctorReducer from './doctorSlice';
import paymentReducer from './paymentSlice';
import customerAppReducer from './customerAppSlice';
import dashboardReducer from './dashboardSlice';

export const store = configureStore({
  reducer: {
    tenant: tenantReducer,
    auth: authReducer,
    user: userReducer,
    recipe: recipeReducer,
    mealPlan: mealPlanReducer,
    customer: customerReducer,
    ingredient: ingredientReducer,
    planOrder: planOrderReducer,
    customerForm: customerFormReducer,
    catalog: catalogReducer,
    csvImport: csvImportReducer,
    clinicalPlan: clinicalPlanReducer,
    mealPointTier: mealPointTierReducer,
    paymentDate: paymentDateReducer,
    paymentSettings: paymentSettingsReducer,
    ingredientCatalog: ingredientCatalogReducer,
    customerList: customerListReducer,
    goal: goalReducer,
    manualMeal: manualMealReducer,
    businessPlan: businessPlanReducer,
    address: addressReducer,
    tenantPlan: tenantPlanReducer,
    paymentConnection: paymentConnectionReducer,
    doctor: doctorReducer,
    payment: paymentReducer,
    customerApp: customerAppReducer,
    dashboard: dashboardReducer,
  },
});

