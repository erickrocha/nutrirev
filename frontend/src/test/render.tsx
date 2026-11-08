import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import planOrderReducer from '../store/planOrderSlice';
import customerFormReducer from '../store/customerFormSlice';
import catalogReducer from '../store/catalogSlice';
import csvImportReducer from '../store/csvImportSlice';
import clinicalPlanReducer from '../store/clinicalPlanSlice';
import mealPointTierReducer from '../store/mealPointTierSlice';
import paymentDateReducer from '../store/paymentDateSlice';
import paymentSettingsReducer from '../store/paymentSettingsSlice';
import ingredientCatalogReducer from '../store/ingredientCatalogSlice';
import customerListReducer from '../store/customerListSlice';
import goalReducer from '../store/goalSlice';
import manualMealReducer from '../store/manualMealSlice';
import businessPlanReducer from '../store/businessPlanSlice';
import addressReducer from '../store/addressSlice';
import tenantReducer from '../store/tenantSlice';
import userReducer from '../store/userSlice';
import paymentConnectionReducer from '../store/paymentConnectionSlice';
import doctorReducer from '../store/doctorSlice';
import paymentReducer from '../store/paymentSlice';
import customerAppReducer from '../store/customerAppSlice';
import dashboardReducer from '../store/dashboardSlice';
import customerReducer from '../store/customerSlice';
import mealPlanReducer from '../store/mealPlanSlice';
import recipeReducer from '../store/recipeSlice';
import ingredientReducer from '../store/ingredientSlice';
import tenantPlanReducer from '../store/tenantPlanSlice';

export interface TestUser { role?: string; email?: string }

export const makeStore = (user: TestUser | null = null) => configureStore({
  reducer: {
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
    // Fatias ainda em JS: no teste bastam estados fixos.
    auth: () => ({ user }),
    tenant: tenantReducer,
    user: userReducer,
    paymentConnection: paymentConnectionReducer,
    doctor: doctorReducer,
    payment: paymentReducer,
    customerApp: customerAppReducer,
    dashboard: dashboardReducer,
    customer: customerReducer,
    mealPlan: mealPlanReducer,
    recipe: recipeReducer,
    ingredient: ingredientReducer,
    tenantPlan: tenantPlanReducer,
  },
});

// t devolve a própria chave e o idioma é sempre pt: os testes não dependem do texto.
// Referência estável, como no react-i18next real (efeitos dependem de `t`).
const mockI18n = { t: (key: string) => key, i18n: { language: 'pt' } };
export const i18nMock = { useTranslation: () => mockI18n };

export const renderWithApp = (ui: ReactElement, { route = '/', path = '*', user = null }: { route?: string; path?: string; user?: TestUser | null } = {}) => {
  const store = makeStore(user);
  const utils = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={<div data-testid="elsewhere" />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return { store, ...utils };
};
