import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Filter, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '../../components/atoms/Button';
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

  return (
    <div className="business-plan-management-page">
      <header className="management-header">
        <div><h2 className="section-title">{t('planOrders.title')}</h2><p className="section-subtitle">{t('planOrders.subtitle')}</p></div>
        <div className="header-action-buttons">
          <Button variant="accent" onClick={() => dispatch(fetchPlanOrders())} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin-icon' : ''} /> {t('common.refresh')}
          </Button>
        </div>
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

      {error && <div className="dashboard-error-state" role="alert"><span><AlertCircle size={18} /> {error}</span></div>}

      <section className="table-card">
        {loading ? (
          <div className="table-loading-state"><RefreshCw size={24} className="spin-icon" /><p>{t('common.loading')}</p></div>
        ) : orders.length === 0 ? (
          <div className="table-empty-state"><Inbox size={34} /><p>{t('planOrders.empty')}</p></div>
        ) : (
          <div className="responsive-table-wrap">
            <table className="management-table">
              <thead><tr>
                <th>{t('planOrders.date')}</th><th>{t('planOrders.customer')}</th><th>{t('planOrders.plan')}</th>
                <th>{t('planOrders.status')}</th><th>{t('common.actions', 'Actions')}</th>
              </tr></thead>
              <tbody>{orders.map((order) => (
                <tr key={order.uuid}>
                  <td>{date(order.createdAt)}</td>
                  <td><strong>{order.name}</strong><small className="table-secondary-text">{maskTaxId(order.taxId)} · {order.email}</small></td>
                  <td>{order.planName}<small className="table-secondary-text">{formatPrice(order.priceInCents, lang)}</small></td>
                  <td>{t(`planOrders.statuses.${order.status}`)}</td>
                  <td><Button to={PATHS.PLAN_ORDER_DETAIL.replace(':uuid', order.uuid)}>{t('planOrders.open')}</Button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
