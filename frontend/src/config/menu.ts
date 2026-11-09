import {
  Activity, AlertCircle, Apple, Building, CalendarDays, Calculator, Compass, CreditCard, FileText, Flame, Heart, Home, Inbox,
  LayoutDashboard, Settings, Star, Stethoscope, Target, UserCheck, Users, Utensils, Zap,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { PATHS } from '../router/routeConfig';
import { ROLES } from '../utils/enums';

export interface MenuItem { path: string; label: string; icon: ComponentType<{ size?: number; className?: string }> }
export interface MenuSection { id: string; title: string; items: MenuItem[] }

type Translate = (key: string) => string;

/** Menu lateral de cada perfil: o paciente vê o app; a equipe da clínica e o operador, a gestão. */
export const buildMenu = (role: string, t: Translate): MenuSection[] => {
  const isSysAdmin = role === ROLES.SYS_ADMIN;
  const isTenantUser = role === ROLES.TENANT_USER;
  const isTenantOwner = role === ROLES.TENANT_OWNER;

  if (role === ROLES.USER) {
    return [{
      id: 'user-menu', title: t('sidebar.menu'),
      items: [
        { path: PATHS.HOME, label: t('sidebar.home'), icon: Home },
        { path: PATHS.MY_MEAL_PLAN, label: t('sidebar.myMealPlan'), icon: FileText },
        { path: PATHS.DAILY, label: t('sidebar.daily'), icon: CalendarDays },
        { path: PATHS.MANUAL_MEAL_ANALYSIS, label: t('sidebar.manualMealAnalysis'), icon: Calculator },
        { path: PATHS.EAT, label: t('sidebar.recipes'), icon: Utensils },
        { path: PATHS.PAYMENTS, label: t('sidebar.payments'), icon: CreditCard },
        { path: PATHS.SETTINGS, label: t('sidebar.settings'), icon: Settings },
      ],
    }];
  }

  const when = (condition: boolean, item: MenuItem): MenuItem[] => (condition ? [item] : []);
  return [
    {
      id: 'main', title: t('sidebar.main'),
      items: [
        ...when(isSysAdmin, { path: PATHS.SYSADMIN_DASHBOARD, label: t('sidebar.adminDashboard'), icon: LayoutDashboard }),
        { path: PATHS.TENANT_DASHBOARD, label: isSysAdmin ? t('sidebar.tenantDashboard') : t('sidebar.dashboard'), icon: LayoutDashboard },
        ...when(!isTenantUser, { path: PATHS.USERS, label: t('sidebar.users'), icon: Users }),
        ...when(isSysAdmin, { path: PATHS.TENANTS, label: t('sidebar.tenants'), icon: Building }),
        ...when(isSysAdmin, { path: PATHS.BUSINESS_PLANS, label: t('sidebar.businessPlans'), icon: FileText }),
        ...when(isSysAdmin, { path: PATHS.PLAN_ORDERS, label: t('sidebar.planOrders'), icon: Inbox }),
        ...when(isSysAdmin, { path: PATHS.PAYMENT_CONNECTIONS, label: t('sidebar.paymentConnections'), icon: CreditCard }),
        { path: PATHS.CUSTOMERS, label: t('sidebar.customers'), icon: UserCheck },
        ...when(isTenantOwner || isTenantUser || isSysAdmin, { path: PATHS.DOCTORS, label: t('sidebar.doctors'), icon: Stethoscope }),
      ],
    },
    {
      id: 'service-and-goals', title: t('sidebar.serviceAndGoals'),
      items: [
        { path: PATHS.CUSTOMER_GOALS, label: t('sidebar.customerGoals'), icon: Target },
        { path: PATHS.CLINICAL_PLANS, label: t('sidebar.clinicalPlans'), icon: FileText },
        { path: PATHS.PAYMENT_DATES, label: t('paymentDates.title'), icon: CalendarDays },
        { path: PATHS.PAYMENT_SETTINGS, label: t('sidebar.paymentSettings'), icon: CreditCard },
        { path: PATHS.PREPARE_MEALS, label: t('sidebar.prepareMeals'), icon: Utensils },
        { path: PATHS.DAILY_MEALS, label: t('sidebar.dailyMeals'), icon: CalendarDays },
        { path: PATHS.MEAL_POINT_TIERS, label: t('sidebar.mealPointTiers'), icon: Star },
      ],
    },
    {
      id: 'recipes-and-diets', title: t('sidebar.recipesAndDiets'),
      items: [
        { path: PATHS.RECIPES, label: t('sidebar.recipesEat'), icon: Utensils },
        { path: PATHS.INGREDIENTS, label: t('sidebar.ingredients'), icon: Apple },
        { path: PATHS.MEAL_PLANS, label: t('sidebar.mealPlans'), icon: FileText },
      ],
    },
    ...(isTenantUser ? [] : [{
      id: 'clinical-parameters', title: t('sidebar.clinicalParameters'),
      items: [
        { path: PATHS.DIETARY_RESTRICTIONS, label: t('sidebar.dietaryRestrictions'), icon: AlertCircle },
        { path: PATHS.BOWEL_FUNCTIONS, label: t('sidebar.bowelFunctions'), icon: Activity },
        { path: PATHS.PRE_EXISTING_CONDITIONS, label: t('sidebar.preExistingConditions'), icon: Heart },
        { path: PATHS.CLINICAL_CONDITIONS, label: t('sidebar.clinicalConditions'), icon: Stethoscope },
        { path: PATHS.FORMULAS, label: t('sidebar.formulas'), icon: Calculator },
        { path: PATHS.ACTIVITY_FACTORS, label: t('sidebar.activityFactors'), icon: Zap },
        { path: PATHS.OBJECTIVES, label: t('sidebar.objectives'), icon: Compass },
        { path: PATHS.PHYSICAL_ACTIVITY_LEVELS, label: t('sidebar.activityLevels'), icon: Flame },
      ],
    }]),
  ];
};
