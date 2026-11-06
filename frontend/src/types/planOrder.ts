export type PlanOrderStatus = 'pending' | 'converted' | 'cancelled';

export interface PlanTier {
  upToUsers: number;
  pricePerUserInCents: number;
}

export interface PublicPlan {
  uuid: string;
  name: string;
  priceInCents: number;
  availableUsers: number;
  periodDays: number;
  dailyAiQuota: number;
  tiers: PlanTier[];
}

export interface PlanOrder {
  uuid: string;
  planName: string;
  priceInCents: number;
  status: PlanOrderStatus;
  taxId: string;
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  locality: string;
  administrativeArea: string;
  postalCode: string;
  tenantId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanOrderPayload {
  planUuid: string;
  taxId: string;
  name: string;
  email: string;
  phone: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  postalCode: string;
  language: 'pt' | 'en';
  website?: string;
}

export interface Province {
  acronym: string;
  name: string;
}
