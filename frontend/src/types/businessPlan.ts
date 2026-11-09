export interface BusinessPlanTier {
  id?: number | null;
  upToUsers: number;
  pricePerUserInCents: number;
}

export interface BusinessPlan {
  id: number;
  uuid?: string;
  name: string;
  priceInCents: number;
  availableUsers: number;
  periodDays: number;
  dailyAiQuota?: number | null;
  paymentDate: string;
  tiers?: BusinessPlanTier[] | null;
}

export type BusinessPlanPayload = Omit<BusinessPlan, 'id' | 'uuid' | 'tiers'> & { tiers: BusinessPlanTier[] | null };
