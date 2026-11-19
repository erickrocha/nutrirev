import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Receipt, RefreshCw, AlertCircle } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { Button } from '../../components/atoms/Button';
import { TenantSubscriptionPaymentHistoryTable } from '../../components/payments/TenantSubscriptionPaymentHistoryTable';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchTenantSubscriptionPayments } from '../../store/tenantSubscriptionSlice';
import type { TenantSubscriptionPaymentsFilter } from '../../types/tenantSubscription';

export const TenantSubscriptionPaymentHistoryPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { payments, paymentsLoading, error } = useAppSelector(
    (state) => state.tenantSubscription
  );

  useEffect(() => {
    dispatch(fetchTenantSubscriptionPayments());
  }, [dispatch]);

  const handleFilter = (filter: TenantSubscriptionPaymentsFilter) => {
    dispatch(fetchTenantSubscriptionPayments(filter));
  };

  const handleRefresh = () => {
    dispatch(fetchTenantSubscriptionPayments());
  };

  return (
    <div className="w-full">
      <Breadcrumb
        items={[
          { label: t('sidebar.adminDashboard', 'Dashboard'), path: '/admin/dashboard' },
          { label: t('tenantSubscription.paymentsTitle', 'Pagamentos de Assinaturas') },
        ]}
      />

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="text-[var(--accent-primary)]" size={24} />
            <h2 className="m-0 text-xl font-bold text-[var(--text-heading)]">
              {t('tenantSubscription.paymentsTitle', 'Pagamentos de Assinaturas')}
            </h2>
          </div>
          <p className="mt-1 text-xs text-[var(--text-body)]">
            {t(
              'tenantSubscription.paymentsSubtitle',
              'Histórico consolidado de pagamentos de planos efetuados pelas clínicas.'
            )}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={paymentsLoading}
          className="text-xs py-2 px-3"
        >
          <RefreshCw
            size={14}
            className={`mr-1.5 ${paymentsLoading ? 'animate-spin' : ''}`}
          />
          {t('common.refresh', 'Atualizar')}
        </Button>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <TenantSubscriptionPaymentHistoryTable
        payments={payments}
        loading={paymentsLoading}
        onFilter={handleFilter}
        showTenantColumn
      />
    </div>
  );
};
