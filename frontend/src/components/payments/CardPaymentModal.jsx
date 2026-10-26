import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Lock,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Wifi,
  Sparkles,
  QrCode,
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { PixPanel } from './PixPanel';

// Detect card brand based on prefix
const detectBrand = (number) => {
  const clean = number.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'MASTERCARD';
  if (/^3[47]/.test(clean)) return 'AMEX';
  if (/^(4011|438935|451416|4576|504175|5067|509|627780|636297|636368)/.test(clean)) return 'ELO';
  if (/^(606282|3841)/.test(clean)) return 'HIPERCARD';
  return 'CARD';
};

const formatCardNumber = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 19);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.substring(i, i + 4));
  }
  return parts.join(' ');
};

const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 6);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
};

const formatBRL = (cents) => {
  if (typeof cents !== 'number') return 'R$ 0,00';
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const CardPaymentModal = ({ isOpen, onClose, charge, onSuccess }) => {
  const { t } = useTranslation();

  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [securityCode, setSecurityCode] = useState('');

  const [validationErrors, setValidationErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [paymentOutcome, setPaymentOutcome] = useState(null); // { type: 'success' | 'uncertain' | 'error', message: string }
  const [method, setMethod] = useState('card');
  // Only offered when the charge came from a subscription: an ad-hoc charge the
  // clinic typed in has no cycle to make recurring.
  const [recurring, setRecurring] = useState(false);
  // Asked for only when the server says this patient has no document on file.
  // It is optional at registration precisely so someone who never pays through
  // the app is never asked, so checkout is where it first comes up.
  const [taxId, setTaxId] = useState('');
  const [needsTaxId, setNeedsTaxId] = useState(false);
  // What the clinic accepts. Until it loads, the card form shows — it is the
  // method every acquirer here supports.
  const [offered, setOffered] = useState({ credit: true, pix: false, recurring: false });

  // One key per checkout attempt, held across retries on purpose. Regenerating it
  // (which is what a timestamp did) makes a retry after a lost response look like a
  // brand new request: `prepare` misses on the key, then hits the reservation the
  // first call already made and refuses the charge -- permanently, since nothing
  // ever releases it. The key is cleared only after a definitive decline, where a
  // genuinely new attempt is what the customer is asking for.
  const idempotencyKeyRef = useRef(null);
  // Pix gets its own key: the two methods reserve separate attempts, and reusing
  // one key across them would be rejected as "same key, different request".
  const pixKeyRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    paymentService
      .getOfferedMethods()
      .then((methods) => {
        if (cancelled) return;
        setOffered(methods);
        // Landing on a method the clinic does not accept would offer a payment
        // that cannot be made.
        if (!methods.credit && methods.pix) setMethod('pix');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setCardholderName('');
      setCardNumber('');
      setExpiry('');
      setSecurityCode('');
      setValidationErrors({});
      setPaymentOutcome(null);
      setSubmitting(false);
      setMethod('card');
      setRecurring(false);
      setTaxId('');
      setNeedsTaxId(false);
      idempotencyKeyRef.current = null;
      pixKeyRef.current = null;
    }
  }, [isOpen, charge]);

  if (!isOpen || !charge) return null;

  const subscriptionId = charge.paymentDateId ?? charge.payment_date_id ?? null;
  const detectedBrand = detectBrand(cardNumber);

  // Stable for this checkout so a retry reuses the reservation instead of
  // colliding with it.
  // Re-mounting the panel with a document set is what makes it retry; without a
  // new key the reservation from the failed attempt would be reused.
  const handleTaxIdRequired = () => {
    setNeedsTaxId(true);
    setMethod('card');
  };

  const pixKey = () => {
    if (!pixKeyRef.current) {
      pixKeyRef.current = `pix-${charge.id}-${crypto.randomUUID()}`;
    }
    return pixKeyRef.current;
  };

  const validate = () => {
    const errors = {};
    const cleanNumber = cardNumber.replace(/\D/g, '');
    const cleanExpiry = expiry.split('/');
    const month = cleanExpiry.length > 0 ? parseInt(cleanExpiry[0], 10) : null;
    const yearRaw = cleanExpiry.length > 1 ? cleanExpiry[1] : '';
    const year = yearRaw.length === 2 ? parseInt(`20${yearRaw}`, 10) : parseInt(yearRaw, 10);
    const cleanCvv = securityCode.replace(/\D/g, '');

    if (!cardholderName.trim()) {
      errors.holder = t('payments.cardInvalidHolder');
    }

    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      errors.number = t('payments.cardInvalidNumber');
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    if (
      !month ||
      month < 1 ||
      month > 12 ||
      !year ||
      year < currentYear ||
      year > 2099 ||
      (year === currentYear && month < currentMonth)
    ) {
      errors.expiry = t('payments.cardInvalidExpiry');
    }

    if (cleanCvv.length < 3 || cleanCvv.length > 4) {
      errors.cvv = t('payments.cardInvalidCvv');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setPaymentOutcome(null);

    const cleanNumber = cardNumber.replace(/\D/g, '');
    const cleanExpiry = expiry.split('/');
    const month = parseInt(cleanExpiry[0], 10);
    const yearRaw = cleanExpiry[1];
    const year = yearRaw.length === 2 ? parseInt(`20${yearRaw}`, 10) : parseInt(yearRaw, 10);
    const cleanCvv = securityCode.replace(/\D/g, '');

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = `charge-${charge.id}-${crypto.randomUUID()}`;
    }
    const idempotencyKey = idempotencyKeyRef.current;

    try {
      // Step 1: Prepare attempt
      const attempt = await paymentService.prepare({
        chargeId: charge.id,
        idempotencyKey,
        method: 'credit',
        installments: 1,
      });

      const attemptId = attempt.attemptId || attempt.attempt_id;

      // Step 2: Authorize payment
      const result = await paymentService.authorize({
        attemptId,
        cardholderName: cardholderName.trim().toUpperCase(),
        cardNumber: cleanNumber,
        expirationMonth: month,
        expirationYear: year,
        securityCode: cleanCvv,
      });

      const isApproved = result.status === 'authorized' || result.status === 'captured';
      const isUncertain = result.status === 'unknown';

      if (isApproved) {
        // Saving the card comes after the payment, and its failure never fails
        // the payment: the charge is settled either way, and the customer is
        // told plainly that only the recurrence part did not take.
        let recurrenceFailed = false;
        if (recurring && subscriptionId) {
          try {
            await paymentService.enableRecurring({
              subscriptionId,
              cardholderName: cardholderName.trim().toUpperCase(),
              cardNumber: cleanNumber,
              expirationMonth: month,
              expirationYear: year,
              securityCode: cleanCvv,
              taxId,
            });
          } catch (err) {
            if (err.response?.data?.errorKey === 'PaymentTaxIdRequired') {
              setNeedsTaxId(true);
            }
            recurrenceFailed = true;
          }
        }
        setPaymentOutcome({
          type: recurrenceFailed ? 'uncertain' : 'success',
          message: recurrenceFailed
            ? t('payments.recurringFailed')
            : t('payments.approved'),
        });
        setTimeout(() => {
          if (onSuccess) onSuccess(result);
          onClose();
        }, 1500);
      } else if (isUncertain) {
        setPaymentOutcome({
          type: 'uncertain',
          message: t('payments.uncertain'),
        });
      } else {
        // Declined releases the reservation server-side, so retrying is a new
        // attempt and must not reuse the key.
        idempotencyKeyRef.current = null;
        setPaymentOutcome({
          type: 'error',
          message: t('payments.declined'),
        });
      }
    } catch (err) {
      console.error('Payment authorization failed:', err);
      if (err.response?.data?.errorKey === 'PaymentTaxIdRequired') {
        setNeedsTaxId(true);
        setPaymentOutcome(null);
        setSubmitting(false);
        return;
      }
      const serverMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        t('payments.declined');
      setPaymentOutcome({
        type: 'error',
        message: serverMessage,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card-payment-modal-backdrop" onClick={submitting ? undefined : onClose}>
      <div
        className="card-payment-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-modal-title"
      >
        {/* Modal Header */}
        <div className="modal-header-luxury">
          <div className="header-info">
            <h2 id="card-modal-title">
              <CreditCard size={20} /> {t('payments.cardTitle')}
            </h2>
            <p className="header-subtitle">{t('payments.cardSubtitle')}</p>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            disabled={submitting}
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Status / Outcome Alert */}
        {paymentOutcome && (
          <div className={`payment-outcome-alert ${paymentOutcome.type}`}>
            {paymentOutcome.type === 'success' && <CheckCircle2 size={20} />}
            {paymentOutcome.type === 'uncertain' && <AlertCircle size={20} />}
            {paymentOutcome.type === 'error' && <AlertCircle size={20} />}
            <span>{paymentOutcome.message}</span>
          </div>
        )}

        {/* Payment method. Only shown when there is a choice to make. */}
        {offered.credit && offered.pix && (
        <div className="payment-method-switch" role="tablist" aria-label={t('payments.methodLabel')}>
          <button
            type="button"
            role="tab"
            aria-selected={method === 'card'}
            className={`method-tab ${method === 'card' ? 'is-active' : ''}`}
            onClick={() => setMethod('card')}
            disabled={submitting}
          >
            <CreditCard size={16} />
            <span>{t('payments.methodCard')}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={method === 'pix'}
            className={`method-tab ${method === 'pix' ? 'is-active' : ''}`}
            onClick={() => setMethod('pix')}
            disabled={submitting}
          >
            <QrCode size={16} />
            <span>{t('payments.methodPix')}</span>
          </button>
        </div>
        )}

        {!offered.credit && !offered.pix && (
          <div className="payment-outcome-alert error">
            <AlertCircle size={20} />
            <span>{t('payments.noMethodsOffered')}</span>
          </div>
        )}

        {method === 'card' && offered.credit && (
        <>
        {/* Visual Credit Card Preview */}
        <div className="credit-card-preview">
          <div className="card-top-row">
            <div className="chip-and-contactless">
              <div className="card-emv-chip" />
              <Wifi size={18} className="contactless-icon" />
            </div>
            <div className="card-brand-badge">{detectedBrand}</div>
          </div>

          <div className="card-number-display">
            {cardNumber || '•••• •••• •••• ••••'}
          </div>

          <div className="card-bottom-row">
            <div className="card-holder-info">
              <span className="card-field-label">{t('payments.cardHolder')}</span>
              <span className="card-field-value">
                {cardholderName.toUpperCase() || 'NOME NO CARTÃO'}
              </span>
            </div>
            <div className="card-expiry-info">
              <span className="card-field-label">{t('payments.cardExpiry')}</span>
              <span className="card-field-value">{expiry || 'MM/AA'}</span>
            </div>
          </div>
        </div>

        {/* Charge Summary Pill */}
        <div className="charge-summary-box">
          <div className="summary-col">
            <span className="summary-label">{t('payments.cycle', { sequence: charge.sequence || 1 })}</span>
            <span className="summary-sub">{t('payments.dueDate', { date: charge.dueDate })}</span>
          </div>
          <div className="summary-amount">
            <span className="amount-label">{t('payments.amount')}</span>
            <span className="amount-val">{formatBRL(charge.amountCents)}</span>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="card-payment-form">
          {/* Cardholder Name */}
          <div className="form-group-custom">
            <label htmlFor="card-holder-input">
              {t('payments.cardHolder')} <span className="req">*</span>
            </label>
            <input
              id="card-holder-input"
              type="text"
              value={cardholderName}
              onChange={(e) => {
                setCardholderName(e.target.value.toUpperCase());
                if (validationErrors.holder) {
                  setValidationErrors((prev) => ({ ...prev, holder: null }));
                }
              }}
              placeholder={t('payments.cardHolderPlaceholder')}
              disabled={submitting}
              autoComplete="cc-name"
              required
            />
            {validationErrors.holder && (
              <span className="field-error-msg">{validationErrors.holder}</span>
            )}
          </div>

          {/* Card Number */}
          <div className="form-group-custom">
            <label htmlFor="card-number-input">
              {t('payments.cardNumber')} <span className="req">*</span>
            </label>
            <div className="input-with-icon">
              <input
                id="card-number-input"
                type="text"
                value={cardNumber}
                onChange={(e) => {
                  setCardNumber(formatCardNumber(e.target.value));
                  if (validationErrors.number) {
                    setValidationErrors((prev) => ({ ...prev, number: null }));
                  }
                }}
                placeholder={t('payments.cardNumberPlaceholder')}
                disabled={submitting}
                maxLength={23}
                autoComplete="cc-number"
                required
              />
              <CreditCard size={18} className="input-icon-right" />
            </div>
            {validationErrors.number && (
              <span className="field-error-msg">{validationErrors.number}</span>
            )}
          </div>

          {/* Expiry & CVV */}
          <div className="form-row-dual">
            <div className="form-group-custom">
              <label htmlFor="card-expiry-input">
                {t('payments.cardExpiry')} <span className="req">*</span>
              </label>
              <input
                id="card-expiry-input"
                type="text"
                value={expiry}
                onChange={(e) => {
                  setExpiry(formatExpiry(e.target.value));
                  if (validationErrors.expiry) {
                    setValidationErrors((prev) => ({ ...prev, expiry: null }));
                  }
                }}
                placeholder={t('payments.cardExpiryPlaceholder')}
                disabled={submitting}
                maxLength={7}
                autoComplete="cc-exp"
                required
              />
              {validationErrors.expiry && (
                <span className="field-error-msg">{validationErrors.expiry}</span>
              )}
            </div>

            <div className="form-group-custom">
              <label htmlFor="card-cvv-input">
                {t('payments.cardCvv')} <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <input
                  id="card-cvv-input"
                  type="password"
                  value={securityCode}
                  onChange={(e) => {
                    setSecurityCode(e.target.value.replace(/\D/g, '').slice(0, 4));
                    if (validationErrors.cvv) {
                      setValidationErrors((prev) => ({ ...prev, cvv: null }));
                    }
                  }}
                  placeholder={t('payments.cardCvvPlaceholder')}
                  disabled={submitting}
                  maxLength={4}
                  autoComplete="cc-csc"
                  required
                />
                <Lock size={16} className="input-icon-right" />
              </div>
              {validationErrors.cvv && (
                <span className="field-error-msg">{validationErrors.cvv}</span>
              )}
            </div>
          </div>

          {needsTaxId && (
            <div className="form-group-custom">
              <label htmlFor="tax-id-input">
                {t('payments.taxId')} <span className="req">*</span>
              </label>
              <input
                id="tax-id-input"
                type="text"
                inputMode="numeric"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder={t('payments.taxIdPlaceholder')}
                disabled={submitting}
                maxLength={18}
              />
              <span className="field-error-msg">{t('payments.taxIdRequired')}</span>
            </div>
          )}

          {subscriptionId && offered.recurring && (
            <label className="recurring-consent-box">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                disabled={submitting}
              />
              <span className="recurring-consent-text">
                <strong>{t('payments.recurringLabel')}</strong>
                <small>{t('payments.recurringHint')}</small>
              </span>
            </label>
          )}

          {/* Security Notice */}
          <div className="security-notice-box">
            <ShieldCheck size={16} />
            <span>{t('payments.securePaymentNotice')}</span>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions-luxury">
            <button
              type="button"
              className="btn-luxury-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn-luxury-primary"
              disabled={submitting || paymentOutcome?.type === 'success'}
            >
              {submitting ? (
                <>
                  <Sparkles size={16} className="spin-icon" />
                  <span>{t('payments.processingPayment')}</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>{t('payments.confirmButton')}</span>
                </>
              )}
            </button>
          </div>
        </form>
        </>
        )}

        {method === 'pix' && offered.pix && (
          <PixPanel
            charge={charge}
            idempotencyKey={pixKey()}
            taxId={taxId}
            onTaxIdRequired={handleTaxIdRequired}
            onPaid={() => {
              setPaymentOutcome({ type: 'success', message: t('payments.approved') });
              setTimeout(() => {
                if (onSuccess) onSuccess({ status: 'captured' });
                onClose();
              }, 1500);
            }}
          />
        )}
      </div>
    </div>
  );
};
