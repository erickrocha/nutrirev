import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  QrCode,
  Calendar,
  Filter,
  RotateCcw,
  RefreshCw,
  Receipt,
  CheckCircle2,
} from 'lucide-react';
import type {
  TenantSubscriptionPaymentItem,
  TenantSubscriptionPaymentsFilter,
} from '../../types/tenantSubscription';
import { formatLocalDate } from '../../utils/date';
import { Button } from '../atoms/Button';

interface Props {
  payments: TenantSubscriptionPaymentItem[];
  loading: boolean;
  onFilter: (filter: TenantSubscriptionPaymentsFilter) => void;
  showTenantColumn?: boolean;
}

export const TenantSubscriptionPaymentHistoryTable = ({
  payments = [],
  loading,
  onFilter,
  showTenantColumn = false,
}: Props) => {
  const { t, i18n } = useTranslation();
  const [method, setMethod] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handleApplyFilter = () => {
    onFilter({
      paymentMethod: method === 'all' ? undefined : method,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  const handleClearFilter = () => {
    setMethod('all');
    setStartDate('');
    setEndDate('');
    onFilter({});
  };

  const safePayments = payments ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 text-xs">
        {/* Method Filter */}
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-[var(--text-heading)]">
            {t('tenantSubscription.filterMethod', 'Forma de Pagamento')}
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-alt)] px-3 py-2 text-xs text-[var(--text-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          >
            <option value="all">{t('tenantSubscription.filterAllMethods', 'Todas as formas')}</option>
            <option value="card">{t('tenantSubscription.filterCard', 'Cartão de Crédito')}</option>
            <option value="pix">PIX</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-[var(--text-heading)]">
            {t('tenantSubscription.filterStartDate', 'Data Inicial')}
          </label>
          <div className="relative flex items-center">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-alt)] px-3 py-2 text-xs text-[var(--text-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
          </div>
        </div>

        {/* End Date */}
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-[var(--text-heading)]">
            {t('tenantSubscription.filterEndDate', 'Data Final')}
          </label>
          <div className="relative flex items-center">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-alt)] px-3 py-2 text-xs text-[var(--text-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            onClick={handleApplyFilter}
            className="text-xs py-2 px-3"
          >
            <Filter size={14} className="mr-1.5" />
            {t('common.filter', 'Filtrar')}
          </Button>

          {(method !== 'all' || startDate || endDate) && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleClearFilter}
              className="text-xs py-2 px-3"
            >
              <RotateCcw size={14} className="mr-1.5" />
              {t('common.clear', 'Limpar')}
            </Button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-alt)] shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--text-body)]">
            <RefreshCw size={24} className="animate-spin text-[var(--accent-primary)]" />
            <p className="mt-2 text-sm">{t('common.loading', 'Carregando pagamentos...')}</p>
          </div>
        ) : safePayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--text-body)]">
            <Receipt size={36} className="text-[var(--border-color)]" />
            <p className="mt-3 text-sm font-semibold text-[var(--text-heading)]">
              {t('tenantSubscription.noPayments', 'Nenhum pagamento registrado')}
            </p>
            <p className="text-xs text-[var(--text-body)]">
              {t(
                'tenantSubscription.noPaymentsSubtitle',
                'Os pagamentos efetuados aparecerão listados aqui.'
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-body)]">
                  {showTenantColumn && (
                    <th className="px-4 py-3 font-semibold">{t('tenantSubscription.tenant', 'Clínica')}</th>
                  )}
                  <th className="px-4 py-3 font-semibold">{t('tenantSubscription.plan', 'Plano')}</th>
                  <th className="px-4 py-3 font-semibold">{t('tenantSubscription.method', 'Forma')}</th>
                  <th className="px-4 py-3 font-semibold">{t('tenantSubscription.amount', 'Valor')}</th>
                  <th className="px-4 py-3 font-semibold">{t('tenantSubscription.date', 'Data')}</th>
                  <th className="px-4 py-3 font-semibold">{t('tenantSubscription.status', 'Status')}</th>
                  <th className="px-4 py-3 font-semibold">{t('tenantSubscription.transactionId', 'ID / Referência')}</th>
                </tr>
              </thead>
              <tbody>
                {safePayments.map((p) => {
                  const isPix = p.paymentMethod.toLowerCase() === 'pix';
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[var(--border-color)] transition-colors hover:bg-[var(--bg-primary)]/50 last:border-b-0"
                    >
                      {showTenantColumn && (
                        <td className="px-4 py-3 font-medium text-[var(--text-heading)]">
                          {p.tenantName || `#${p.tenantId}`}
                        </td>
                      )}
                      <td className="px-4 py-3 font-medium text-[var(--text-heading)]">
                        {p.planName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--bg-primary)] px-2 py-1 font-semibold text-[var(--text-heading)]">
                          {isPix ? (
                            <QrCode size={13} className="text-emerald-600" />
                          ) : (
                            <CreditCard size={13} className="text-blue-600" />
                          )}
                          <span>{isPix ? 'PIX' : t('tenantSubscription.creditCard', 'Cartão')}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--text-heading)]">
                        {p.formattedAmount}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-body)]">
                        <div className="flex items-center gap-1">
                          <Calendar size={13} />
                          <span>{formatLocalDate(p.paidAt?.slice(0, 10), i18n?.language ?? 'pt')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 size={12} />
                          <span>{t('tenantSubscription.paid', 'Pago')}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--text-body)]">
                        {p.paymentIntentId || p.uuid.slice(0, 8)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
