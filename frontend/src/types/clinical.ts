export interface ClinicalPlan {
  id: number;
  name: string;
  priceInCents?: number | null;
  renewPeriodDays?: number | null;
}
export type ClinicalPlanPayload = Omit<ClinicalPlan, 'id'>;

export interface MealPointTier {
  id: number;
  dailyMealId: number | null;
  /** HH:mm:ss */
  deadlineTime: string;
  points: number;
}
export type MealPointTierPayload = Omit<MealPointTier, 'id'>;

export interface PaymentDate {
  id: number;
  customerId: number | null;
  clinicalPlanId: number | null;
  firstDueDate: string;
  nextDueDate?: string | null;
  status?: 'active' | 'cancelled' | 'completed';
  isActive?: boolean;
}
export type PaymentDatePayload = Pick<PaymentDate, 'customerId' | 'clinicalPlanId' | 'firstDueDate'>;

export interface PaymentCharge {
  id?: number;
  status: string;
  dueDate?: string;
  amountCents?: number;
  installment?: number;
  [key: string]: unknown;
}

export interface PaymentReversal {
  attemptId: number | string;
  customerName: string;
  amountCents: number;
  reversedAt: string;
}

export interface PaymentConnection {
  id: number;
  provider: string;
  merchantReference: string;
  environment: string;
  active: boolean;
  creditEnabled: boolean;
  pixEnabled: boolean;
  recurringEnabled: boolean;
  supportsPix: boolean;
  supportsRecurring: boolean;
}

export interface PaymentMethodsSelection {
  tenantId: number | undefined;
  merchantId: number;
  creditEnabled: boolean;
  pixEnabled: boolean;
  recurringEnabled: boolean;
}

/** Visão do operador: inclui a referência do segredo, que a lista da clínica omite. */
export interface PaymentConnectionAdmin extends PaymentConnection {
  tenantId: number;
  credentialsSecretRef?: string | null;
}

export interface PaymentConnectionProvision {
  tenantId: number;
  provider: string;
  environment: string;
  merchantReference: string;
  credentialsSecretRef: string;
}

export type PaymentConnectionUpdate = Pick<PaymentConnectionProvision, 'environment' | 'merchantReference' | 'credentialsSecretRef'>;
