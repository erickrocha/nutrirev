import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check, CheckCircle2, Copy, QrCode, Sparkles } from 'lucide-react';
import { cancelPixAttempt, createPixCharge, pollPixAttempt } from '../../store/paymentSlice';
import { useAppDispatch } from '../../store/hooks';
import type { PixAttemptState, PixCharge } from '../../types/payment';

/** De quanto em quanto tempo perguntar se o dinheiro chegou. */
export const POLL_INTERVAL_MS = 4000;

const formatCountdown = (msLeft: number): string => {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

interface Props {
  chargeId: number;
  idempotencyKey: string;
  taxId: string;
  onTaxIdRequired: () => void;
  onPaid: (state: PixAttemptState) => void;
}

/**
 * Metade Pix do pagamento: emite o QR, consulta até ser pago e libera a tentativa se o paciente sair.
 *
 * Liberar importa mais do que parece: só uma tentativa viva pode reservar a cobrança, então um QR
 * abandonado a travaria para qualquer método — o paciente não conseguiria pagar nem pelo cartão.
 */
export const PixPanel = ({ chargeId, idempotencyKey, taxId, onTaxIdRequired, onPaid }: Props) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [pix, setPix] = useState<PixCharge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);
  const [msLeft, setMsLeft] = useState<number | null>(null);
  // Em refs para o cancelamento ao desmontar não depender de um efeito que reemitiria a cobrança a cada mudança de estado.
  const attemptRef = useRef<number | null>(null);
  const paidRef = useRef(false);
  const onTaxIdRequiredRef = useRef(onTaxIdRequired);
  onTaxIdRequiredRef.current = onTaxIdRequired;

  useEffect(() => {
    let cancelled = false;
    dispatch(createPixCharge({ chargeId, idempotencyKey, taxId })).then((result) => {
      if (cancelled) return;
      if (createPixCharge.fulfilled.match(result)) {
        const issued = result.payload;
        if (issued.taxIdRequired) { onTaxIdRequiredRef.current(); return; }
        if (issued.pix) { attemptRef.current = issued.pix.attemptId; setPix(issued.pix); }
        else setError(issued.error || t('payments.pixError'));
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
      // Sair do painel precisa liberar a cobrança.
      if (attemptRef.current && !paidRef.current) dispatch(cancelPixAttempt(attemptRef.current));
    };
  }, [chargeId, idempotencyKey, taxId, dispatch, t]);

  const poll = useCallback(async () => {
    if (!attemptRef.current || paidRef.current) return;
    const result = await dispatch(pollPixAttempt(attemptRef.current));
    const state = pollPixAttempt.fulfilled.match(result) ? result.payload : null;
    if (state && (state.chargePaid || state.status === 'captured')) {
      paidRef.current = true;
      setPaid(true);
      onPaid(state);
    }
  }, [dispatch, onPaid]);

  useEffect(() => {
    if (!pix || paid) return undefined;
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [pix, paid, poll]);

  useEffect(() => {
    if (!pix?.expiresAt) return undefined;
    const deadline = new Date(pix.expiresAt).getTime();
    const tick = () => setMsLeft(deadline - Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [pix]);

  const copy = async () => {
    if (!pix?.payload) return;
    try {
      await navigator.clipboard.writeText(pix.payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(t('payments.pixCopyFailed'));
    }
  };

  if (loading) return <div role="status" className="flex items-center justify-center gap-2 p-6 text-[var(--text-body)]"><Sparkles size={20} className="animate-spin" />{t('payments.pixGenerating')}</div>;
  if (error && !pix) return <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700"><AlertCircle size={20} />{error}</div>;
  if (paid) return <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700"><CheckCircle2 size={20} />{t('payments.approved')}</div>;

  const expired = msLeft !== null && msLeft <= 0;
  return (
    <div className="flex flex-col items-center gap-3">
      {pix?.encodedImage
        ? <img src={`data:image/png;base64,${pix.encodedImage}`} alt={t('payments.pixQrAlt')} className="h-48 w-48 rounded-xl border border-[var(--border-color)] bg-white p-2" />
        : <div className="flex h-48 w-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--text-body)]"><QrCode size={40} /><span className="text-[.8rem]">{t('payments.pixUseCode')}</span></div>}
      <p className="m-0 text-center text-[.85rem] text-[var(--text-body)]">{t('payments.pixInstructions')}</p>
      <div className="flex w-full items-center gap-2 rounded-lg border border-[var(--border-color)] bg-slate-50 p-2">
        <code className="min-w-0 flex-1 break-all text-[.72rem]">{pix?.payload}</code>
        <button type="button" onClick={copy} className="flex shrink-0 items-center gap-1 rounded-md border border-[var(--border-color)] bg-white px-3 py-1 text-[.8rem] font-semibold hover:border-[var(--accent-primary)]">
          {copied ? <Check size={16} /> : <Copy size={16} />}{copied ? t('payments.pixCopied') : t('payments.pixCopy')}
        </button>
      </div>
      <div className="flex items-center gap-2 text-[.82rem] text-[var(--text-body)]">
        {expired ? <span className="font-semibold text-red-600">{t('payments.pixExpired')}</span> : (
          <>
            <Sparkles size={14} className="animate-spin" /><span>{t('payments.pixWaiting')}</span>
            {msLeft !== null && <span className="font-mono font-semibold">{formatCountdown(msLeft)}</span>}
          </>
        )}
      </div>
      {error && <span role="alert" className="text-[.78rem] text-red-700">{error}</span>}
    </div>
  );
};
