import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode, Copy, Check, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { paymentService } from '../../services/paymentService';

/** How often to ask whether the money arrived. */
const POLL_INTERVAL_MS = 4000;

const formatCountdown = (msLeft) => {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

/**
 * Pix half of the checkout: issue a QR, poll until it is paid, and release the
 * attempt if the customer walks away.
 *
 * Releasing matters more than it looks. Only one live attempt may reserve a
 * charge, so an abandoned QR would block that charge for every method — the
 * customer could never pay it, by card or otherwise, without support stepping in.
 */
export const PixPanel = ({ charge, idempotencyKey, taxId, onTaxIdRequired, onPaid, onAttempt }) => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [pix, setPix] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);
  const [msLeft, setMsLeft] = useState(null);

  // Kept in a ref so the unmount cleanup can cancel the attempt without the
  // effect re-running (and re-issuing a charge) every time state changes.
  const attemptRef = useRef(null);
  const paidRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const issue = async () => {
      try {
        const result = await paymentService.createPixCharge({
          chargeId: charge.id,
          idempotencyKey,
          taxId,
        });
        if (cancelled) return;
        attemptRef.current = result.attemptId;
        setPix(result);
        if (onAttempt) onAttempt(result.attemptId);
      } catch (err) {
        if (cancelled) return;
        // The document is collected at checkout, not at registration, so the
        // first Pix a patient makes is where it is asked for.
        if (err.response?.data?.errorKey === 'PaymentTaxIdRequired' && onTaxIdRequired) {
          onTaxIdRequired();
          return;
        }
        setError(
          err.response?.data?.message || err.response?.data?.error || t('payments.pixError')
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    issue();

    return () => {
      cancelled = true;
      // Abandoning the panel must free the charge. Fire and forget: the customer
      // is already gone, and a failure here is recovered by the expiry sweep.
      if (attemptRef.current && !paidRef.current) {
        paymentService.cancelAttempt(attemptRef.current).catch(() => {});
      }
    };
  }, [charge.id, idempotencyKey, taxId, t, onAttempt, onTaxIdRequired]);

  const poll = useCallback(async () => {
    if (!attemptRef.current || paidRef.current) return;
    try {
      const state = await paymentService.getAttempt(attemptRef.current);
      if (state.chargePaid || state.status === 'captured') {
        paidRef.current = true;
        setPaid(true);
        if (onPaid) onPaid(state);
      }
    } catch {
      // A failed poll is not a failed payment; the next tick tries again.
    }
  }, [onPaid]);

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

  const handleCopy = async () => {
    if (!pix?.payload) return;
    try {
      await navigator.clipboard?.writeText(pix.payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(t('payments.pixCopyFailed'));
    }
  };

  if (loading) {
    return (
      <div className="pix-panel is-loading">
        <Sparkles size={20} className="spin-icon" />
        <span>{t('payments.pixGenerating')}</span>
      </div>
    );
  }

  if (error && !pix) {
    return (
      <div className="payment-outcome-alert error">
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="payment-outcome-alert success">
        <CheckCircle2 size={20} />
        <span>{t('payments.approved')}</span>
      </div>
    );
  }

  const expired = msLeft !== null && msLeft <= 0;

  return (
    <div className="pix-panel">
      {pix.encodedImage ? (
        <div className="pix-qr-frame">
          <img
            src={`data:image/png;base64,${pix.encodedImage}`}
            alt={t('payments.pixQrAlt')}
            className="pix-qr-image"
          />
        </div>
      ) : (
        <div className="pix-qr-frame is-placeholder">
          <QrCode size={40} />
          <span>{t('payments.pixUseCode')}</span>
        </div>
      )}

      <p className="pix-instructions">{t('payments.pixInstructions')}</p>

      <div className="pix-code-box">
        <code className="pix-code-value">{pix.payload}</code>
        <button type="button" className="btn-pix-copy" onClick={handleCopy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <span>{copied ? t('payments.pixCopied') : t('payments.pixCopy')}</span>
        </button>
      </div>

      <div className="pix-status-row">
        {expired ? (
          <span className="pix-expired">{t('payments.pixExpired')}</span>
        ) : (
          <>
            <Sparkles size={14} className="spin-icon" />
            <span>{t('payments.pixWaiting')}</span>
            {msLeft !== null && (
              <span className="pix-countdown">{formatCountdown(msLeft)}</span>
            )}
          </>
        )}
      </div>

      {error && <span className="field-error-msg">{error}</span>}
    </div>
  );
};
