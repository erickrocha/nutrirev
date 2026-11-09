import { Check, CalendarDays, Layers, Sparkles, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/format';
import type { BusinessPlan } from '../../types/businessPlan';

interface Props {
  plan: BusinessPlan;
  selected: boolean;
  lang: 'pt' | 'en';
  onSelect: (id: number) => void;
}

// Faixa ilimitada (upToUsers = 0) vai por último.
const limitOf = (upToUsers: number): number => (upToUsers === 0 ? Number.POSITIVE_INFINITY : upToUsers);

export const PlanChoiceCard = ({ plan, selected, lang, onSelect }: Props) => {
  const { t } = useTranslation();
  const tiers = [...(plan.tiers ?? [])].sort((a, b) => limitOf(a.upToUsers) - limitOf(b.upToUsers));
  const quota = plan.dailyAiQuota ?? 4;

  return (
    <button
      type="button" role="radio" aria-checked={selected} onClick={() => onSelect(plan.id)}
      className={`flex flex-col gap-3 rounded-2xl border-2 bg-white p-5 text-left hover:border-[var(--accent-primary)] ${selected ? 'border-[var(--accent-primary)] bg-blue-50' : 'border-[var(--border-color)]'}`}
    >
      <span className="flex items-start justify-between gap-2">
        <span>
          <h3 className="m-0 text-[1.05rem] text-[var(--text-heading)]">{plan.name}</h3>
          <span className="text-[.75rem] text-[var(--text-body)]">{selected ? t('tenants.planSelected') : t('businessPlans.plan')}</span>
        </span>
        <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${selected ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white' : 'border-slate-300'}`}>{selected && <Check size={16} />}</span>
      </span>
      <span>
        <span className="text-[1.4rem] font-semibold text-[var(--text-heading)]">{formatCurrency(plan.priceInCents, lang)}</span>
        <span className="ml-1 text-[.8rem] text-[var(--text-body)]">/ {t('businessPlans.days', { count: plan.periodDays })}</span>
      </span>
      <span className="flex flex-col gap-1 text-[.82rem] text-[var(--text-body)]">
        <span className="flex items-center gap-2"><Users size={15} />{t('tenants.includedUsers')}: <strong>{plan.availableUsers}</strong></span>
        <span className="flex items-center gap-2"><Sparkles size={15} />{t('tenants.aiQuotaPerDay')}: <strong>{quota}</strong> ({t('tenants.aiQuotaDetails', { count: quota })})</span>
        <span className="flex items-center gap-2"><CalendarDays size={15} />{t('businessPlans.period')}: <strong>{t('tenants.billingCycleDays', { count: plan.periodDays })}</strong></span>
      </span>
      <span className="rounded-lg border border-slate-100 bg-slate-50 p-3">
        <span className="mb-1 flex items-center gap-1 text-[.75rem] font-semibold text-[var(--text-heading)]"><Layers size={13} />{t('tenants.planTiersTitle')}</span>
        {tiers.length > 0 ? (
          <span className="flex flex-col gap-1 text-[.78rem]">
            {tiers.map((tier, index) => (
              <span key={tier.id ?? index} className="flex justify-between gap-2">
                <span>{tier.upToUsers > 0 ? t('tenants.upToUsers', { count: tier.upToUsers }) : t('tenants.unlimitedTier', { count: tiers[index - 1]?.upToUsers || plan.availableUsers })}</span>
                <span className="font-semibold">{formatCurrency(tier.pricePerUserInCents, lang)} {t('tenants.perUser')}</span>
              </span>
            ))}
          </span>
        ) : <span className="text-[.78rem]">{t('tenants.fixedPricing')}</span>}
      </span>
    </button>
  );
};
