import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Receipt,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { CardPaymentModal } from '../../components/payments/CardPaymentModal';

const formatBRL = (cents) => {
  if (typeof cents !== 'number') return 'R$ 0,00';
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (isoDate) => {
  if (!isoDate) return '—';
  const parts = isoDate.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
};

const getDaysUntilDue = (dueDateStr) => {
  if (!dueDateStr) return null;
  const parts = dueDateStr.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  const due = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const today = new Date();
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffTime = due.getTime() - todayNorm.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

export const CustomerPaymentsPage = () => {
  const { t } = useTranslation();

  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  // Selected charge for modal payment
  const [selectedCharge, setSelectedCharge] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadCharges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await paymentService.getMyCharges();
      // Ensure array
      const list = Array.isArray(data) ? data : [];
      setCharges(list);
    } catch (err) {
      console.error('Error fetching billing charges:', err);
      setError(t('payments.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadCharges();
  }, [loadCharges]);

  // Next due charge: the oldest unpaid charge (open or overdue)
  const nextUnpaid = useMemo(() => {
    const unpaid = charges
      .filter((c) => c.status === 'open' || c.status === 'overdue')
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    return unpaid.length > 0 ? unpaid[0] : null;
  }, [charges]);

  const handleOpenPayment = (charge) => {
    setSelectedCharge(charge);
    setModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setSuccessBanner(t('payments.approved'));
    loadCharges();
    setTimeout(() => {
      setSuccessBanner(null);
    }, 6000);
  };

  const renderDueLabel = (charge) => {
    const days = getDaysUntilDue(charge.dueDate);
    const isOverdue = charge.status === 'overdue' || (days !== null && days < 0);

    if (days === null) return formatDate(charge.dueDate);

    if (isOverdue) {
      const absDays = Math.abs(days);
      return absDays === 1
        ? t('payments.overdueByDay', { count: absDays })
        : t('payments.overdueByDays', { count: absDays });
    }

    if (days === 0) {
      return t('payments.dueToday');
    }

    return days === 1
      ? t('payments.dueInDay', { count: days })
      : t('payments.dueInDays', { count: days });
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="charge-badge status-paid">
            <CheckCircle2 size={13} /> {t('payments.statusPaid')}
          </span>
        );
      case 'overdue':
        return (
          <span className="charge-badge status-overdue">
            <AlertCircle size={13} /> {t('payments.statusOverdue')}
          </span>
        );
      case 'cancelled':
        return (
          <span className="charge-badge status-cancelled">
            {t('payments.statusCancelled')}
          </span>
        );
      case 'open':
      default:
        return (
          <span className="charge-badge status-open">
            <Clock size={13} /> {t('payments.statusOpen')}
          </span>
        );
    }
  };

  return (
    <div className="customer-payments-page">
      {/* Page Header */}
      <div className="form-page-header">
        <div>
          <h1>
            {t('payments.title')}
            <span>{t('payments.subtitle')}</span>
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-luxury-refresh"
            onClick={loadCharges}
            disabled={loading}
            title={t('common.refresh')}
          >
            <RotateCcw size={16} className={loading ? 'spin-icon' : ''} />
            <span>{t('common.refresh')}</span>
          </button>

          <span className="badge-luxury">
            <Sparkles size={14} /> NutriRev
          </span>
        </div>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="customer-success-banner">
          <CheckCircle2 size={18} />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="customer-error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            type="button"
            className="btn-inline-retry"
            onClick={loadCharges}
          >
            {t('payments.retry')}
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && charges.length === 0 ? (
        <div className="customer-loading-state" style={{ marginTop: '3rem' }}>
          <Sparkles size={36} />
          <p>{t('common.loading')}</p>
        </div>
      ) : (
        <>
          {/* Next Due Hero Card */}
          {nextUnpaid && (
            <div className={`next-due-hero-card ${nextUnpaid.status === 'overdue' || (getDaysUntilDue(nextUnpaid.dueDate) || 0) < 0 ? 'is-overdue' : ''}`}>
              <div className="hero-card-glow" />
              <div className="hero-card-content">
                <div className="hero-card-left">
                  <div className="hero-header-pill">
                    <CreditCard size={14} />
                    <span>{t('payments.nextDue')}</span>
                  </div>

                  <div className="hero-amount-group">
                    <span className="hero-amount-val">{formatBRL(nextUnpaid.amountCents)}</span>
                    <span className="hero-cycle-tag">{t('payments.cycle', { sequence: nextUnpaid.sequence || 1 })}</span>
                  </div>

                  <div className="hero-due-status">
                    <Calendar size={15} />
                    <span>{renderDueLabel(nextUnpaid)}</span>
                    <span className="hero-date-dot">·</span>
                    <span className="hero-date-raw">{formatDate(nextUnpaid.dueDate)}</span>
                  </div>
                </div>

                <div className="hero-card-right">
                  <button
                    type="button"
                    className="btn-pay-hero"
                    onClick={() => handleOpenPayment(nextUnpaid)}
                  >
                    <CreditCard size={18} />
                    <span>{t('payments.payButton')}</span>
                    <ArrowUpRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Charges List Section */}
          <div className="payments-charges-section">
            <div className="section-header-row">
              <h3 className="customer-section-title">
                <Receipt size={18} /> {t('payments.sectionTitle')}
              </h3>
              <span className="section-count-badge">
                {charges.length} {charges.length === 1 ? 'fatura' : 'faturas'}
              </span>
            </div>

            {charges.length === 0 ? (
              <div className="customer-empty-state">
                <Receipt size={40} />
                <h3>{t('payments.emptyMessage')}</h3>
              </div>
            ) : (
              <div className="charges-cards-list">
                {charges.map((charge) => {
                  const isPayable = charge.status === 'open' || charge.status === 'overdue';
                  const isPaid = charge.status === 'paid';
                  const isOverdue = charge.status === 'overdue' || (isPayable && (getDaysUntilDue(charge.dueDate) || 0) < 0);

                  return (
                    <div
                      key={charge.id}
                      className={`charge-card-item ${isOverdue ? 'item-overdue' : ''} ${isPaid ? 'item-paid' : ''}`}
                    >
                      <div className="charge-item-left">
                        <div className={`charge-icon-bubble ${charge.status}`}>
                          {isPaid && <CheckCircle2 size={20} />}
                          {isOverdue && <AlertCircle size={20} />}
                          {!isPaid && !isOverdue && <Clock size={20} />}
                        </div>

                        <div className="charge-details">
                          <div className="charge-title-row">
                            <span className="charge-sequence-title">
                              {t('payments.cycle', { sequence: charge.sequence || 1 })}
                            </span>
                            {renderStatusBadge(charge.status)}
                          </div>

                          <div className="charge-meta-row">
                            <span className="meta-date">
                              <Calendar size={13} />
                              {t('payments.dueDate', { date: formatDate(charge.dueDate) })}
                            </span>
                            {charge.paidAt && (
                              <span className="meta-paid-at">
                                · {t('payments.paidOn', { date: formatDate(charge.paidAt) })}
                              </span>
                            )}
                            {isPayable && (
                              <span className={`meta-due-relative ${isOverdue ? 'overdue-text' : ''}`}>
                                · {renderDueLabel(charge)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="charge-item-right">
                        <div className="charge-amount-block">
                          <span className="charge-amount">{formatBRL(charge.amountCents)}</span>
                        </div>

                        {isPayable && (
                          <button
                            type="button"
                            className="btn-charge-pay"
                            onClick={() => handleOpenPayment(charge)}
                            title={t('payments.payButton')}
                          >
                            <span>{t('payments.payCharge')}</span>
                            <ChevronRight size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Credit Card Payment Modal */}
      <CardPaymentModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedCharge(null);
        }}
        charge={selectedCharge}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};
