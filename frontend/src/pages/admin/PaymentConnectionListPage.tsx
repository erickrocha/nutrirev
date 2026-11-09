import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, CreditCard, Pencil, Plus, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { Button } from '../../components/atoms/Button';
import { disablePaymentConnection, fetchPaymentConnectionList, removePaymentConnection } from '../../store/paymentConnectionSlice';
import { fetchTenants } from '../../store/tenantSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS, editPath, newPath } from '../../router/routeConfig';
import { ROLES } from '../../utils/enums';
import type { PaymentConnectionAdmin } from '../../types/clinical';

type Action = { kind: 'disable' | 'delete'; row: PaymentConnectionAdmin };

/**
 * Todas as conexões de adquirente, de todas as clínicas.
 *
 * O operador provisiona e corrige; a clínica continua escolhendo, na própria tela, qual fica ativa.
 */
export const PaymentConnectionListPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const tenantsList = useAppSelector((state) => state.tenant.tenantsList);
  const { connections, loading, saving, error } = useAppSelector((state) => state.paymentConnection);
  const isSysAdmin = user?.role === ROLES.SYS_ADMIN;
  const [tenantFilter, setTenantFilter] = useState('');
  const [action, setAction] = useState<Action | null>(null);
  const [actionFailed, setActionFailed] = useState<Action['kind'] | null>(null);

  const filterId = tenantFilter ? Number(tenantFilter) : undefined;
  const load = () => { dispatch(fetchPaymentConnectionList(filterId)); };
  useEffect(() => { if (isSysAdmin) dispatch(fetchPaymentConnectionList(filterId)); }, [dispatch, isSysAdmin, filterId]);
  useEffect(() => { if (isSysAdmin) dispatch(fetchTenants()); }, [dispatch, isSysAdmin]);

  if (!isSysAdmin) {
    return (
      <div role="alert" className="mx-auto mt-16 flex max-w-md flex-col items-center gap-2 text-center text-[var(--text-body)]">
        <ShieldAlert size={48} />
        <h3 className="m-0 text-[var(--text-heading)]">{t('tenants.restrictedAccess')}</h3>
        <p className="m-0">{t('tenants.sysAdminOnly')}</p>
      </div>
    );
  }

  const tenantName = (id: number) => tenantsList.find((tenant) => tenant.id === id)?.name ?? `#${id}`;
  const methods = (row: PaymentConnectionAdmin) => {
    const enabled = [row.creditEnabled && t('paymentSettings.credit'), row.pixEnabled && t('paymentSettings.pix'), row.recurringEnabled && t('paymentSettings.recurring')].filter(Boolean);
    return enabled.length > 0 ? enabled.join(' · ') : '—';
  };

  const confirm = async () => {
    if (!action) return;
    const ok = action.kind === 'disable'
      ? disablePaymentConnection.fulfilled.match(await dispatch(disablePaymentConnection(action.row.id)))
      : removePaymentConnection.fulfilled.match(await dispatch(removePaymentConnection(action.row.id)));
    setActionFailed(ok ? null : action.kind);
    if (ok) { setAction(null); load(); }
  };

  const message = error === null ? null : error || t(actionFailed === 'disable' ? 'paymentConnections.disableError' : actionFailed === 'delete' ? 'paymentConnections.deleteError' : 'paymentConnections.loadError');
  const newLink = tenantFilter ? `${newPath(PATHS.PAYMENT_CONNECTIONS)}?tenantId=${tenantFilter}` : newPath(PATHS.PAYMENT_CONNECTIONS);

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: t('paymentConnections.title') }]} />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">{t('paymentConnections.title')}</h2>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('paymentConnections.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label={t('paymentConnections.filterByTenant')} value={tenantFilter} onChange={(event) => setTenantFilter(event.target.value)}
            className="rounded-lg border border-[var(--border-color)] bg-white px-3 py-2 hover:border-[var(--accent-primary)]"
          >
            <option value="">{t('paymentConnections.allTenants')}</option>
            {tenantsList.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{t('common.refresh')}</Button>
          <Button to={newLink}><Plus size={17} />{t('paymentConnections.newConnection')}</Button>
        </div>
      </header>

      {message !== null && <ErrorAlert message={message} onRetry={load} />}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)] bg-white">
        {loading && connections.length === 0 ? (
          <p role="status" className="flex items-center justify-center gap-2 p-10 text-[var(--text-body)]"><RefreshCw size={22} className="animate-spin" />{t('common.loading')}</p>
        ) : connections.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center text-[var(--text-body)]">
            <CreditCard size={34} />
            <p className="m-0">{t('paymentConnections.empty')}</p>
            <Button to={newLink}><Plus size={16} />{t('paymentConnections.newConnection')}</Button>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-slate-50 text-[.8rem] text-[var(--text-body)]">
                {['tenant', 'provider', 'environment', 'merchantReference', 'credentialsSecretRef', 'methods'].map((key) => <th key={key} className="px-4 py-3">{t(`paymentConnections.${key}`)}</th>)}
                <th className="px-4 py-3">{t('common.status')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {connections.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  <td className="px-4 py-3">{tenantName(row.tenantId)}</td>
                  <td className="px-4 py-3"><strong>{row.provider}</strong></td>
                  <td className="px-4 py-3">{row.environment}</td>
                  <td className="px-4 py-3">{row.merchantReference}</td>
                  <td className="px-4 py-3"><small className="text-slate-500">{row.credentialsSecretRef || '—'}</small></td>
                  <td className="px-4 py-3 text-[.85rem]">{methods(row)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-[2px] text-[.75rem] font-semibold ${row.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{row.active ? t('paymentConnections.live') : t('common.inactive')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" to={editPath(PATHS.PAYMENT_CONNECTIONS, row.id)} title={t('common.edit')} aria-label={t('common.edit')}><Pencil size={16} /></Button>
                      <Button variant="outline" disabled={!row.active} onClick={() => { setActionFailed(null); setAction({ kind: 'disable', row }); }} title={t('paymentConnections.disable')} aria-label={t('paymentConnections.disable')}><Ban size={16} /></Button>
                      <Button variant="outline" onClick={() => { setActionFailed(null); setAction({ kind: 'delete', row }); }} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 size={16} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {action && (
        <ConfirmDialog
          title={action.kind === 'disable' ? t('paymentConnections.disable') : t('common.delete')}
          message={t(action.kind === 'disable' ? 'paymentConnections.disableConfirm' : 'paymentConnections.deleteConfirm', { reference: action.row.merchantReference })}
          confirmLabel={action.kind === 'disable' ? t('paymentConnections.disable') : t('common.delete')}
          busy={saving} onConfirm={confirm} onCancel={() => setAction(null)}
        />
      )}
    </div>
  );
};
