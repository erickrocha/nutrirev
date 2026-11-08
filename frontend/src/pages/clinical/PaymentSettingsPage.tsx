import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Building, CheckCircle2, CreditCard, Loader2, QrCode, Repeat } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { MethodToggle } from '../../components/molecules/MethodToggle';
import { Button } from '../../components/atoms/Button';
import { fetchPaymentConnections, resetPaymentSettings, selectPaymentConnection } from '../../store/paymentSettingsSlice';
import { fetchTenants, setActiveTenant } from '../../store/tenantSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { ROLES } from '../../utils/enums';
import type { PaymentConnection } from '../../types/clinical';

interface Values { merchantId: number | null; credit: boolean; pix: boolean; recurring: boolean }

const valuesOf = (row: PaymentConnection | undefined): Values => ({
  merchantId: row?.id ?? null,
  credit: row?.creditEnabled ?? true,
  pix: row?.pixEnabled ?? false,
  recurring: row?.recurringEnabled ?? false,
});

/**
 * A adquirente da clínica e as formas de pagamento que ela oferece.
 *
 * O operador da plataforma provisiona as conexões (as credenciais ficam no cofre de
 * segredos do deploy, nunca trafegam em requisições) e esta tela escolhe entre elas.
 * Uma adquirente fica ativa por vez. O operador não tem clínica própria: escolhe a que
 * está atendendo e trabalha nas configurações dela como a equipe da clínica faria.
 */
