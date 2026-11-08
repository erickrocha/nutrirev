import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '../../components/atoms/Button';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { FilterableMultiSelect } from '../../components/common/FilterableMultiSelect';
import { fetchPlanOrders } from '../../store/planOrderSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { formatPrice, maskTaxId, type Lang } from '../../utils/format';

const STATUSES = ['pending', 'converted', 'cancelled'];

export const PlanOrderManagement = () => {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language?.startsWith('en') ? 'en' : 'pt';
  const dispatch = useAppDispatch();
  const { orders: allOrders, loading, error } = useAppSelector((state) => state.planOrder);
  const [statuses, setStatuses] = useState<string[]>(['pending']);

  useEffect(() => { dispatch(fetchPlanOrders()); }, [dispatch]);

  const orders = statuses.length ? allOrders.filter((order) => statuses.includes(order.status)) : allOrders;
  const statusOptions = STATUSES.map((id) => ({ id, name: t(`planOrders.statuses.${id}`) }));
  const date = (value: string) => new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR').format(new Date(`${value}Z`));

  const load = () => { dispatch(fetchPlanOrders()); };
  const cell = 'px-4 py-3';

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: t('planOrders.title') }]} />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">{t('planOrders.title')}</h2>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('planOrders.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> {t('common.refresh')}
        </Button>
      </header>

      <div className="mb-4 max-w-80">
        <FilterableMultiSelect
          label={t('planOrders.status')}
          icon={Filter}
          iconColor="var(--accent-primary)"
          options={statusOptions}
          selectedIds={statuses}
          onChange={setStatuses}
          placeholder={t('planOrders.all')}
          showSearch={false}
        />
      </div>

      {error && <ErrorAlert message={error} onRetry={load} />}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)] bg-white">
        {loading ? (
          <p role="status" className="flex items-center justify-center gap-2 p-10 text-[var(--text-body)]"><RefreshCw size={22} className="animate-spin" />{t('common.loading')}</p>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center text-[var(--text-body)]"><Inbox size={34} /><p className="m-0">{t('planOrders.empty')}</p></div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-slate-50 text-[.8rem] text-[var(--text-body)]">
                {['planOrders.date', 'planOrders.customer', 'planOrders.plan', 'planOrders.status'].map((key) => <th key={key} className={cell}>{t(key)}</th>)}
                <th className={`${cell} text-right`}>{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.uuid} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  <td className={cell}>{date(order.createdAt)}</td>
                  <td className={cell}><strong>{order.name}</strong><small className="block text-slate-500">{maskTaxId(order.taxId)} · {order.email}</small></td>
                  <td className={cell}>{order.planName}<small className="block text-slate-500">{formatPrice(order.priceInCents, lang)}</small></td>
                  <td className={cell}>{t(`planOrders.statuses.${order.status}`)}</td>
                  <td className={`${cell} text-right`}><Button to={PATHS.PLAN_ORDER_DETAIL.replace(':uuid', order.uuid)}>{t('planOrders.open')}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
