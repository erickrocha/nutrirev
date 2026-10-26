import { ROLES } from '../utils/enums';

// Single source of truth for the URL path each former tab-id now maps to.
// Rule: kebab-case rename of the old tab id (underscores -> hyphens), except
// 'my_meal_plan' -> /meal-plan and 'edit_profile' -> /settings, which are
// deliberately renamed to mirror the mobile app's tab naming.
export const PATHS = {
  // Customer ("user" role) — mirrors mobile's 5 tabs
  HOME: '/home',
  MY_MEAL_PLAN: '/meal-plan',
  DAILY: '/daily',
  MANUAL_MEAL_ANALYSIS: '/manual-meal-analysis',
  EAT: '/eat',
  EAT_DETAIL: '/eat/:id',
  PAYMENTS: '/payments',
  SETTINGS: '/settings',

  // Admin / tenant / clinical
  TENANT_DASHBOARD: '/dashboard',
  SYSADMIN_DASHBOARD: '/admin/dashboard',
  BUSINESS_PLANS: '/admin/business-plans',
  BUSINESS_PLAN_NEW: '/admin/business-plans/new',
  BUSINESS_PLAN_EDIT: '/admin/business-plans/:id/edit',
  PLAN_ORDERS: '/admin/orders',
  PLAN_ORDER_DETAIL: '/admin/orders/:uuid',
  PAYMENT_CONNECTIONS: '/admin/payment-connections',
  USERS: '/users',
  TENANTS: '/tenants',
  CUSTOMERS: '/customers',
  CUSTOMER_GOALS: '/customer-goals',
  CLINICAL_PLANS: '/clinical-plans',
  PAYMENT_DATES: '/payment-dates',
  PAYMENT_SETTINGS: '/payment-settings',
  PREPARE_MEALS: '/prepare-meals',
  DAILY_MEALS: '/daily-meals',
  DIETARY_RESTRICTIONS: '/dietary-restrictions',
  BOWEL_FUNCTIONS: '/bowel-functions',
  PRE_EXISTING_CONDITIONS: '/pre-existing-conditions',
  CLINICAL_CONDITIONS: '/clinical-conditions',
  FORMULAS: '/formulas',
  ACTIVITY_FACTORS: '/activity-factors',
  OBJECTIVES: '/objectives',
  PHYSICAL_ACTIVITY_LEVELS: '/physical-activity-levels',
  RECIPES: '/recipes',
  INGREDIENTS: '/ingredients',
  MEAL_PLANS: '/meal-plans',
  DOCTORS: '/doctors',
  MEAL_POINT_TIERS: '/meal-point-tiers',
};

const CLINICAL_ONLY_PATHS = [
  PATHS.DIETARY_RESTRICTIONS,
  PATHS.BOWEL_FUNCTIONS,
  PATHS.PRE_EXISTING_CONDITIONS,
  PATHS.CLINICAL_CONDITIONS,
  PATHS.FORMULAS,
  PATHS.ACTIVITY_FACTORS,
  PATHS.OBJECTIVES,
  PATHS.PHYSICAL_ACTIVITY_LEVELS,
];

const TENANT_USER_PATHS = [
  PATHS.TENANT_DASHBOARD,
  PATHS.CUSTOMERS,
  PATHS.CUSTOMER_GOALS,
  PATHS.CLINICAL_PLANS,
  PATHS.PAYMENT_DATES,
  PATHS.PAYMENT_SETTINGS,
  PATHS.PREPARE_MEALS,
  PATHS.DAILY_MEALS,
  PATHS.RECIPES,
  PATHS.INGREDIENTS,
  PATHS.MEAL_PLANS,
  PATHS.DOCTORS,
  PATHS.MEAL_POINT_TIERS,
];

const NON_SYSADMIN_PATHS = [
  PATHS.USERS,
  PATHS.CUSTOMERS,
  ...TENANT_USER_PATHS.filter((p) => p !== PATHS.CUSTOMERS),
  ...CLINICAL_ONLY_PATHS,
];

export const ROLE_ALLOWED_PATHS = {
  [ROLES.USER]: [PATHS.HOME, PATHS.MY_MEAL_PLAN, PATHS.DAILY, PATHS.MANUAL_MEAL_ANALYSIS, PATHS.EAT, PATHS.EAT_DETAIL, PATHS.PAYMENTS, PATHS.SETTINGS],
  // SETTINGS (Topbar's "Editar Perfil") is reachable by every role, matching
  // the old unrestricted 'edit_profile' tab behavior.
  [ROLES.TENANT_USER]: [...TENANT_USER_PATHS, PATHS.SETTINGS],
  [ROLES.TENANT_OWNER]: [...NON_SYSADMIN_PATHS, PATHS.SETTINGS],
  [ROLES.SYS_ADMIN]: [
    PATHS.SYSADMIN_DASHBOARD,
    PATHS.BUSINESS_PLANS,
    PATHS.BUSINESS_PLAN_NEW,
    PATHS.BUSINESS_PLAN_EDIT,
    PATHS.PLAN_ORDERS,
    PATHS.PLAN_ORDER_DETAIL,
    // Provisioning acquirer connections is the platform operator's alone: the
    // secret pointer names a deployment secret, not a clinic-settable value.
    PATHS.PAYMENT_CONNECTIONS,
    PATHS.TENANTS,
    ...NON_SYSADMIN_PATHS,
    PATHS.SETTINGS,
  ],
};

export const DEFAULT_PATH_BY_ROLE = {
  [ROLES.USER]: PATHS.HOME,
  [ROLES.TENANT_USER]: PATHS.TENANT_DASHBOARD,
  [ROLES.TENANT_OWNER]: PATHS.TENANT_DASHBOARD,
  [ROLES.SYS_ADMIN]: PATHS.SYSADMIN_DASHBOARD,
  default: PATHS.TENANT_DASHBOARD,
};
