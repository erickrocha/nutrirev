import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, DollarSign, Edit2, FileText, Plus, RefreshCw } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { SearchBox } from '../../components/molecules/SearchBox';
import { Button } from '../../components/atoms/Button';
import { fetchClinicalPlans } from '../../store/clinicalPlanSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS, editPath, newPath } from '../../router/routeConfig';
import { centsToDisplay } from '../../utils/currency';

export const ClinicalPlanListPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.clinicalPlan);
  const [search, setSearch] = useState('');

  const load = () => { dispatch(fetchClinicalPlans()); };
  useEffect(() => { dispatch(fetchClinicalPlans()); }, [dispatch]);

  const visible = items.filter((item) => (item.name || '').toLowerCase().includes(search.toLowerCase()));
  const title = t('clinical.clinicalPlan.title');

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: title }]} />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">{title}</h2>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('clinical.clinicalPlan.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading} title={t('common.refreshList')}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{t('common.refresh')}
          </Button>
          <Button to={newPath(PATHS.CLINICAL_PLANS)}><Plus size={18} />{t('clinicalPlans.newPlan')}</Button>
        </div>
      </header>

      <SearchBox value={search} onChange={setSearch} placeholder={t('common.searchByName')} />
      {error && <ErrorAlert message={error} onRetry={load} />}

      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-white">
        {loading && items.length === 0 ? (
          <p role="status" className="flex items-center justify-center gap-2 p-10 text-[var(--text-body)]"><RefreshCw size={22} className="animate-spin" />{t('entities.loadingRecords')}</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center text-[var(--text-body)]">
            <FileText size={36} />
            <p className="m-0">{t('clinicalPlans.emptyStateTitle')}</p>
            <Button to={newPath(PATHS.CLINICAL_PLANS)}><Plus size={16} />{t('clinicalPlans.emptyStateBtn')}</Button>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-slate-50 text-[.8rem] text-[var(--text-body)]">
                <th className="px-4 py-3">{t('common.id')}</th>
                <th className="px-4 py-3">{t('clinicalPlans.planName')}</th>
                <th className="px-4 py-3">{t('clinicalPlans.price')}</th>
                <th className="px-4 py-3">{t('clinicalPlans.renewPeriod')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const price = centsToDisplay(item.priceInCents);
                return (
                  <tr key={item.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                    <td className="w-20 px-4 py-3 font-semibold text-slate-500">#{item.id}</td>
                    <td className="px-4 py-3"><span className="flex items-center gap-[10px] font-medium"><FileText size={16} className="text-[var(--accent-primary)]" />{item.name}</span></td>
                    <td className="px-4 py-3"><span className="flex items-center gap-[6px]"><DollarSign size={14} className="text-emerald-500" />{price ? `R$ ${price}` : '—'}</span></td>
                    <td className="px-4 py-3"><span className="flex items-center gap-[6px]"><Calendar size={14} className="text-blue-500" />{item.renewPeriodDays ? t('clinicalPlans.days', { count: item.renewPeriodDays }) : '—'}</span></td>
                    <td className="px-4 py-3 text-right"><Button variant="outline" to={editPath(PATHS.CLINICAL_PLANS, item.id)} title={t('entities.editRecord')}><Edit2 size={16} />{t('common.edit')}</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
