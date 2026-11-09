import { Fragment, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, CheckCircle2, ChevronDown, ChevronRight, Edit2, FileText, History, Plus, RefreshCw, User } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ChargeList } from '../../components/molecules/ChargeList';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { ReversalAlert } from '../../components/molecules/ReversalAlert';
import { SearchBox } from '../../components/molecules/SearchBox';
import { Button } from '../../components/atoms/Button';
import { fetchCharges, loadPaymentDates } from '../../store/paymentDateSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS, editPath, newPath } from '../../router/routeConfig';
import { formatIsoDate } from '../../utils/date';
import type { PaymentDate } from '../../types/clinical';

const STATUS_KEYS: Record<string, string> = { active: 'statusActive', cancelled: 'statusCancelled', completed: 'statusCompleted' };

export const PaymentDateListPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { items, plans, customers, reversals, chargesByCustomer, loading, error } = useAppSelector((state) => state.paymentDate);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = () => { dispatch(loadPaymentDates()); };
  useEffect(() => { dispatch(loadPaymentDates()); }, [dispatch]);

  const customerName = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);
  const planName = useMemo(() => new Map(plans.map((p) => [p.id, p.name])), [plans]);
  const term = search.toLowerCase();
  const visible = items.filter((item) => (
    (customerName.get(item.customerId as number) || '').toLowerCase().includes(term)
    || (planName.get(item.clinicalPlanId as number) || '').toLowerCase().includes(term)
    || (item.firstDueDate || '').includes(term)
  ));

  // Cobranças só são buscadas ao abrir a linha, e uma vez por cliente.
  const toggleCharges = (item: PaymentDate) => {
    if (expandedId === item.id) { setExpandedId(null); return; }
    setExpandedId(item.id);
    if (item.customerId && !chargesByCustomer[item.customerId]) dispatch(fetchCharges(item.customerId));
  };

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: t('paymentDates.title') }]} />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">{t('paymentDates.title')}</h2>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('paymentDates.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading} title={t('common.refreshList')}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{t('common.refresh')}
          </Button>
          <Button to={newPath(PATHS.PAYMENT_DATES)}><Plus size={18} />{t('paymentDates.newPaymentDate')}</Button>
        </div>
      </header>

      <ReversalAlert reversals={reversals} />
      <SearchBox value={search} onChange={setSearch} placeholder={t('paymentDates.searchPlaceholder')} />
      {error && <ErrorAlert message={error} onRetry={load} />}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)] bg-white">
        {loading && items.length === 0 ? (
          <p role="status" className="flex items-center justify-center gap-2 p-10 text-[var(--text-body)]"><RefreshCw size={22} className="animate-spin" />{t('paymentDates.loadingRecords')}</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center text-[var(--text-body)]">
            <Calendar size={36} />
            <p className="m-0">{t('paymentDates.emptyStateTitle')}</p>
            <Button to={newPath(PATHS.PAYMENT_DATES)}><Plus size={16} />{t('paymentDates.emptyStateBtn')}</Button>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-slate-50 text-[.8rem] text-[var(--text-body)]">
                {['common.id', 'paymentDates.client', 'paymentDates.clinicalPlan', 'paymentDates.firstDueDate', 'paymentDates.nextDueDate', 'paymentDates.subscriptionStatus', 'common.status'].map((key) => (
                  <th key={key} className="whitespace-nowrap px-4 py-3">{t(key)}</th>
                ))}
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <Fragment key={item.id}>
                  <tr className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="w-16 px-4 py-3 font-semibold text-slate-500">#{item.id}</td>
                    <td className="px-4 py-3"><span className="flex items-center gap-2 font-medium"><User size={16} className="text-[var(--accent-primary)]" />{customerName.get(item.customerId as number) || `${t('paymentDates.client')} #${item.customerId}`}</span></td>
                    <td className="px-4 py-3"><span className="flex items-center gap-2"><FileText size={16} className="text-blue-500" />{planName.get(item.clinicalPlanId as number) || `${t('paymentDates.clinicalPlan')} #${item.clinicalPlanId}`}</span></td>
                    <td className="px-4 py-3"><span className="flex items-center gap-[6px] font-semibold"><Calendar size={14} className="text-emerald-500" />{formatIsoDate(item.firstDueDate)}</span></td>
                    <td className="px-4 py-3 font-semibold text-slate-500">{formatIsoDate(item.nextDueDate)}</td>
                    <td className="px-4 py-3 text-[.82rem] font-semibold">{item.status && STATUS_KEYS[item.status] ? t(`paymentDates.${STATUS_KEYS[item.status]}`) : ''}</td>
                    <td className="px-4 py-3">
                      {item.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-[10px] py-[3px] text-[.78rem] font-semibold text-emerald-600"><CheckCircle2 size={12} />{t('common.active')}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-50 px-[10px] py-[3px] text-[.78rem] font-semibold text-slate-500"><History size={12} />{t('paymentDates.history')}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button variant="outline" className="mr-[6px]" aria-expanded={expandedId === item.id} onClick={() => toggleCharges(item)} title={t('paymentDates.charges')}>
                        {expandedId === item.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}{t('paymentDates.charges')}
                      </Button>
                      <Button variant="outline" to={editPath(PATHS.PAYMENT_DATES, item.id)} title={t('paymentDates.editRecord')}><Edit2 size={16} />{t('common.edit')}</Button>
                    </td>
                  </tr>
                  {expandedId === item.id && (
                    <tr>
                      <td colSpan={8} className="bg-slate-400/5 px-5 py-3"><ChargeList charges={chargesByCustomer[item.customerId as number] ?? []} /></td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
