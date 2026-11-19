import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { AlertCircle, Lock, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '../atoms/Button';

interface StripePaymentElementFormProps {
  formattedAmount?: string;
  isBlocked: boolean;
  onSuccess: (paymentIntentId: string) => Promise<void> | void;
  onCancel?: () => void;
}

export const StripePaymentElementForm = ({
  formattedAmount,
  isBlocked,
  onSuccess,
  onCancel,
}: StripePaymentElementFormProps) => {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/subscription-payment?confirmed=true`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(
          error.message ||
            t('payments.stripePaymentError', 'Não foi possível processar o pagamento pela Stripe.')
        );
        setSubmitting(false);
        return;
      }

      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        await onSuccess(paymentIntent.id);
      }
    } catch (err) {
      setErrorMessage(
        (err as Error).message ||
          t('payments.stripePaymentError', 'Erro inesperado ao processar o pagamento.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 shadow-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle size={18} className="shrink-0 text-red-600 dark:text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Stripe Official Drop-in Payment Element */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 shadow-sm">
        <PaymentElement
          id="payment-element"
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {/* Action buttons: Cancel/Clear on left, Pay on right */}
      <div className="flex items-center justify-between pt-2 gap-4">
        {isBlocked ? (
          <div />
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="py-2.5 px-4"
            disabled={submitting}
          >
            {t('common.cancel', 'Cancelar')}
          </Button>
        )}

        <Button
          type="submit"
          variant="primary"
          className="py-2.5 px-6 ml-auto"
          disabled={!stripe || !elements || submitting}
        >
          {submitting ? (
            <>
              <RefreshCw size={16} className="mr-2 animate-spin" />
              <span>{t('payments.processing', 'Processando Pagamento...')}</span>
            </>
          ) : (
            <>
              <Sparkles size={16} className="mr-2" />
              <span>
                {t('tenantSubscription.payButton', 'Pagar Assinatura')}{' '}
                {formattedAmount ? `(${formattedAmount})` : ''}
              </span>
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-body)]">
        <Lock size={12} />
        <span>
          {t(
            'payments.secureNoticeStripe',
            'Checkout oficial e criptografado da Stripe com suporte a cartões e carteiras digitais'
          )}
        </span>
      </div>
    </form>
  );
};
