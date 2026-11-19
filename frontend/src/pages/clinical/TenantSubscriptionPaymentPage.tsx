import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Lock,
  QrCode,
  Receipt,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { StripePaymentElementForm } from '../../components/payments/StripePaymentElementForm';
import { TenantSubscriptionPaymentHistoryTable } from '../../components/payments/TenantSubscriptionPaymentHistoryTable';
import type { TenantSubscriptionPaymentsFilter } from '../../types/tenantSubscription';
import {
  createTenantSubscriptionIntent,
  createTenantSubscriptionPix,
  fetchTenantSubscriptionPayments,
  fetchTenantSubscriptionStatus,
  payTenantSubscriptionCard,
  verifyTenantSubscriptionPayment,
} from '../../store/tenantSubscriptionSlice';
import {
  detectBrand,
  formatCardNumber,
  formatExpiry,
  isCardNumberValid,
  isCvvValid,
  isExpiryValid,
  parseExpiry,
} from '../../utils/card';
import { Button } from '../../components/atoms/Button';
import { TextField } from '../../components/atoms/TextField';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { PATHS } from '../../router/routeConfig';

export const POLL_INTERVAL_MS = 4000;

interface CardFormValues {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  securityCode: string;
}

export const TenantSubscriptionPaymentPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    status,
    loading,
    pixLoading,
    cardSubmitting,
    intentLoading,
    paymentIntent,
    pix,
    payments,
    paymentsLoading,
    error,
    lastSuccess,
  } = useAppSelector((state) => state.tenantSubscription);

  const [method, setMethod] = useState<'pix' | 'card' | 'history'>('pix');
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      yup.object({
        cardholderName: yup
          .string()
          .trim()
          .required(t('payments.cardInvalidHolder', 'Informe o nome impresso no cartão')),
        cardNumber: yup
          .string()
          .required(t('payments.cardInvalidNumber', 'Número do cartão inválido'))
          .test(
            'valid-number',
            t('payments.cardInvalidNumber', 'Número do cartão inválido'),
            (val) => isCardNumberValid(val ?? '')
          ),
        expiry: yup
          .string()
          .required(t('payments.cardInvalidExpiry', 'Data de expiração inválida'))
          .test(
            'valid-expiry',
            t('payments.cardInvalidExpiry', 'Data de expiração inválida'),
            (val) => isExpiryValid(val ?? '')
          ),
        securityCode: yup
          .string()
          .required(t('payments.cardInvalidCvv', 'Código de segurança inválido'))
          .test(
            'valid-cvv',
            t('payments.cardInvalidCvv', 'Código de segurança inválido'),
            (val) => isCvvValid(val ?? '')
          ),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<CardFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: {
      cardholderName: '',
      cardNumber: '',
      expiry: '',
      securityCode: '',
    },
  });

  const watchCardNumber = watch('cardNumber');
  const brand = useMemo(() => detectBrand(watchCardNumber || ''), [watchCardNumber]);

  // Initial load
  useEffect(() => {
    dispatch(fetchTenantSubscriptionStatus());
  }, [dispatch]);

  // When method switches to Pix, automatically trigger QR code creation if not present
  useEffect(() => {
    if (method === 'pix' && !pix && status && status.status !== 'ok') {
      dispatch(createTenantSubscriptionPix());
    }
  }, [method, pix, status, dispatch]);

  // When method switches to Card, automatically create Stripe PaymentIntent for Payment Element
  useEffect(() => {
    if (method === 'card' && !paymentIntent && status && status.status !== 'ok') {
      dispatch(createTenantSubscriptionIntent());
    }
  }, [method, paymentIntent, status, dispatch]);

  // When method switches to history, load payments
  useEffect(() => {
    if (method === 'history') {
      dispatch(fetchTenantSubscriptionPayments());
    }
  }, [method, dispatch]);

  const handleFilterPayments = (filter: TenantSubscriptionPaymentsFilter) => {
    dispatch(fetchTenantSubscriptionPayments(filter));
  };

  // Load Stripe instance with publishable key
  const stripePromise = useMemo(() => {
    const key = paymentIntent?.publishableKey || status?.publishableKey;
    if (!key) return null;
    return loadStripe(key);
  }, [paymentIntent?.publishableKey, status?.publishableKey]);

  // Handle redirect callback from Stripe 3DS
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const piId = searchParams.get('payment_intent');
    const piClientSecret = searchParams.get('payment_intent_client_secret');
    const idToVerify = piId || (piClientSecret ? piClientSecret.split('_secret_')[0] : '');
    if (idToVerify) {
      dispatch(verifyTenantSubscriptionPayment(idToVerify)).then((res) => {
        if (verifyTenantSubscriptionPayment.fulfilled.match(res)) {
          setTimeout(() => {
            navigate(PATHS.TENANT_DASHBOARD);
          }, 2000);
        }
      });
    }
  }, [dispatch, navigate]);

  // Handle Stripe Payment Element confirmation success
  const handleStripeSuccess = async (paymentIntentId: string) => {
    const res = await dispatch(verifyTenantSubscriptionPayment(paymentIntentId));
    if (verifyTenantSubscriptionPayment.fulfilled.match(res)) {
      setTimeout(() => {
        navigate(PATHS.TENANT_DASHBOARD);
      }, 2000);
    }
  };

  // Polling for Pix payment status
  const pollStatus = useCallback(async () => {
    if (status?.status === 'ok') return;
    const res = await dispatch(fetchTenantSubscriptionStatus());
    if (fetchTenantSubscriptionStatus.fulfilled.match(res)) {
      if (res.payload.status === 'ok') {
        setTimeout(() => {
          navigate(PATHS.TENANT_DASHBOARD);
        }, 2000);
      }
    }
  }, [dispatch, navigate, status?.status]);

  useEffect(() => {
    if (status?.status === 'ok') return undefined;
    const timer = setInterval(pollStatus, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [status?.status, pollStatus]);

  // Handle Copy PIX
  const handleCopyPix = async () => {
    if (!pix?.payload) return;
    try {
      await navigator.clipboard.writeText(pix.payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setFormError(t('tenantSubscription.copyError', 'Erro ao copiar código PIX'));
    }
  };

  // Handle Card Submit via React Hook Form
  const onCardSubmit = async (data: CardFormValues) => {
    setFormError(null);
    const parsedExp = parseExpiry(data.expiry);
    if (!parsedExp) {
      setFormError(t('payments.cardInvalidExpiry', 'Data de expiração inválida'));
      return;
    }

    const cleanCard = data.cardNumber.replace(/\D/g, '');
    const cleanCvv = data.securityCode.replace(/\D/g, '');

    const result = await dispatch(
      payTenantSubscriptionCard({
        cardholderName: data.cardholderName.trim().toUpperCase(),
        cardNumber: cleanCard,
        expirationMonth: parsedExp.month,
        expirationYear: parsedExp.year,
        securityCode: cleanCvv,
      })
    );

    if (payTenantSubscriptionCard.fulfilled.match(result)) {
      reset();
      setTimeout(() => {
        navigate(PATHS.TENANT_DASHBOARD);
      }, 2000);
    }
  };

  const isBlocked = status?.status === 'blocked';
  const isWarning = status?.status === 'warning';
  const isOk = status?.status === 'ok';

  const breadcrumbs = isBlocked
    ? [{ label: t('tenantSubscription.menuLabel', 'Pagamento da Assinatura') }]
    : [
        { label: t('menu.dashboard', 'Painel'), to: PATHS.TENANT_DASHBOARD },
        { label: t('tenantSubscription.menuLabel', 'Pagamento da Assinatura') },
      ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Breadcrumb standard */}
      <Breadcrumb items={breadcrumbs} />

      {/* Header Banner */}
      {isBlocked && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <h2 className="text-base font-bold">
              {t('tenantSubscription.blockedTitle', 'Acesso Bloqueado por Pendência Financeira')}
            </h2>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              {t(
                'tenantSubscription.blockedDescription',
                'O prazo de tolerância da sua assinatura expirou. Para restabelecer o acesso completo ao sistema, realize o pagamento abaixo.'
              )}
            </p>
          </div>
        </div>
      )}

      {isWarning && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <h2 className="text-base font-bold">
              {t('tenantSubscription.warningTitle', 'Assinatura Pendente de Regularização')}
            </h2>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              {t(
                'tenantSubscription.warningDescription',
                'Sua assinatura está com pagamento pendente. Evite a interrupção dos serviços efetuando o pagamento da fatura.'
              )}
            </p>
          </div>
        </div>
      )}

      {isOk && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="flex-1">
            <h2 className="text-base font-bold">
              {t('tenantSubscription.okTitle', 'Assinatura em Dia!')}
            </h2>
            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
              {lastSuccess?.message ||
                t(
                  'tenantSubscription.okDescription',
                  `O pagamento da assinatura está regularizado. Próximo vencimento: ${status?.paymentDate}`
                )}
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate(PATHS.TENANT_DASHBOARD)}
            className="shrink-0"
          >
            {t('tenantSubscription.backToDashboard', 'Ir para o Painel')}
            <ArrowRight size={16} className="ml-1" />
          </Button>
        </div>
      )}

      {/* Main Container */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Plan Summary Card */}
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-alt)] p-6 shadow-sm md:col-span-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-body)]">
            {t('tenantSubscription.summaryTitle', 'Resumo da Assinatura')}
          </h3>

          <div className="mt-4">
            <span className="text-2xl font-bold text-[var(--text-heading)]">
              {status?.planName || t('tenantSubscription.defaultPlan', 'Plano NutriRev')}
            </span>
          </div>

          <div className="mt-4 rounded-xl bg-[var(--bg-primary)] p-4">
            <span className="text-xs text-[var(--text-body)]">
              {t('tenantSubscription.totalDue', 'Valor da Fatura')}
            </span>
            <div className="text-3xl font-extrabold text-[var(--accent-primary)]">
              {status?.formattedAmount || 'R$ --'}
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center justify-between text-[var(--text-body)]">
              <span>{t('tenantSubscription.dueDate', 'Vencimento')}</span>
              <span className="font-semibold text-[var(--text-heading)]">
                {status?.paymentDate || '--'}
              </span>
            </div>

            {status && status.daysOverdue > 0 && (
              <div className="flex items-center justify-between text-red-600 dark:text-red-400">
                <span>{t('tenantSubscription.daysOverdue', 'Dias em atraso')}</span>
                <span className="font-bold">{status.daysOverdue} dias</span>
              </div>
            )}

            <div className="flex items-center justify-between text-[var(--text-body)]">
              <span>{t('tenantSubscription.statusLabel', 'Situação')}</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isBlocked
                    ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                    : isWarning
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
              >
                {isBlocked && <Lock size={12} />}
                {isWarning && <Clock size={12} />}
                {isOk && <Check size={12} />}
                {isBlocked
                  ? t('tenantSubscription.statusBlocked', 'Bloqueado')
                  : isWarning
                  ? t('tenantSubscription.statusWarning', 'Pendente')
                  : t('tenantSubscription.statusOk', 'Em dia')}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Forms */}
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-alt)] p-6 shadow-sm md:col-span-2">
          {/* Method Tabs */}
          <div className="mb-6 flex rounded-xl bg-[var(--bg-primary)] p-1">
            <button
              type="button"
              onClick={() => setMethod('pix')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                method === 'pix'
                  ? 'bg-[var(--bg-alt)] text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-body)] hover:text-[var(--text-heading)]'
              }`}
            >
              <QrCode size={18} />
              <span>PIX</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod('card')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                method === 'card'
                  ? 'bg-[var(--bg-alt)] text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-body)] hover:text-[var(--text-heading)]'
              }`}
            >
              <CreditCard size={18} />
              <span>{t('tenantSubscription.creditCard', 'Cartão de Crédito')}</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod('history')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                method === 'history'
                  ? 'bg-[var(--bg-alt)] text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-body)] hover:text-[var(--text-heading)]'
              }`}
            >
              <Receipt size={18} />
              <span>{t('tenantSubscription.historyTab', 'Histórico')}</span>
            </button>
          </div>

          {(error || formError) && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              <AlertCircle size={16} className="shrink-0" />
              <span>{formError || error}</span>
            </div>
          )}

          {lastSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{lastSuccess.message}</span>
            </div>
          )}

          {/* PIX TAB */}
          {method === 'pix' && (
            <div className="flex flex-col items-center py-4 text-center">
              {pixLoading ? (
                <div className="py-12 flex flex-col items-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
                  <p className="mt-3 text-sm text-[var(--text-body)]">
                    {t('tenantSubscription.generatingPix', 'Gerando QR Code PIX...')}
                  </p>
                </div>
              ) : pix ? (
                <>
                  <div className="relative rounded-2xl border-2 border-[var(--border-color)] bg-white p-4 shadow-sm">
                    {pix.encodedImage ? (
                      <img
                        src={`data:image/png;base64,${pix.encodedImage}`}
                        alt="QR Code PIX"
                        className="h-56 w-56 object-contain"
                      />
                    ) : (
                      <div className="flex h-56 w-56 items-center justify-center bg-gray-50 text-gray-400">
                        <QrCode size={120} />
                      </div>
                    )}
                  </div>

                  <p className="mt-4 max-w-sm text-xs text-[var(--text-body)]">
                    {t(
                      'tenantSubscription.pixInstructions',
                      'Abra o app do seu banco, escolha Pagar via Pix e aponte a câmera para o QR Code acima ou copie o código abaixo.'
                    )}
                  </p>

                  <div className="mt-4 flex w-full max-w-md items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-2">
                    <input
                      type="text"
                      readOnly
                      value={pix.payload}
                      className="flex-1 bg-transparent px-2 text-xs text-[var(--text-heading)] outline-none"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCopyPix}
                      className="shrink-0 text-xs py-1.5 px-3"
                    >
                      {copied ? (
                        <>
                          <Check size={14} className="text-emerald-600 mr-1" />
                          <span>{t('common.copied', 'Copiado!')}</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} className="mr-1" />
                          <span>{t('common.copy', 'Copiar')}</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="mt-6 flex items-center gap-2 text-xs text-[var(--text-body)]">
                    <RefreshCw size={14} className="animate-spin text-[var(--accent-primary)]" />
                    <span>
                      {t(
                        'tenantSubscription.awaitingPix',
                        'Aguardando confirmação do pagamento em tempo real...'
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <div className="py-8">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => dispatch(createTenantSubscriptionPix())}
                  >
                    <QrCode size={18} className="mr-2" />
                    {t('tenantSubscription.generatePixButton', 'Gerar Código PIX')}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* CARD TAB: STRIPE PAYMENT ELEMENT WITH FALLBACK */}
          {method === 'card' && (
            <div>
              {intentLoading ? (
                <div className="py-12 flex flex-col items-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
                  <p className="mt-3 text-sm text-[var(--text-body)]">
                    {t(
                      'tenantSubscription.loadingStripe',
                      'Inicializando checkout seguro da Stripe...'
                    )}
                  </p>
                </div>
              ) : paymentIntent?.clientSecret && stripePromise ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: paymentIntent.clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#10b981',
                      },
                    },
                  }}
                >
                  <StripePaymentElementForm
                    formattedAmount={status?.formattedAmount}
                    isBlocked={isBlocked}
                    onCancel={() => navigate(PATHS.TENANT_DASHBOARD)}
                    onSuccess={handleStripeSuccess}
                  />
                </Elements>
              ) : (
                <form onSubmit={handleSubmit(onCardSubmit)} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[var(--text-heading)]">
                      {t('payments.cardholderName', 'Nome no Cartão')}
                    </label>
                    <TextField
                      {...register('cardholderName')}
                      onChange={(e) => setValue('cardholderName', e.target.value.toUpperCase())}
                      placeholder="EX: MARIA S SILVA"
                      error={errors.cardholderName?.message}
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="block text-xs font-semibold text-[var(--text-heading)]">
                        {t('payments.cardNumber', 'Número do Cartão')}
                      </label>
                      {brand && (
                        <span className="text-xs font-bold uppercase text-[var(--accent-primary)]">
                          {brand}
                        </span>
                      )}
                    </div>
                    <TextField
                      {...register('cardNumber')}
                      onChange={(e) => setValue('cardNumber', formatCardNumber(e.target.value))}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      error={errors.cardNumber?.message}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[var(--text-heading)]">
                        {t('payments.cardExpiry', 'Validade (MM/AA)')}
                      </label>
                      <TextField
                        {...register('expiry')}
                        onChange={(e) => setValue('expiry', formatExpiry(e.target.value))}
                        placeholder="MM/AA"
                        maxLength={5}
                        error={errors.expiry?.message}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[var(--text-heading)]">
                        {t('payments.cardCvv', 'CVV')}
                      </label>
                      <TextField
                        type="password"
                        {...register('securityCode')}
                        onChange={(e) =>
                          setValue('securityCode', e.target.value.replace(/\D/g, ''))
                        }
                        placeholder="123"
                        maxLength={4}
                        error={errors.securityCode?.message}
                      />
                    </div>
                  </div>

                  {/* Standard button alignment: Cancel on left, Save on right */}
                  <div className="flex items-center justify-between pt-4 gap-4">
                    {isBlocked ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => reset()}
                        className="py-2.5 px-4"
                      >
                        {t('common.clear', 'Limpar')}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => navigate(PATHS.TENANT_DASHBOARD)}
                        className="py-2.5 px-4"
                      >
                        {t('common.cancel', 'Cancelar')}
                      </Button>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      className="py-2.5 px-6"
                      disabled={cardSubmitting || loading}
                    >
                      {cardSubmitting ? (
                        <>
                          <RefreshCw size={16} className="mr-2 animate-spin" />
                          <span>{t('payments.processing', 'Processando Pagamento...')}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} className="mr-2" />
                          <span>
                            {t('tenantSubscription.payButton', 'Pagar Assinatura')}{' '}
                            {status?.formattedAmount ? `(${status.formattedAmount})` : ''}
                          </span>
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--text-body)]">
                    <Lock size={12} />
                    <span>
                      {t(
                        'payments.secureNotice',
                        'Transação segura processada pela plataforma NutriRev via Stripe'
                      )}
                    </span>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {method === 'history' && (
            <div className="py-2">
              <TenantSubscriptionPaymentHistoryTable
                payments={payments}
                loading={paymentsLoading}
                onFilter={handleFilterPayments}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
