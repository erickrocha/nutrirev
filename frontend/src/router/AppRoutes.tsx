import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { NotFoundPage } from '../pages/NotFoundPage';
import { useAppSelector } from '../store/hooks';
import { MainLayout } from '../components/layout/MainLayout';
import { DEFAULT_PATH_BY_ROLE, PATHS, editPath, newPath } from './routeConfig';
import { CATALOGS, editPath as catalogEditPath, newPath as catalogNewPath } from '../config/catalogs';

const UserListPage = lazy(() => import('../pages/admin/UserListPage').then((module) => ({ default: module.UserListPage })));
const UserFormPage = lazy(() => import('../pages/admin/UserFormPage').then((module) => ({ default: module.UserFormPage })));
const TenantDashboardPage = lazy(() => import('../pages/dashboard/TenantDashboardPage').then((module) => ({ default: module.TenantDashboardPage })));
const SysAdminDashboardPage = lazy(() => import('../pages/dashboard/SysAdminDashboardPage').then((module) => ({ default: module.SysAdminDashboardPage })));
const TenantListPage = lazy(() => import('../pages/admin/TenantListPage').then((module) => ({ default: module.TenantListPage })));
const TenantFormPage = lazy(() => import('../pages/admin/TenantFormPage').then((module) => ({ default: module.TenantFormPage })));
const TenantPlanPage = lazy(() => import('../pages/admin/TenantPlanPage').then((module) => ({ default: module.TenantPlanPage })));
const BusinessPlanListPage = lazy(() => import('../pages/admin/BusinessPlanListPage').then((module) => ({ default: module.BusinessPlanListPage })));
const BusinessPlanFormPage = lazy(() => import('../pages/admin/BusinessPlanFormPage').then((module) => ({ default: module.BusinessPlanFormPage })));
const PlanOrderManagement = lazy(() => import('../pages/admin/PlanOrderManagement').then((module) => ({ default: module.PlanOrderManagement })));
const PlanOrderDetailPage = lazy(() => import('../pages/admin/PlanOrderDetailPage').then((module) => ({ default: module.PlanOrderDetailPage })));
const PaymentConnectionListPage = lazy(() => import('../pages/admin/PaymentConnectionListPage').then((module) => ({ default: module.PaymentConnectionListPage })));
const PaymentConnectionFormPage = lazy(() => import('../pages/admin/PaymentConnectionFormPage').then((module) => ({ default: module.PaymentConnectionFormPage })));
const CustomerListPage = lazy(() => import('../pages/customers/CustomerListPage').then((module) => ({ default: module.CustomerListPage })));
const ClinicalPlanListPage = lazy(() => import('../pages/clinical/ClinicalPlanListPage').then((module) => ({ default: module.ClinicalPlanListPage })));
const ClinicalPlanFormPage = lazy(() => import('../pages/clinical/ClinicalPlanFormPage').then((module) => ({ default: module.ClinicalPlanFormPage })));
const PaymentDateListPage = lazy(() => import('../pages/clinical/PaymentDateListPage').then((module) => ({ default: module.PaymentDateListPage })));
const PaymentDateFormPage = lazy(() => import('../pages/clinical/PaymentDateFormPage').then((module) => ({ default: module.PaymentDateFormPage })));
const MealPointTierListPage = lazy(() => import('../pages/clinical/MealPointTierListPage').then((module) => ({ default: module.MealPointTierListPage })));
const MealPointTierFormPage = lazy(() => import('../pages/clinical/MealPointTierFormPage').then((module) => ({ default: module.MealPointTierFormPage })));
const CatalogListPage = lazy(() => import('../pages/clinical/CatalogListPage').then((module) => ({ default: module.CatalogListPage })));
const CatalogFormPage = lazy(() => import('../pages/clinical/CatalogFormPage').then((module) => ({ default: module.CatalogFormPage })));
const CustomerFormPage = lazy(() => import('../pages/customers/CustomerFormPage').then((module) => ({ default: module.CustomerFormPage })));
const GoalListPage = lazy(() => import('../pages/customers/GoalListPage').then((module) => ({ default: module.GoalListPage })));
const GoalFormPage = lazy(() => import('../pages/customers/GoalFormPage').then((module) => ({ default: module.GoalFormPage })));
const CustomerProfileEditPage = lazy(() => import('../pages/customers/CustomerProfileEditPage').then((module) => ({ default: module.CustomerProfileEditPage })));
const MyMealPlanPage = lazy(() => import('../pages/mealplans/MyMealPlanPage').then((module) => ({ default: module.MyMealPlanPage })));
const PaymentSettingsPage = lazy(() => import('../pages/clinical/PaymentSettingsPage').then((module) => ({ default: module.PaymentSettingsPage })));
const RecipeListPage = lazy(() => import('../pages/recipes/RecipeListPage').then((module) => ({ default: module.RecipeListPage })));
const RecipeFormPage = lazy(() => import('../pages/recipes/RecipeFormPage').then((module) => ({ default: module.RecipeFormPage })));
const MealPlanListPage = lazy(() => import('../pages/mealplans/MealPlanListPage').then((module) => ({ default: module.MealPlanListPage })));
const MealPlanFormPage = lazy(() => import('../pages/mealplans/MealPlanFormPage').then((module) => ({ default: module.MealPlanFormPage })));
const DoctorListPage = lazy(() => import('../pages/doctors/DoctorListPage').then((module) => ({ default: module.DoctorListPage })));
const DoctorFormPage = lazy(() => import('../pages/doctors/DoctorFormPage').then((module) => ({ default: module.DoctorFormPage })));
const CustomerHomePage = lazy(() => import('../pages/home/CustomerHomePage').then((module) => ({ default: module.CustomerHomePage })));
const CustomerDailyPage = lazy(() => import('../pages/daily/CustomerDailyPage').then((module) => ({ default: module.CustomerDailyPage })));
const ManualMealAnalysisPage = lazy(() => import('../pages/daily/ManualMealAnalysisPage').then((module) => ({ default: module.ManualMealAnalysisPage })));
const CustomerEatListPage = lazy(() => import('../pages/eat/CustomerEatListPage').then((module) => ({ default: module.CustomerEatListPage })));
const CustomerEatDetailPage = lazy(() => import('../pages/eat/CustomerEatDetailPage').then((module) => ({ default: module.CustomerEatDetailPage })));
const CustomerPaymentsPage = lazy(() => import('../pages/payments/CustomerPaymentsPage').then((module) => ({ default: module.CustomerPaymentsPage })));
const IngredientListPage = lazy(() => import('../pages/clinical/IngredientListPage').then((module) => ({ default: module.IngredientListPage })));
const IngredientFormPage = lazy(() => import('../pages/clinical/IngredientFormPage').then((module) => ({ default: module.IngredientFormPage })));

