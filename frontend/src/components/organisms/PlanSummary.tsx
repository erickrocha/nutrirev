import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatPrice, type Lang } from '../../utils/format';
import type { PublicPlan } from '../../types/planOrder';

export const PlanSummary = ({ plan, lang }: { plan: PublicPlan; lang: Lang }) => {
  const { t } = useTranslation();
  return (
    <aside className="lp-card flex flex-col gap-2">
      <p className="lp-badge">{t('order.yourPlan')}</p>
      <h2 className="m-0 text-[1.1rem]">{plan.name}</h2>
      <p className="lp-plan-price">
        {formatPrice(plan.priceInCents, lang)}
        <span className="lp-plan-period">
          {plan.periodDays === 30 ? t('site.plans.period_month') : t('site.plans.period_days', { count: plan.periodDays })}
        </span>
      </p>
      <ul className="lp-check-list">
        <li><CheckCircle2 size={17} /> {t('site.plans.users', { count: plan.availableUsers })}</li>
        <li><CheckCircle2 size={17} /> {t('site.plans.aiQuota', { count: plan.dailyAiQuota })}</li>
        {plan.tiers.length > 0 && <li><CheckCircle2 size={17} /> {t('site.plans.tiers')}</li>}
      </ul>
      <p className="mt-4 text-[.85rem] text-[var(--text-body)]">{t('order.manualNote')}</p>
    </aside>
  );
};
