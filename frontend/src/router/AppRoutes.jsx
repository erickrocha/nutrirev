import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { PATHS } from './routeConfig';

const UserManagement = lazy(() => import('../pages/admin/UserManagement').then((module) => ({ default: module.UserManagement })));
const TenantManagement = lazy(() => import('../pages/admin/TenantManagement').then((module) => ({ default: module.TenantManagement })));
const TenantDashboardPage = lazy(() => import('../pages/dashboard/TenantDashboardPage').then((module) => ({ default: module.TenantDashboardPage })));
const SysAdminDashboardPage = lazy(() => import('../pages/dashboard/SysAdminDashboardPage').then((module) => ({ default: module.SysAdminDashboardPage })));
const BusinessPlanManagement = lazy(() => import('../pages/admin/BusinessPlanManagement').then((module) => ({ default: module.BusinessPlanManagement })));
const BusinessPlanFormPage = lazy(() => import('../pages/admin/BusinessPlanFormPage').then((module) => ({ default: module.BusinessPlanFormPage })));
const PlanOrderManagement = lazy(() => import('../pages/admin/PlanOrderManagement').then((module) => ({ default: module.PlanOrderManagement })));
const PlanOrderDetailPage = lazy(() => import('../pages/admin/PlanOrderDetailPage').then((module) => ({ default: module.PlanOrderDetailPage })));
const PaymentConnectionManagement = lazy(() => import('../pages/admin/PaymentConnectionManagement').then((module) => ({ default: module.PaymentConnectionManagement })));
const CustomerManagement = lazy(() => import('../pages/customers/CustomerManagement').then((module) => ({ default: module.CustomerManagement })));
const CustomerGoalSettingManagement = lazy(() => import('../pages/customers/CustomerGoalSettingManagement').then((module) => ({ default: module.CustomerGoalSettingManagement })));
const CustomerProfileEditPage = lazy(() => import('../pages/customers/CustomerProfileEditPage').then((module) => ({ default: module.CustomerProfileEditPage })));
const MyMealPlanPage = lazy(() => import('../pages/mealplans/MyMealPlanPage').then((module) => ({ default: module.MyMealPlanPage })));
const ClinicalPlanManagement = lazy(() => import('../pages/clinical/ClinicalPlanManagement').then((module) => ({ default: module.ClinicalPlanManagement })));
const PaymentDateManagement = lazy(() => import('../pages/clinical/PaymentDateManagement').then((module) => ({ default: module.PaymentDateManagement })));
const PaymentSettingsPage = lazy(() => import('../pages/clinical/PaymentSettingsPage').then((module) => ({ default: module.PaymentSettingsPage })));
const PrepareMealManagement = lazy(() => import('../pages/clinical/PrepareMealManagement').then((module) => ({ default: module.PrepareMealManagement })));
const DailyMealManagement = lazy(() => import('../pages/clinical/DailyMealManagement').then((module) => ({ default: module.DailyMealManagement })));
const DietaryRestrictionManagement = lazy(() => import('../pages/clinical/DietaryRestrictionManagement').then((module) => ({ default: module.DietaryRestrictionManagement })));
const BowelFunctionManagement = lazy(() => import('../pages/clinical/BowelFunctionManagement').then((module) => ({ default: module.BowelFunctionManagement })));
const PreExistingConditionsManagement = lazy(() => import('../pages/clinical/PreExistingConditionsManagement').then((module) => ({ default: module.PreExistingConditionsManagement })));
const ClinicalConditionsManagement = lazy(() => import('../pages/clinical/ClinicalConditionsManagement').then((module) => ({ default: module.ClinicalConditionsManagement })));
const FormulaManagement = lazy(() => import('../pages/clinical/FormulaManagement').then((module) => ({ default: module.FormulaManagement })));
const ActivityFactorManagement = lazy(() => import('../pages/clinical/ActivityFactorManagement').then((module) => ({ default: module.ActivityFactorManagement })));
const ObjectiveManagement = lazy(() => import('../pages/clinical/ObjectiveManagement').then((module) => ({ default: module.ObjectiveManagement })));
const PhysicalActivityLevelManagement = lazy(() => import('../pages/clinical/PhysicalActivityLevelManagement').then((module) => ({ default: module.PhysicalActivityLevelManagement })));
const RecipesListPage = lazy(() => import('../pages/recipes/RecipesListPage').then((module) => ({ default: module.RecipesListPage })));
const MealPlansListPage = lazy(() => import('../pages/mealplans/MealPlansListPage').then((module) => ({ default: module.MealPlansListPage })));
const DoctorManagement = lazy(() => import('../pages/doctors/DoctorManagement').then((module) => ({ default: module.DoctorManagement })));
const CustomerHomePage = lazy(() => import('../pages/home/CustomerHomePage').then((module) => ({ default: module.CustomerHomePage })));
const CustomerDailyPage = lazy(() => import('../pages/daily/CustomerDailyPage').then((module) => ({ default: module.CustomerDailyPage })));
const ManualMealAnalysisPage = lazy(() => import('../pages/daily/ManualMealAnalysisPage').then((module) => ({ default: module.ManualMealAnalysisPage })));
const CustomerEatListPage = lazy(() => import('../pages/eat/CustomerEatListPage').then((module) => ({ default: module.CustomerEatListPage })));
const CustomerEatDetailPage = lazy(() => import('../pages/eat/CustomerEatDetailPage').then((module) => ({ default: module.CustomerEatDetailPage })));
const CustomerPaymentsPage = lazy(() => import('../pages/payments/CustomerPaymentsPage').then((module) => ({ default: module.CustomerPaymentsPage })));
const IngredientManagement = lazy(() => import('../pages/clinical/IngredientManagement').then((module) => ({ default: module.IngredientManagement })));
const MealPointTierManagement = lazy(() => import('../pages/clinical/MealPointTierManagement').then((module) => ({ default: module.MealPointTierManagement })));

