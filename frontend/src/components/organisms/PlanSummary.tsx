import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BADGE, CARD, HEADING } from '../landing/styles';
import { formatPrice, type Lang } from '../../utils/format';
import type { PublicPlan } from '../../types/planOrder';

export const PlanSummary = ({ plan, lang }: { plan: PublicPlan; lang: Lang }) => {
  const { t } = useTranslation();
  const features = [
    t('site.plans.users', { count: plan.availableUsers }),
    t('site.plans.aiQuota', { count: plan.dailyAiQuota }),
    ...(plan.tiers.length > 0 ? [t('site.plans.tiers')] : []),
  ];
  return (
    <aside className={`${CARD} gap-2`}>
      <p className={`${BADGE} m-0 self-start bg-[var(--badge-accent-bg)] text-[var(--text-heading)]`}>{t('order.yourPlan')}</p>
      <h2 className={`${HEADING} m-0 text-[1.1rem]`}>{plan.name}</h2>
      <p className={`${HEADING} m-0 mt-[18px] flex items-baseline gap-1 text-[2.9rem] font-medium leading-none`}>
        {formatPrice(plan.priceInCents, lang)}
        <span className="text-[.95rem] font-normal text-[var(--text-body)]">
          {plan.periodDays === 30 ? t('site.plans.period_month') : t('site.plans.period_days', { count: plan.periodDays })}
        </span>
      </p>
      <ul className="m-0 mt-[22px] grid list-none gap-[11px] p-0 text-[.94rem]">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-[10px]"><CheckCircle2 size={17} className="mt-[2px] shrink-0 text-[var(--accent-primary)]" /> {feature}</li>
        ))}
      </ul>
      <p className="m-0 mt-4 text-[.85rem] text-[var(--text-body)]">{t('order.manualNote')}</p>
    </aside>
  );
};
