import { maskPhone } from './format';
export { formatAddress } from './address';
import type { Customer } from '../types/customer';

export const planIdOf = (c: Customer): number | null => c.clinicalPlanId ?? c.clinical_plan_id ?? null;
export const mealIdOf = (c: Customer): number | null => c.prepareMealId ?? c.prepare_meal_id ?? null;
export const birthOf = (c: Customer): string => c.dateOfBirth || c.dateOfbirth || c.date_of_birth || '';
export const isMobileEnabled = (c: Customer): boolean => Boolean(c.mobileEnabled || c.mobile_enabled);
export const photoOf = (c: Customer): string | null => c.photoUrl || c.photo || null;

export const phoneLabel = (phone: string | null | undefined): string => maskPhone(phone) || 'N/A';

/** "2026-03-09" → data no formato do idioma, sem deslocamento de fuso. */
export const formatBirthDate = (value: string, language: string | undefined): string => {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat(language?.startsWith('en') ? 'en-US' : 'pt-BR').format(new Date(year, month - 1, day));
};

export const matchesCustomerSearch = (c: Customer, term: string): boolean => {
  const needle = term.toLowerCase();
  return (c.name || '').toLowerCase().includes(needle) || (c.email || '').toLowerCase().includes(needle) || (c.phone || '').includes(term);
};
