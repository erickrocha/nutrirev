import type { Customer } from './customer';

export interface SysAdminDashboard {
  totals?: {
    tenants?: number;
    users?: number;
    activePlans?: number;
    tenantsWithoutActivePlan?: number;
    monthlyRecurringRevenueInCents?: number;
  };
  billingAttention?: Array<{
    id?: number;
    businessPlanId?: number;
    tenantId: number;
    tenantName?: string;
    planName: string;
    paymentDate?: string;
    contractValueInCents?: number;
    overdue?: boolean;
  }>;
  recentTenants?: Array<{ id: number; name?: string; email?: string; activePlanName?: string; createdAt?: string }>;
}

export interface TenantDashboard {
  totals?: {
    customers?: number;
    doctors?: number;
    customersWithGoals?: number;
    mealPlans?: number;
    finishedMealPlans?: number;
    mobileEnabledCustomers?: number;
  };
  recentCustomers?: Customer[];
}
