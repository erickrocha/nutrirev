import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { CreditCard, Loader2, Save, ShieldAlert, X } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { FormCard } from '../../components/molecules/FormCard';
import { Button } from '../../components/atoms/Button';
import { SelectField } from '../../components/atoms/SelectField';
import { TextField } from '../../components/atoms/TextField';
import {
  clearPaymentConnectionError, fetchPaymentConnectionList, provisionPaymentConnection, updatePaymentConnection,
} from '../../store/paymentConnectionSlice';
import { fetchTenants } from '../../store/tenantSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { ROLES } from '../../utils/enums';
import type { PaymentConnectionAdmin } from '../../types/clinical';

const PROVIDERS = ['rede', 'asaas', 'stripe'];
const ENVIRONMENTS = ['sandbox', 'production'];
const SECRET_REF = /^[A-Za-z0-9/_-]+$/;

interface Values { tenantId: string; provider: string; environment: string; merchantReference: string; credentialsSecretRef: string }

interface FormProps {
  existing?: PaymentConnectionAdmin;
  defaultTenantId: string;
  onSubmit: (values: Values) => void;
}

// O formulário só monta com os dados prontos: assim os valores iniciais nunca sobrescrevem o que o usuário digitou.
const PaymentConnectionForm = ({ existing, defaultTenantId, onSubmit }: FormProps) => {
  const { t } = useTranslation();
  const { saving, error } = useAppSelector((state) => state.paymentConnection);
  const tenantsList = useAppSelector((state) => state.tenant.tenantsList);
  const isNew = !existing;
  // O servidor recusa esta troca; dizer o motivo aqui explica por que o campo está travado.
  const environmentLocked = Boolean(existing?.active);

  const schema = useMemo(() => yup.object({
    tenantId: yup.string().required(t('paymentConnections.chooseTenant')),
    merchantReference: yup.string().trim().required(t('paymentConnections.merchantReference')),
    credentialsSecretRef: yup.string().trim().required(t('paymentConnections.secretRefHint')).matches(SECRET_REF, t('paymentConnections.secretRefHint')),
  }), [t]);

  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: yupResolver(schema) as never,
    defaultValues: existing
      ? { tenantId: String(existing.tenantId), provider: existing.provider, environment: existing.environment, merchantReference: existing.merchantReference || '', credentialsSecretRef: existing.credentialsSecretRef || '' }
      : { tenantId: defaultTenantId, provider: PROVIDERS[0], environment: ENVIRONMENTS[0], merchantReference: '', credentialsSecretRef: '' },
  });
  const title = isNew ? t('paymentConnections.newConnection') : t('paymentConnections.editConnection');

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <FormCard
        header={<h3 className="m-0 flex items-center gap-2 text-[1.1rem] text-[var(--accent-primary)]"><CreditCard size={18} />{title}</h3>}
        footer={
          <>
            <Button variant="outline" to={PATHS.PAYMENT_CONNECTIONS}><X size={16} />{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving}><Save size={17} />{saving ? t('common.saving') : t('common.save')}</Button>
          </>
        }
      >
        {error !== null && <div role="alert" className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{error || t('paymentConnections.saveError')}</div>}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <SelectField id="connection-tenant" label={`${t('paymentConnections.tenant')} *`} disabled={!isNew} error={errors.tenantId?.message} {...register('tenantId')}>
            <option value="" disabled>{t('paymentConnections.chooseTenant')}</option>
            {tenantsList.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </SelectField>
          <div className="flex flex-col gap-1">
            <SelectField id="connection-provider" label={`${t('paymentConnections.provider')} *`} disabled={!isNew} {...register('provider')}>
              {PROVIDERS.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
            </SelectField>
            {!isNew && <small className="text-[.75rem] text-[var(--text-body)]">{t('paymentConnections.providerLocked')}</small>}
          </div>
          <div className="flex flex-col gap-1">
            <SelectField id="connection-environment" label={`${t('paymentConnections.environment')} *`} disabled={environmentLocked} {...register('environment')}>
              {ENVIRONMENTS.map((environment) => <option key={environment} value={environment}>{environment}</option>)}
            </SelectField>
            {environmentLocked && <small className="text-[.75rem] text-[var(--text-body)]">{t('paymentConnections.environmentLocked')}</small>}
          </div>
          <TextField id="connection-reference" label={`${t('paymentConnections.merchantReference')} *`} error={errors.merchantReference?.message} {...register('merchantReference')} />
          <div className="flex flex-col gap-1 md:col-span-2">
            <TextField id="connection-secret" label={`${t('paymentConnections.credentialsSecretRef')} *`} title={t('paymentConnections.secretRefHint')} error={errors.credentialsSecretRef?.message} {...register('credentialsSecretRef')} />
            <small className="text-[.75rem] text-[var(--text-body)]">{t('paymentConnections.secretRefHint')}</small>
          </div>
        </div>
      </FormCard>
    </form>
  );
};

