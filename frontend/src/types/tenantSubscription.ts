export interface TenantSubscriptionStatus {
  status: 'ok' | 'warning' | 'blocked';
  daysOverdue: number;
  paymentDate: string;
  gracePeriodDays: number;
  planName: string;
  amountCents: number;
  formattedAmount: string;
  businessPlanId: number;
  publishableKey?: string | null;
}

export interface TenantSubscriptionPixResponse {
  paymentIntentId: string;
  payload: string;
  encodedImage?: string | null;
  expiresAt?: string | null;
  amountCents: number;
}

export interface TenantSubscriptionIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  publishableKey: string;
  amountCents: number;
  formattedAmount: string;
}

export interface PayTenantSubscriptionCardPayload {
  cardholderName: string;
  cardNumber: string;
  expirationMonth: number;
  expirationYear: number;
  securityCode: string;
}

export interface TenantSubscriptionSuccess {
  success: boolean;
  message: string;
  newPaymentDate: string;
}

export interface VerifyPaymentIntentPayload {
  paymentIntentId: string;
}
