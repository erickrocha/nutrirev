import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, FileText, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { Button } from '../../components/atoms/Button';
import { deleteBusinessPlan, fetchBusinessPlans } from '../../store/businessPlanSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { formatLocalDate } from '../../utils/date';
import { formatCurrency } from '../../utils/format';
import type { BusinessPlan } from '../../types/businessPlan';

export const BusinessPlanListPage = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'pt';
  const dispatch = useAppDispatch();
  const { plans, loading, saving, error } = useAppSelector((state) => state.businessPlan);
  const [deleting, setDeleting] = useState<BusinessPlan | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);

  const load = () => { dispatch(fetchBusinessPlans()); };
  useEffect(() => { dispatch(fetchBusinessPlans()); }, [dispatch]);

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await dispatch(deleteBusinessPlan(deleting.id));
    setDeleteFailed(!deleteBusinessPlan.fulfilled.match(result));
    if (deleteBusinessPlan.fulfilled.match(result)) setDeleting(null);
  };

  const message = error === null ? null : error || t(deleteFailed ? 'businessPlans.deleteError' : 'businessPlans.loadError');

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: t('businessPlans.title') }]} />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">{t('businessPlans.title')}</h2>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('businessPlans.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{t('common.refresh')}</Button>
          <Button to={PATHS.BUSINESS_PLAN_NEW}><Plus size={17} />{t('businessPlans.newPlan')}</Button>
        </div>
      </header>

      {message !== null && <ErrorAlert message={message} onRetry={load} />}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)] bg-white">
        {loading && plans.length === 0 ? (
          <p role="status" className="flex items-center justify-center gap-2 p-10 text-[var(--text-body)]"><RefreshCw size={22} className="animate-spin" />{t('common.loading')}</p>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center text-[var(--text-body)]">
            <FileText size={34} />
            <p className="m-0">{t('businessPlans.empty')}</p>
            <Button to={PATHS.BUSINESS_PLAN_NEW}><Plus size={16} />{t('businessPlans.newPlan')}</Button>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-slate-50 text-[.8rem] text-[var(--text-body)]">
                {['businessPlans.plan', 'businessPlans.price', 'businessPlans.users', 'businessPlans.aiQuota', 'businessPlans.period', 'businessPlans.paymentDate'].map((key) => <th key={key} className="px-4 py-3">{t(key)}</th>)}
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  <td className="px-4 py-3"><strong>{plan.name}</strong><small className="block text-slate-500">UUID: {plan.uuid}</small></td>
                  <td className="px-4 py-3">
                    {formatCurrency(plan.priceInCents, lang)}
                    {Array.isArray(plan.tiers) && plan.tiers.length > 0 && (
                      <small className="block text-slate-500">{`+ ${t('businessPlans.tiered')} (${t('businessPlans.tiersCount', { count: plan.tiers.length })})`}</small>
                    )}
                  </td>
                  <td className="px-4 py-3">{plan.availableUsers}</td>
                  <td className="px-4 py-3"><strong>{plan.dailyAiQuota ?? 4}</strong> <small className="text-slate-500">{t('businessPlans.dailyAiQuota')}</small></td>
                  <td className="px-4 py-3">{t('businessPlans.days', { count: plan.periodDays })}</td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1"><CalendarDays size={14} />{formatLocalDate(plan.paymentDate, i18n.language)}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" to={PATHS.BUSINESS_PLAN_EDIT.replace(':id', String(plan.id))} title={t('common.edit')} aria-label={t('common.edit')}><Pencil size={16} /></Button>
                      <Button variant="outline" onClick={() => { setDeleteFailed(false); setDeleting(plan); }} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 size={16} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleting && (
        <ConfirmDialog
          title={t('common.delete')} message={t('businessPlans.deleteConfirm', { name: deleting.name })} confirmLabel={t('common.delete')}
          busy={saving} onConfirm={confirmDelete} onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
};