export const PaymentConnectionFormPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [search] = useSearchParams();
  const connectionId = id ? Number(id) : undefined;
  const editing = connectionId !== undefined;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { connections, loading, error } = useAppSelector((state) => state.paymentConnection);
  const tenantsLoading = useAppSelector((state) => state.tenant.loading);
  const isSysAdmin = user?.role === ROLES.SYS_ADMIN;
  const [loaded, setLoaded] = useState(false);

  const load = () => { Promise.all([dispatch(fetchPaymentConnectionList(undefined)), dispatch(fetchTenants())]).then(() => setLoaded(true)); };
  useEffect(() => {
    if (!isSysAdmin) return;
    dispatch(clearPaymentConnectionError());
    Promise.all([dispatch(fetchPaymentConnectionList(undefined)), dispatch(fetchTenants())]).then(() => setLoaded(true));
  }, [dispatch, isSysAdmin]);

  if (!isSysAdmin) {
    return (
      <div role="alert" className="mx-auto mt-16 flex max-w-md flex-col items-center gap-2 text-center text-[var(--text-body)]">
        <ShieldAlert size={48} />
        <h3 className="m-0 text-[var(--text-heading)]">{t('tenants.restrictedAccess')}</h3>
        <p className="m-0">{t('tenants.sysAdminOnly')}</p>
      </div>
    );
  }

  const existing = editing ? connections.find((row) => row.id === connectionId) : undefined;

  const save = async (values: Values) => {
    const merchantReference = values.merchantReference.trim();
    const credentialsSecretRef = values.credentialsSecretRef.trim();
    const saved = existing
      ? updatePaymentConnection.fulfilled.match(await dispatch(updatePaymentConnection({ id: existing.id, data: { merchantReference, credentialsSecretRef, environment: values.environment } })))
      : provisionPaymentConnection.fulfilled.match(await dispatch(provisionPaymentConnection({ tenantId: Number.parseInt(values.tenantId, 10), provider: values.provider, environment: values.environment, merchantReference, credentialsSecretRef })));
    if (saved) navigate(PATHS.PAYMENT_CONNECTIONS);
  };

  const title = editing ? t('paymentConnections.editConnection') : t('paymentConnections.newConnection');
  const notFound = editing && loaded && !loading && !existing;
  const loadFailed = loaded && !loading && error !== null && connections.length === 0;
  const ready = loaded && !loading && !tenantsLoading && !loadFailed && !notFound;

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-14">
      <Breadcrumb items={[{ label: t('paymentConnections.title'), to: PATHS.PAYMENT_CONNECTIONS }, { label: title }]} />
      <header className="mb-6 border-b border-[var(--border-color)] pb-4">
        <h2 className="m-0 text-[1.6rem] font-medium text-[var(--text-heading)]">{title}</h2>
        <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('paymentConnections.subtitle')}</p>
      </header>

      {!loaded && <p role="status" className="flex items-center gap-2 text-[var(--text-body)]"><Loader2 size={18} className="animate-spin" />{t('common.loading')}</p>}
      {loadFailed && <ErrorAlert message={error || t('paymentConnections.loadError')} onRetry={load} />}
      {notFound && <ErrorAlert message={t('paymentConnections.empty')} onRetry={load} />}
      {ready && <PaymentConnectionForm key={existing?.id ?? 'new'} existing={existing} defaultTenantId={search.get('tenantId') ?? ''} onSubmit={save} />}
    </div>
  );
};
