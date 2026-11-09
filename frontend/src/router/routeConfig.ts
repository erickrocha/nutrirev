import { matchPath } from 'react-router-dom';
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
  TENANT_PLAN: '/tenants/:id/plan',
  CUSTOMERS: '/customers',
  CUSTOMER_NEW: '/customers/new',
  CUSTOMER_EDIT: '/customers/:id/edit',
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

// Catalog CRUD screens: list, add and edit are separate pages.
export const newPath = (path: string) => `${path}/new`;
export const editPath = (path: string, id: string | number) => `${path}/${id}/edit`;
const withForms = (path: string) => [path, newPath(path), editPath(path, ':id')];

const CLINICAL_ONLY_PATHS = [
  ...withForms(PATHS.DIETARY_RESTRICTIONS),
  ...withForms(PATHS.BOWEL_FUNCTIONS),
  ...withForms(PATHS.PRE_EXISTING_CONDITIONS),
  ...withForms(PATHS.CLINICAL_CONDITIONS),
  ...withForms(PATHS.FORMULAS),
  ...withForms(PATHS.ACTIVITY_FACTORS),
  ...withForms(PATHS.OBJECTIVES),
  ...withForms(PATHS.PHYSICAL_ACTIVITY_LEVELS),
];

const TENANT_USER_PATHS = [
  PATHS.TENANT_DASHBOARD,
  ...withForms(PATHS.CUSTOMERS),
  ...withForms(PATHS.CUSTOMER_GOALS),
  ...withForms(PATHS.CLINICAL_PLANS),
  ...withForms(PATHS.PAYMENT_DATES),
  PATHS.PAYMENT_SETTINGS,
  ...withForms(PATHS.PREPARE_MEALS),
  ...withForms(PATHS.DAILY_MEALS),
  ...withForms(PATHS.RECIPES),
  ...withForms(PATHS.INGREDIENTS),
  ...withForms(PATHS.MEAL_PLANS),
  ...withForms(PATHS.DOCTORS),
  ...withForms(PATHS.MEAL_POINT_TIERS),
];

const NON_SYSADMIN_PATHS = [
  ...withForms(PATHS.USERS),
  ...TENANT_USER_PATHS,
  ...CLINICAL_ONLY_PATHS,
];

export const ROLE_ALLOWED_PATHS: Record<string, string[]> = {
  [ROLES.USER]: [PATHS.HOME, PATHS.MY_MEAL_PLAN, PATHS.DAILY, PATHS.MANUAL_MEAL_ANALYSIS, PATHS.EAT, PATHS.EAT_DETAIL, PATHS.PAYMENTS, PATHS.SETTINGS],
  [ROLES.TENANT_USER]: [...TENANT_USER_PATHS],
  [ROLES.TENANT_OWNER]: [...NON_SYSADMIN_PATHS],
  [ROLES.SYS_ADMIN]: [
    PATHS.SYSADMIN_DASHBOARD,
    PATHS.BUSINESS_PLANS,
    PATHS.BUSINESS_PLAN_NEW,
    PATHS.BUSINESS_PLAN_EDIT,
    PATHS.PLAN_ORDERS,
    PATHS.PLAN_ORDER_DETAIL,
    // Provisioning acquirer connections is the platform operator's alone: the
    // secret pointer names a deployment secret, not a clinic-settable value.
    ...withForms(PATHS.PAYMENT_CONNECTIONS),
    ...withForms(PATHS.TENANTS),
    PATHS.TENANT_PLAN,
    ...NON_SYSADMIN_PATHS,
  ],
};

export const DEFAULT_PATH_BY_ROLE: Record<string, string> & { default: string } = {
  [ROLES.USER]: PATHS.HOME,
  [ROLES.TENANT_USER]: PATHS.TENANT_DASHBOARD,
  [ROLES.TENANT_OWNER]: PATHS.TENANT_DASHBOARD,
  [ROLES.SYS_ADMIN]: PATHS.SYSADMIN_DASHBOARD,
  default: PATHS.TENANT_DASHBOARD,
};

/** O endereço é uma tela interna de algum perfil? (usado para mandar o visitante deslogado ao login em vez do 404) */
export const isAppPath = (pathname: string): boolean =>
  Object.values(ROLE_ALLOWED_PATHS).some((patterns) => patterns.some((pattern) => matchPath({ path: pattern, end: true }, pathname)));