export const PaymentSettingsPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { activeTenant, tenantsList, loading: tenantsLoading } = useAppSelector((state) => state.tenant);
  const { connections, loading, saving, error, saved } = useAppSelector((state) => state.paymentSettings);
  const isSysAdmin = user?.role === ROLES.SYS_ADMIN;
  const tenantId = isSysAdmin ? activeTenant?.id : undefined;

  const { register, watch, setValue, reset, handleSubmit } = useForm<Values>({ defaultValues: valuesOf(undefined) });
  const values = watch();

  const load = () => { dispatch(fetchPaymentConnections(tenantId)); };
  useEffect(() => {
    // O operador precisa escolher uma clínica antes: pedir sem ela é um 400.
    if (isSysAdmin && !tenantId) return;
    dispatch(fetchPaymentConnections(tenantId));
  }, [dispatch, isSysAdmin, tenantId]);
  useEffect(() => () => { dispatch(resetPaymentSettings()); }, [dispatch]);

  useEffect(() => {
    if (isSysAdmin && tenantsList.length === 0) dispatch(fetchTenants());
  }, [dispatch, isSysAdmin, tenantsList.length]);
  useEffect(() => {
    if (!isSysAdmin || activeTenant || tenantsList.length === 0) return;
    dispatch(setActiveTenant(tenantsList[0]));
  }, [activeTenant, dispatch, isSysAdmin, tenantsList]);

  useEffect(() => {
    reset(valuesOf(connections.find((row) => row.active) ?? connections[0]));
  }, [connections, reset]);

  const selected = connections.find((row) => row.id === values.merchantId);
  // Espelha as regras do servidor: não oferece um botão que a adquirente recusaria.
  const canPix = Boolean(selected?.supportsPix);
  const canRecurring = Boolean(selected?.supportsRecurring);
  const effective = { credit: values.credit, pix: values.pix && canPix, recurring: values.recurring && canRecurring && values.credit };
  const nothingEnabled = !effective.credit && !effective.pix;
  const waitingClinic = isSysAdmin && !tenantId;

  const choose = (row: PaymentConnection) => reset(valuesOf(row));
  const save = () => {
    if (!selected || nothingEnabled) return;
    dispatch(selectPaymentConnection({
      tenantId, merchantId: selected.id,
      creditEnabled: effective.credit, pixEnabled: effective.pix, recurringEnabled: effective.recurring,
    }));
  };

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: t('paymentSettings.title') }]} />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">{t('paymentSettings.title')}</h2>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('paymentSettings.subtitle')}</p>
        </div>
        {isSysAdmin && (
          <label className="flex items-center gap-2 text-[var(--text-body)]">
            <Building size={17} />
            <select
              aria-label={t('paymentSettings.supportingClinic')} value={activeTenant?.id || ''}
              onChange={(event) => {
                const tenant = tenantsList.find((item) => item.id === Number(event.target.value));
                if (tenant) dispatch(setActiveTenant(tenant));
              }}
              className="rounded-lg border border-[var(--border-color)] bg-white px-3 py-2 hover:border-[var(--accent-primary)]"
            >
              {tenantsList.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
        )}
      </header>

      {(loading || (waitingClinic && tenantsLoading)) && (
        <p role="status" className="flex items-center gap-2 text-[var(--text-body)]"><Loader2 size={18} className="animate-spin" />{t('common.loading')}</p>
      )}
      {error !== null && !loading && <ErrorAlert message={error || (connections.length ? t('paymentSettings.saveError') : t('paymentSettings.loadError'))} onRetry={connections.length ? undefined : load} />}
      {saved && !loading && (
        <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-700"><CheckCircle2 size={20} />{t('paymentSettings.saved')}</div>
      )}

      {!loading && waitingClinic && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800"><AlertCircle size={20} />{t('paymentSettings.chooseClinic')}</div>
      )}
      {!loading && !waitingClinic && connections.length === 0 && error === null && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800"><AlertCircle size={20} />{t('paymentSettings.noConnections')}</div>
      )}

      {!loading && !waitingClinic && connections.length > 0 && (
        <form noValidate onSubmit={handleSubmit(save)}>
          <h3 className="mb-3 mt-0 text-[1rem] text-[var(--text-heading)]">{t('paymentSettings.acquirer')}</h3>
          <div role="radiogroup" aria-label={t('paymentSettings.acquirer')} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {connections.map((row) => (
              <button
                key={row.id} type="button" role="radio" aria-checked={values.merchantId === row.id} disabled={saving} onClick={() => choose(row)}
                className={`flex flex-col items-start gap-1 rounded-xl border-2 bg-white p-4 text-left hover:border-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-60 ${values.merchantId === row.id ? 'border-[var(--accent-primary)] bg-blue-50' : 'border-[var(--border-color)]'}`}
              >
                <span className="font-semibold text-[var(--text-heading)]">{row.provider}</span>
                <span className="text-[.8rem] text-[var(--text-body)]">{row.merchantReference}</span>
                <span className="text-[.8rem] text-[var(--text-body)]">{row.environment}</span>
                {row.active && <span className="rounded-full bg-emerald-100 px-2 py-[2px] text-[.72rem] font-semibold text-emerald-700">{t('paymentSettings.live')}</span>}
              </button>
            ))}
          </div>

          <h3 className="mb-3 mt-0 text-[1rem] text-[var(--text-heading)]">{t('paymentSettings.methods')}</h3>
          <div className="mb-3 flex flex-col gap-3">
            <MethodToggle icon={<CreditCard size={18} />} label={t('paymentSettings.credit')} hint={t('paymentSettings.creditHint')} disabled={saving} {...register('credit')} />
            <MethodToggle
              icon={<QrCode size={18} />} label={t('paymentSettings.pix')} hint={canPix ? t('paymentSettings.pixHint') : t('paymentSettings.pixUnsupported')}
              disabled={saving || !canPix} checked={effective.pix} onChange={(event) => setValue('pix', event.target.checked)}
            />
            <MethodToggle
              icon={<Repeat size={18} />} label={t('paymentSettings.recurring')} hint={canRecurring ? t('paymentSettings.recurringHint') : t('paymentSettings.recurringUnsupported')}
              disabled={saving || !canRecurring || !values.credit} checked={effective.recurring} onChange={(event) => setValue('recurring', event.target.checked)}
            />
          </div>
          {nothingEnabled && <p role="alert" className="mb-3 mt-0 text-[.8rem] text-red-700">{t('paymentSettings.needOneMethod')}</p>}

          <div className="flex justify-end border-t border-[var(--border-color)] pt-4">
            <Button type="submit" disabled={saving || nothingEnabled || !selected}>{saving ? t('common.saving') : t('common.save')}</Button>
          </div>
        </form>
      )}
    </div>
  );
};
