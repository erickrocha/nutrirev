import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, CreditCard, Lock, QrCode, ShieldCheck, Sparkles, Wifi, X } from 'lucide-react';
import { Button } from '../atoms/Button';
import { TextField } from '../atoms/TextField';
import { PixPanel } from './PixPanel';
import { fetchOfferedMethods, payWithCard } from '../../store/paymentSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { detectBrand, formatBRL, formatCardNumber, formatExpiry, isCardNumberValid, isCvvValid, isExpiryValid, parseExpiry } from '../../utils/card';
import type { MyCharge } from '../../types/payment';

interface CardValues { cardholderName: string; cardNumber: string; expiry: string; securityCode: string; taxId: string; recurring: boolean }
type Outcome = { type: 'success' | 'uncertain' | 'error'; message: string };

const CLOSE_DELAY_MS = 1500;

interface DialogProps {
  charge: MyCharge;
  onClose: () => void;
  onSuccess?: (result: { status: string }) => void;
}

// Monta a cada abertura (a chave é a cobrança): os dados do cartão nunca sobrevivem a um fechamento.
const CheckoutDialog = ({ charge, onClose, onSuccess }: DialogProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { offered, submitting } = useAppSelector((state) => state.payment);
  const [method, setMethod] = useState<'card' | 'pix'>('card');
  const [needsTaxId, setNeedsTaxId] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Uma chave por tentativa de pagamento, mantida entre repetições de propósito: gerar outra a cada envio faria uma nova
  // tentativa após resposta perdida parecer um pedido novo e esbarrar na reserva que a primeira já fez, para sempre.
  // Ela só é descartada após uma recusa definitiva, quando uma nova tentativa é de fato o que o paciente quer.
  const cardKey = useRef<string | null>(null);
  // O Pix tem chave própria: os dois métodos reservam tentativas diferentes.
  const pixKeyRef = useRef<string | null>(null);
  const pixKey = pixKeyRef.current ?? (pixKeyRef.current = `pix-${charge.id}-${crypto.randomUUID()}`);

  const subscriptionId = charge.paymentDateId ?? charge.payment_date_id ?? null;

  const schema = useMemo(() => yup.object({
    cardholderName: yup.string().trim().required(t('payments.cardInvalidHolder')),
    cardNumber: yup.string().test('number', t('payments.cardInvalidNumber'), (value) => isCardNumberValid(value ?? '')),
    expiry: yup.string().test('expiry', t('payments.cardInvalidExpiry'), (value) => isExpiryValid(value ?? '')),
    securityCode: yup.string().test('cvv', t('payments.cardInvalidCvv'), (value) => isCvvValid(value ?? '')),
    taxId: needsTaxId ? yup.string().trim().required(t('payments.taxIdRequired')) : yup.string(),
  }), [needsTaxId, t]);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<CardValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: { cardholderName: '', cardNumber: '', expiry: '', securityCode: '', taxId: '', recurring: false },
  });
  const values = watch();

  useEffect(() => {
    dispatch(fetchOfferedMethods()).then((result) => {
      // Cair num método que a clínica não aceita ofereceria um pagamento impossível.
      if (fetchOfferedMethods.fulfilled.match(result) && !result.payload.credit && result.payload.pix) setMethod('pix');
    });
    return () => clearTimeout(closeTimer.current);
  }, [dispatch]);

  const finish = useCallback((result: { status: string }) => {
    closeTimer.current = setTimeout(() => { onSuccess?.(result); onClose(); }, CLOSE_DELAY_MS);
  }, [onClose, onSuccess]);

  const handleTaxIdRequired = useCallback(() => { setNeedsTaxId(true); setMethod('card'); }, []);
  const handlePixPaid = useCallback(() => {
    setOutcome({ type: 'success', message: t('payments.approved') });
    finish({ status: 'captured' });
  }, [finish, t]);

  const pay = async (form: CardValues) => {
    setOutcome(null);
    const expiry = parseExpiry(form.expiry) as { month: number; year: number };
    cardKey.current ??= `charge-${charge.id}-${crypto.randomUUID()}`;
    const holder = form.cardholderName.trim().toUpperCase();
    const result = await dispatch(payWithCard({
      chargeId: charge.id, idempotencyKey: cardKey.current, taxId: form.taxId,
      recurringSubscriptionId: form.recurring && subscriptionId ? subscriptionId : null,
      card: { cardholderName: holder, cardNumber: form.cardNumber.replace(/\D/g, ''), expirationMonth: expiry.month, expirationYear: expiry.year, securityCode: form.securityCode.replace(/\D/g, '') },
    }));
    if (!payWithCard.fulfilled.match(result)) { setOutcome({ type: 'error', message: t('payments.declined') }); return; }
    const done = result.payload;
    if (done.kind === 'approved') {
      if (done.taxIdRequired) setNeedsTaxId(true);
      setOutcome({ type: done.recurrenceFailed ? 'uncertain' : 'success', message: done.recurrenceFailed ? t('payments.recurringFailed') : t('payments.approved') });
      finish({ status: 'authorized' });
    } else if (done.kind === 'uncertain') {
      setOutcome({ type: 'uncertain', message: t('payments.uncertain') });
    } else if (done.kind === 'taxIdRequired') {
      setNeedsTaxId(true);
    } else {
      // Recusa libera a reserva no servidor: tentar de novo é uma tentativa nova e não pode reusar a chave.
      if (done.kind === 'declined') cardKey.current = null;
      setOutcome({ type: 'error', message: done.kind === 'error' && done.message ? done.message : t('payments.declined') });
    }
  };

  const brand = detectBrand(values.cardNumber);
  const showTabs = offered.credit && offered.pix;
  const OutcomeIcon = outcome?.type === 'success' ? CheckCircle2 : AlertCircle;
  const outcomeTone = outcome?.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : outcome?.type === 'uncertain' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-300 bg-red-50 text-red-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-0 sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="card-modal-title" className="flex max-h-screen w-full flex-col gap-4 overflow-y-auto bg-white p-6 sm:max-w-[480px] sm:rounded-2xl">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id="card-modal-title" className="m-0 flex items-center gap-2 text-[1.15rem]"><CreditCard size={20} />{t('payments.cardTitle')}</h2>
            <p className="m-0 text-[.82rem] text-[var(--text-body)]">{t('payments.cardSubtitle')}</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label={t('common.close')} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={18} /></button>
        </header>

        {outcome && <div role={outcome.type === 'success' ? 'status' : 'alert'} className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-[.88rem] ${outcomeTone}`}><OutcomeIcon size={20} />{outcome.message}</div>}

        {showTabs && (
          <div role="tablist" aria-label={t('payments.methodLabel')} className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {([['card', t('payments.methodCard'), CreditCard], ['pix', t('payments.methodPix'), QrCode]] as const).map(([id, label, Icon]) => (
              <button
                key={id} type="button" role="tab" aria-selected={method === id} disabled={submitting} onClick={() => setMethod(id)}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[.85rem] font-semibold disabled:opacity-50 ${method === id ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-[var(--text-heading)]'}`}
              ><Icon size={16} />{label}</button>
            ))}
          </div>
        )}
        {!offered.credit && !offered.pix && <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700"><AlertCircle size={20} />{t('payments.noMethodsOffered')}</div>}

        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-[.85rem]">
          <span><strong className="block">{t('payments.cycle', { sequence: charge.sequence || 1 })}</strong><span className="text-[var(--text-body)]">{t('payments.dueDate', { date: charge.dueDate })}</span></span>
          <span className="text-right"><span className="block text-[.75rem] text-[var(--text-body)]">{t('payments.amount')}</span><strong className="text-[1.1rem]">{formatBRL(charge.amountCents)}</strong></span>
        </div>

        {method === 'card' && offered.credit && (
          <>
            <div aria-hidden="true" className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-600 p-5 text-white">
              <div className="mb-6 flex items-center justify-between"><Wifi size={18} /><span className="text-[.75rem] font-bold tracking-widest">{brand}</span></div>
              <div className="mb-4 font-mono text-[1.1rem] tracking-widest">{values.cardNumber || '•••• •••• •••• ••••'}</div>
              <div className="flex justify-between text-[.75rem]">
                <span><span className="block opacity-70">{t('payments.cardHolder')}</span>{values.cardholderName.toUpperCase() || 'NOME NO CARTÃO'}</span>
                <span><span className="block opacity-70">{t('payments.cardExpiry')}</span>{values.expiry || 'MM/AA'}</span>
              </div>
            </div>

            <form noValidate onSubmit={handleSubmit(pay)} className="flex flex-col gap-4">
              <TextField
                id="card-holder-input" label={`${t('payments.cardHolder')} *`} placeholder={t('payments.cardHolderPlaceholder')} autoComplete="cc-name" disabled={submitting} error={errors.cardholderName?.message}
                {...register('cardholderName', { onChange: (event) => { event.target.value = event.target.value.toUpperCase(); } })}
              />
              <TextField
                id="card-number-input" label={`${t('payments.cardNumber')} *`} placeholder={t('payments.cardNumberPlaceholder')} inputMode="numeric" autoComplete="cc-number" maxLength={23} disabled={submitting} error={errors.cardNumber?.message}
                {...register('cardNumber', { onChange: (event) => { event.target.value = formatCardNumber(event.target.value); } })}
              />
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  id="card-expiry-input" label={`${t('payments.cardExpiry')} *`} placeholder={t('payments.cardExpiryPlaceholder')} inputMode="numeric" autoComplete="cc-exp" maxLength={7} disabled={submitting} error={errors.expiry?.message}
                  {...register('expiry', { onChange: (event) => { event.target.value = formatExpiry(event.target.value); } })}
                />
                <TextField
                  id="card-cvv-input" type="password" label={`${t('payments.cardCvv')} *`} placeholder={t('payments.cardCvvPlaceholder')} inputMode="numeric" autoComplete="cc-csc" maxLength={4} disabled={submitting} error={errors.securityCode?.message}
                  {...register('securityCode', { onChange: (event) => { event.target.value = event.target.value.replace(/\D/g, '').slice(0, 4); } })}
                />
              </div>
              {needsTaxId && <TextField id="tax-id-input" label={`${t('payments.taxId')} *`} placeholder={t('payments.taxIdPlaceholder')} inputMode="numeric" maxLength={18} disabled={submitting} error={errors.taxId?.message ?? t('payments.taxIdRequired')} {...register('taxId')} />}
              {subscriptionId && offered.recurring && (
                <label className="flex items-start gap-2 rounded-xl border border-[var(--border-color)] p-3">
                  <input type="checkbox" className="mt-1 h-4 w-4" disabled={submitting} {...register('recurring')} />
                  <span><strong className="block text-[.88rem]">{t('payments.recurringLabel')}</strong><small className="text-[var(--text-body)]">{t('payments.recurringHint')}</small></span>
                </label>
              )}
              <p className="m-0 flex items-center gap-2 text-[.78rem] text-[var(--text-body)]"><ShieldCheck size={16} />{t('payments.securePaymentNotice')}</p>
              <div className="flex items-center justify-between gap-3">
                <Button variant="outline" onClick={onClose} disabled={submitting}>{t('common.cancel')}</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <><Sparkles size={16} className="animate-spin" />{t('payments.processingPayment')}</> : <><Lock size={16} />{t('payments.confirmButton')}</>}
                </Button>
              </div>
            </form>
          </>
        )}

        {method === 'pix' && offered.pix && (
          <PixPanel chargeId={charge.id} idempotencyKey={pixKey} taxId={values.taxId} onTaxIdRequired={handleTaxIdRequired} onPaid={handlePixPaid} />
        )}
      </div>
    </div>
  );
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  charge: MyCharge | null;
  onSuccess?: (result: { status: string }) => void;
}

export const CardPaymentModal = ({ isOpen, onClose, charge, onSuccess }: Props) =>
  isOpen && charge ? <CheckoutDialog key={charge.id} charge={charge} onClose={onClose} onSuccess={onSuccess} /> : null;
