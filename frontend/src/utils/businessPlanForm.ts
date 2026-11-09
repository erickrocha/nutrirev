import { centsToDisplay, displayToCents } from './currency';
import type { BusinessPlan, BusinessPlanPayload, BusinessPlanTier } from '../types/businessPlan';

// `tierId`, e não `id`, porque o useFieldArray reserva `id` para a chave de lista.
export interface TierValues { tierId: number | null; upToUsers: string; pricePerUser: string }

export interface BusinessPlanFormValues {
  name: string;
  price: string;
  availableUsers: string;
  periodDays: string;
  dailyAiQuota: string;
  paymentDate: string;
  tiers: TierValues[];
}

export const emptyBusinessPlanForm = (): BusinessPlanFormValues => ({
  name: '', price: '', availableUsers: '1', periodDays: '30', dailyAiQuota: '4', paymentDate: '', tiers: [],
});

export const planToForm = (plan: BusinessPlan): BusinessPlanFormValues => ({
  name: plan.name || '',
  price: centsToDisplay(plan.priceInCents),
  availableUsers: String(plan.availableUsers),
  periodDays: String(plan.periodDays),
  dailyAiQuota: String(plan.dailyAiQuota ?? 4),
  paymentDate: plan.paymentDate || '',
  tiers: (plan.tiers ?? []).map((tier) => ({
    tierId: tier.id ?? null,
    upToUsers: tier.upToUsers && tier.upToUsers > 0 ? String(tier.upToUsers) : '',
    pricePerUser: centsToDisplay(tier.pricePerUserInCents),
  })),
});

/** Faixa sem limite de usuários (campo vazio) é enviada como 0. */
export const toPlanPayload = (values: BusinessPlanFormValues): BusinessPlanPayload => {
  const tiers: BusinessPlanTier[] = values.tiers.map((tier) => ({
    ...(tier.tierId ? { id: tier.tierId } : {}),
    upToUsers: tier.upToUsers.trim() === '' ? 0 : Number(tier.upToUsers),
    pricePerUserInCents: displayToCents(tier.pricePerUser) ?? 0,
  }));
  return {
    name: values.name.trim(),
    priceInCents: displayToCents(values.price) ?? 0,
    availableUsers: Number(values.availableUsers),
    periodDays: Number(values.periodDays),
    dailyAiQuota: Number(values.dailyAiQuota),
    paymentDate: values.paymentDate,
    tiers: tiers.length > 0 ? tiers : null,
  };
};