// "/" leva à página inicial do perfil; qualquer outro endereço sem rota é um 404.
const UnknownRoute = () => {
  const { pathname } = useLocation();
  const role = useAppSelector((state) => state.auth.user?.role);
  if (pathname !== '/') return <NotFoundPage homePath="/" />;
  return <Navigate to={(DEFAULT_PATH_BY_ROLE as Record<string, string>)[role ?? ''] ?? DEFAULT_PATH_BY_ROLE.default} replace />;
};

export const AppRoutes = () => (
  <Suspense fallback={<div role="status" className="flex h-screen items-center justify-center text-[var(--text-body)]">…</div>}>
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
      <Route path={PATHS.BUSINESS_PLANS} element={<BusinessPlanListPage />} />
      <Route path={PATHS.BUSINESS_PLAN_NEW} element={<BusinessPlanFormPage />} />
      <Route path={PATHS.BUSINESS_PLAN_EDIT} element={<BusinessPlanFormPage />} />
      <Route path={PATHS.PLAN_ORDERS} element={<PlanOrderManagement />} />
      <Route path={PATHS.PLAN_ORDER_DETAIL} element={<PlanOrderDetailPage />} />
      <Route path={PATHS.PAYMENT_CONNECTIONS} element={<PaymentConnectionListPage />} />
      <Route path={newPath(PATHS.PAYMENT_CONNECTIONS)} element={<PaymentConnectionFormPage />} />
      <Route path={editPath(PATHS.PAYMENT_CONNECTIONS, ':id')} element={<PaymentConnectionFormPage />} />
      <Route path={PATHS.USERS} element={<UserListPage />} />
      <Route path={newPath(PATHS.USERS)} element={<UserFormPage />} />
      <Route path={editPath(PATHS.USERS, ':id')} element={<UserFormPage />} />
      <Route path={PATHS.TENANTS} element={<TenantListPage />} />
      <Route path={newPath(PATHS.TENANTS)} element={<TenantFormPage />} />
      <Route path={editPath(PATHS.TENANTS, ':id')} element={<TenantFormPage />} />
      <Route path={PATHS.TENANT_PLAN} element={<TenantPlanPage />} />
      <Route path={PATHS.CUSTOMERS} element={<CustomerListPage />} />
      <Route path={PATHS.CUSTOMER_NEW} element={<CustomerFormPage />} />
      <Route path={PATHS.CUSTOMER_EDIT} element={<CustomerFormPage />} />
      <Route path={PATHS.DOCTORS} element={<DoctorListPage />} />
      <Route path={newPath(PATHS.DOCTORS)} element={<DoctorFormPage />} />
      <Route path={editPath(PATHS.DOCTORS, ':id')} element={<DoctorFormPage />} />
      <Route path={PATHS.CUSTOMER_GOALS} element={<GoalListPage />} />
      <Route path={newPath(PATHS.CUSTOMER_GOALS)} element={<GoalFormPage />} />
      <Route path={editPath(PATHS.CUSTOMER_GOALS, ':id')} element={<GoalFormPage />} />
      <Route path={PATHS.PAYMENT_SETTINGS} element={<PaymentSettingsPage />} />
      <Route path={PATHS.RECIPES} element={<RecipeListPage />} />
      <Route path={newPath(PATHS.RECIPES)} element={<RecipeFormPage />} />
      <Route path={editPath(PATHS.RECIPES, ':id')} element={<RecipeFormPage />} />
      <Route path={PATHS.CLINICAL_PLANS} element={<ClinicalPlanListPage />} />
      <Route path={newPath(PATHS.CLINICAL_PLANS)} element={<ClinicalPlanFormPage />} />
      <Route path={editPath(PATHS.CLINICAL_PLANS, ':id')} element={<ClinicalPlanFormPage />} />
      <Route path={PATHS.PAYMENT_DATES} element={<PaymentDateListPage />} />
      <Route path={newPath(PATHS.PAYMENT_DATES)} element={<PaymentDateFormPage />} />
      <Route path={editPath(PATHS.PAYMENT_DATES, ':id')} element={<PaymentDateFormPage />} />
      <Route path={PATHS.MEAL_POINT_TIERS} element={<MealPointTierListPage />} />
      <Route path={newPath(PATHS.MEAL_POINT_TIERS)} element={<MealPointTierFormPage />} />
      <Route path={editPath(PATHS.MEAL_POINT_TIERS, ':id')} element={<MealPointTierFormPage />} />
      {CATALOGS.map((catalog) => [
        <Route key={catalog.key} path={catalog.path} element={<CatalogListPage catalog={catalog} />} />,
        <Route key={`${catalog.key}-new`} path={catalogNewPath(catalog)} element={<CatalogFormPage catalog={catalog} />} />,
        <Route key={`${catalog.key}-edit`} path={catalogEditPath(catalog, ':id')} element={<CatalogFormPage catalog={catalog} />} />,
      ])}
      <Route path={PATHS.INGREDIENTS} element={<IngredientListPage />} />
      <Route path={newPath(PATHS.INGREDIENTS)} element={<IngredientFormPage />} />
      <Route path={editPath(PATHS.INGREDIENTS, ':id')} element={<IngredientFormPage />} />
      <Route path={PATHS.MEAL_PLANS} element={<MealPlanListPage />} />
      <Route path={newPath(PATHS.MEAL_PLANS)} element={<MealPlanFormPage />} />
      <Route path={editPath(PATHS.MEAL_PLANS, ':id')} element={<MealPlanFormPage />} />
    </Route>

    <Route path="*" element={<UnknownRoute />} />
    </Routes>
  </Suspense>
);
