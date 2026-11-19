import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Copy,
  CreditCard,
  KeyRound,
  Loader2,
  QrCode,
  Repeat,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { MethodToggle } from '../../components/molecules/MethodToggle';
import { Button } from '../../components/atoms/Button';
import { fetchPaymentSettings, resetPaymentSettings, savePaymentSettings } from '../../store/paymentSettingsSlice';
import { fetchTenants, setActiveTenant } from '../../store/tenantSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { ROLES } from '../../utils/enums';

interface FormValues {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  creditEnabled: boolean;
  pixEnabled: boolean;
  recurringEnabled: boolean;
}

export const PaymentSettingsPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { activeTenant, tenantsList, loading: tenantsLoading } = useAppSelector((state) => state.tenant);
  const { settings, loading, saving, error, saved } = useAppSelector((state) => state.paymentSettings);
  const isSysAdmin = user?.role === ROLES.SYS_ADMIN;
  const tenantId = isSysAdmin ? activeTenant?.id : undefined;

  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const { register, watch, setValue, reset, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      publishableKey: '',
      secretKey: '',
      webhookSecret: '',
      creditEnabled: true,
      pixEnabled: true,
      recurringEnabled: false,
    },
  });

  const values = watch();

  const load = () => {
    if (isSysAdmin && !tenantId) return;
    dispatch(fetchPaymentSettings(tenantId));
  };

  useEffect(() => {
    if (isSysAdmin && !tenantId) return;
    dispatch(fetchPaymentSettings(tenantId));
  }, [dispatch, isSysAdmin, tenantId]);

  useEffect(() => () => {
    dispatch(resetPaymentSettings());
  }, [dispatch]);

  useEffect(() => {
    if (isSysAdmin && tenantsList.length === 0) dispatch(fetchTenants());
  }, [dispatch, isSysAdmin, tenantsList.length]);

  useEffect(() => {
    if (!isSysAdmin || activeTenant || tenantsList.length === 0) return;
    dispatch(setActiveTenant(tenantsList[0]));
  }, [activeTenant, dispatch, isSysAdmin, tenantsList]);

  useEffect(() => {
    if (settings) {
      reset({
        publishableKey: settings.publishableKey || '',
        secretKey: '',
        webhookSecret: '',
        creditEnabled: settings.creditEnabled ?? true,
        pixEnabled: settings.pixEnabled ?? true,
        recurringEnabled: settings.recurringEnabled ?? false,
      });
    }
  }, [settings, reset]);

  const effectiveCredit = values.creditEnabled;
  const effectivePix = values.pixEnabled;
  const effectiveRecurring = values.recurringEnabled && effectiveCredit;
  const nothingEnabled = !effectiveCredit && !effectivePix;
  const waitingClinic = isSysAdmin && !tenantId;

  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/v1/payments/webhook/stripe`;

  const copyWebhookUrl = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  const onSubmit = (data: FormValues) => {
    if (nothingEnabled) return;
    const blank = (v: string) => (v.trim() ? v.trim() : undefined);

    dispatch(
      savePaymentSettings({
        tenantId,
        publishableKey: blank(data.publishableKey),
        secretKey: blank(data.secretKey),
        webhookSecret: blank(data.webhookSecret),
        creditEnabled: effectiveCredit,
        pixEnabled: effectivePix,
        recurringEnabled: effectiveRecurring,
      }),
    );
  };

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: t('paymentSettings.title') }]} />

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">
            {t('paymentSettings.title')}
          </h2>
          <p className="m-0 mt-1 text-[.9rem] text-[var(--text-body)]">
            {t('paymentSettings.subtitle')}
          </p>
        </div>

        {isSysAdmin && (
          <label className="flex items-center gap-2 text-[var(--text-body)]">
            <Building size={17} />
            <select
              aria-label={t('paymentSettings.supportingClinic')}
              value={activeTenant?.id || ''}
              onChange={(event) => {
                const tenant = tenantsList.find((item) => item.id === Number(event.target.value));
                if (tenant) dispatch(setActiveTenant(tenant));
              }}
              className="rounded-lg border border-[var(--border-color)] bg-white px-3 py-2 hover:border-[var(--accent-primary)]"
            >
              {tenantsList.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {(loading || (waitingClinic && tenantsLoading)) && (
        <p role="status" className="flex items-center gap-2 text-[var(--text-body)]">
          <Loader2 size={18} className="animate-spin" />
          {t('common.loading')}
        </p>
      )}

      {error !== null && !loading && (
        <div className="mb-4">
          <ErrorAlert
            message={error || t('paymentSettings.loadError')}
            onRetry={load}
          />
        </div>
      )}

      {saved && !loading && (
        <div
          role="status"
          className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-700"
        >
          <CheckCircle2 size={20} />
          {t('paymentSettings.saved')}
        </div>
      )}

      {!loading && waitingClinic && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800"
        >
          <AlertCircle size={20} />
          {t('paymentSettings.chooseClinic')}
        </div>
      )}

      {!loading && !waitingClinic && (
        <div className="flex flex-col gap-6">
          {/* Status Banner */}
          <div
            className={`flex items-start gap-3 rounded-xl border p-4 ${
              settings?.configured
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            {settings?.configured ? (
              <ShieldCheck size={24} className="mt-0.5 text-emerald-600" />
            ) : (
              <ShieldAlert size={24} className="mt-0.5 text-amber-600" />
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {settings?.configured
                    ? t('paymentSettings.statusActive')
                    : t('paymentSettings.statusInactive')}
                </span>
                {settings?.configured && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      settings.environment === 'production'
                        ? 'bg-emerald-200 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {settings.environment === 'production'
                      ? t('paymentSettings.envProduction')
                      : t('paymentSettings.envSandbox')}
                  </span>
                )}
              </div>
              <p className="m-0 mt-1 text-sm text-[var(--text-body)]">
                {settings?.configured
                  ? `${t('paymentSettings.statusActiveDesc')} Stripe.`
                  : t('paymentSettings.statusInactiveDesc')}
              </p>
            </div>
          </div>

          <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            {/* Stripe Credentials Card */}
            <div className="rounded-xl border border-[var(--border-color)] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
                <KeyRound size={20} className="text-[var(--accent-primary)]" />
                <h3 className="m-0 text-[1.1rem] font-semibold text-[var(--text-heading)]">
                  {t('paymentSettings.stripeCredentials')}
                </h3>
              </div>
              <p className="mb-5 mt-0 text-sm text-[var(--text-body)]">
                {t('paymentSettings.stripeCredentialsHelp')}
              </p>

              <div className="flex flex-col gap-4">
                {/* Publishable Key */}
                <div>
                  <label htmlFor="publishableKey" className="mb-1 block text-sm font-medium text-[var(--text-heading)]">
                    {t('paymentSettings.publishableKey')}
                  </label>
                  <input
                    id="publishableKey"
                    type="text"
                    disabled={saving}
                    placeholder={t('paymentSettings.publishableKeyPlaceholder')}
                    {...register('publishableKey')}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                  <small className="mt-1 block text-xs text-[var(--text-body)]">
                    {t('paymentSettings.publishableKeyHint')}
                  </small>
                </div>

                {/* Secret Key */}
                <div>
                  <label htmlFor="secretKey" className="mb-1 block text-sm font-medium text-[var(--text-heading)]">
                    {t('paymentSettings.secretKey')}
                  </label>
                  <input
                    id="secretKey"
                    type="password"
                    disabled={saving}
                    placeholder={
                      settings?.configured
                        ? t('paymentSettings.keepSecretBlank')
                        : t('paymentSettings.secretKeyPlaceholder')
                    }
                    {...register('secretKey')}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                  <small className="mt-1 block text-xs text-[var(--text-body)]">
                    {t('paymentSettings.secretKeyHint')}
                  </small>
                </div>

                {/* Webhook Secret */}
                <div>
                  <label htmlFor="webhookSecret" className="mb-1 block text-sm font-medium text-[var(--text-heading)]">
                    {t('paymentSettings.webhookSecret')}
                  </label>
                  <input
                    id="webhookSecret"
                    type="password"
                    disabled={saving}
                    placeholder={
                      settings?.configured
                        ? t('paymentSettings.keepSecretBlank')
                        : t('paymentSettings.webhookSecretPlaceholder')
                    }
                    {...register('webhookSecret')}
                    className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                  <small className="mt-1 block text-xs text-[var(--text-body)]">
                    {t('paymentSettings.webhookSecretHint')}
                  </small>
                </div>

                {/* Webhook Endpoint Info */}
                <div className="mt-2 rounded-lg bg-gray-50 p-3 text-xs text-[var(--text-body)]">
                  <span className="font-semibold">{t('paymentSettings.webhookUrlLabel')}</span>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 rounded bg-gray-200 px-2 py-1 font-mono text-[.8rem] text-gray-800">
                      {webhookUrl}
                    </code>
                    <button
                      type="button"
                      onClick={copyWebhookUrl}
                      className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1 text-xs hover:bg-gray-100"
                    >
                      {copiedWebhook ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      {copiedWebhook ? t('payments.pixCopied') : t('common.copy')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Methods Card */}
            <div className="rounded-xl border border-[var(--border-color)] bg-white p-5 shadow-sm">
              <h3 className="mb-3 mt-0 text-[1.1rem] font-semibold text-[var(--text-heading)]">
                {t('paymentSettings.methods')}
              </h3>

              <div className="flex flex-col gap-3">
                <MethodToggle
                  icon={<CreditCard size={18} />}
                  label={t('paymentSettings.credit')}
                  hint={t('paymentSettings.creditHint')}
                  disabled={saving}
                  checked={values.creditEnabled}
                  onChange={(e) => setValue('creditEnabled', e.target.checked)}
                />

                <MethodToggle
                  icon={<QrCode size={18} />}
                  label={t('paymentSettings.pix')}
                  hint={t('paymentSettings.pixHint')}
                  disabled={saving}
                  checked={values.pixEnabled}
                  onChange={(e) => setValue('pixEnabled', e.target.checked)}
                />

                <MethodToggle
                  icon={<Repeat size={18} />}
                  label={t('paymentSettings.recurring')}
                  hint={t('paymentSettings.recurringHint')}
                  disabled={saving || !values.creditEnabled}
                  checked={effectiveRecurring}
                  onChange={(e) => setValue('recurringEnabled', e.target.checked)}
                />
              </div>

              {nothingEnabled && (
                <p role="alert" className="mb-0 mt-3 text-xs text-red-600">
                  {t('paymentSettings.needOneMethod')}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="submit"
                disabled={saving || nothingEnabled}
                className="flex items-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? t('paymentSettings.saving') : t('paymentSettings.saveButton')}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