export const AppRoutes = () => (
  <Suspense fallback={<div className="route-loading-state">Loading...</div>}>
    <Routes>
    <Route element={<MainLayout />}>
      {/* Customer ("user" role) */}
      <Route path={PATHS.HOME} element={<CustomerHomePage />} />
      <Route path={PATHS.MY_MEAL_PLAN} element={<MyMealPlanPage />} />
      <Route path={PATHS.DAILY} element={<CustomerDailyPage />} />
      <Route path={PATHS.MANUAL_MEAL_ANALYSIS} element={<ManualMealAnalysisPage />} />
      <Route path={PATHS.EAT} element={<CustomerEatListPage />} />
      <Route path={PATHS.EAT_DETAIL} element={<CustomerEatDetailPage />} />
      <Route path={PATHS.PAYMENTS} element={<CustomerPaymentsPage />} />
      <Route path={PATHS.SETTINGS} element={<CustomerProfileEditPage />} />

      {/* Admin / tenant / clinical */}
      <Route path={PATHS.TENANT_DASHBOARD} element={<TenantDashboardPage />} />
      <Route path={PATHS.SYSADMIN_DASHBOARD} element={<SysAdminDashboardPage />} />
      <Route path={PATHS.BUSINESS_PLANS} element={<BusinessPlanManagement />} />
      <Route path={PATHS.BUSINESS_PLAN_NEW} element={<BusinessPlanFormPage />} />
      <Route path={PATHS.BUSINESS_PLAN_EDIT} element={<BusinessPlanFormPage />} />
      <Route path={PATHS.PLAN_ORDERS} element={<PlanOrderManagement />} />
      <Route path={PATHS.PLAN_ORDER_DETAIL} element={<PlanOrderDetailPage />} />
      <Route path={PATHS.PAYMENT_CONNECTIONS} element={<PaymentConnectionManagement />} />
      <Route path={PATHS.USERS} element={<UserManagement />} />
      <Route path={PATHS.TENANTS} element={<TenantManagement />} />
      <Route path={PATHS.CUSTOMERS} element={<CustomerManagement />} />
      <Route path={PATHS.DOCTORS} element={<DoctorManagement />} />
      <Route path={PATHS.CUSTOMER_GOALS} element={<CustomerGoalSettingManagement />} />
      <Route path={PATHS.CLINICAL_PLANS} element={<ClinicalPlanManagement />} />
      <Route path={PATHS.PAYMENT_DATES} element={<PaymentDateManagement />} />
      <Route path={PATHS.PAYMENT_SETTINGS} element={<PaymentSettingsPage />} />
      <Route path={PATHS.PREPARE_MEALS} element={<PrepareMealManagement />} />
      <Route path={PATHS.DAILY_MEALS} element={<DailyMealManagement />} />
      <Route path={PATHS.DIETARY_RESTRICTIONS} element={<DietaryRestrictionManagement />} />
      <Route path={PATHS.BOWEL_FUNCTIONS} element={<BowelFunctionManagement />} />
      <Route path={PATHS.PRE_EXISTING_CONDITIONS} element={<PreExistingConditionsManagement />} />
      <Route path={PATHS.CLINICAL_CONDITIONS} element={<ClinicalConditionsManagement />} />
      <Route path={PATHS.FORMULAS} element={<FormulaManagement />} />
      <Route path={PATHS.ACTIVITY_FACTORS} element={<ActivityFactorManagement />} />
      <Route path={PATHS.OBJECTIVES} element={<ObjectiveManagement />} />
      <Route path={PATHS.PHYSICAL_ACTIVITY_LEVELS} element={<PhysicalActivityLevelManagement />} />
      <Route path={PATHS.RECIPES} element={<RecipesListPage />} />
      <Route path={PATHS.INGREDIENTS} element={<IngredientManagement />} />
      <Route path={PATHS.MEAL_PLANS} element={<MealPlansListPage />} />
      <Route path={PATHS.MEAL_POINT_TIERS} element={<MealPointTierManagement />} />
    </Route>

    {/* Any unmatched path (including "/") renders MainLayout, whose own
        role-based guard redirects to that role's default landing page. */}
    <Route path="*" element={<MainLayout />} />
    </Routes>
  </Suspense>
);
