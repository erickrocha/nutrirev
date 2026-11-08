import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowUpRight, Calendar, CheckCircle2, ChevronRight, Clock, CreditCard, Receipt, RotateCcw } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { Button } from '../../components/atoms/Button';
import { CardPaymentModal } from '../../components/payments/CardPaymentModal';
import { fetchMyCharges } from '../../store/paymentSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { daysUntil, formatBRL } from '../../utils/card';
import { formatIsoDate } from '../../utils/date';
import type { MyCharge } from '../../types/payment';

const SUCCESS_BANNER_MS = 6000;
const isPayable = (charge: MyCharge) => charge.status === 'open' || charge.status === 'overdue';

export const CustomerPaymentsPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { charges, loading, error } = useAppSelector((state) => state.payment);
  const [success, setSuccess] = useState<string | null>(null);
  const [selected, setSelected] = useState<MyCharge | null>(null);

  const load = useCallback(() => { dispatch(fetchMyCharges()); }, [dispatch]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(null), SUCCESS_BANNER_MS);
    return () => clearTimeout(timer);
  }, [success]);

  // A próxima a vencer é a cobrança em aberto mais antiga.
  const nextUnpaid = useMemo(
    () => charges.filter(isPayable).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))[0] ?? null,
    [charges],
  );

  const isOverdue = (charge: MyCharge) => charge.status === 'overdue' || (isPayable(charge) && (daysUntil(charge.dueDate) ?? 0) < 0);
  const dueLabel = (charge: MyCharge): string => {
    const days = daysUntil(charge.dueDate);
    if (days === null) return formatIsoDate(charge.dueDate);
    if (charge.status === 'overdue' || days < 0) return t(Math.abs(days) === 1 ? 'payments.overdueByDay' : 'payments.overdueByDays', { count: Math.abs(days) });
    if (days === 0) return t('payments.dueToday');
    return t(days === 1 ? 'payments.dueInDay' : 'payments.dueInDays', { count: days });
  };

  const statusBadge = (status: string) => {
    const tone: Record<string, [string, string, typeof Clock | null]> = {
      paid: ['bg-emerald-100 text-emerald-700', 'payments.statusPaid', CheckCircle2],
      overdue: ['bg-red-100 text-red-700', 'payments.statusOverdue', AlertCircle],
      cancelled: ['bg-slate-100 text-slate-600', 'payments.statusCancelled', null],
    };
    const [classes, key, Icon] = tone[status] ?? ['bg-amber-100 text-amber-700', 'payments.statusOpen', Clock];
    return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[.75rem] font-semibold ${classes}`}>{Icon && <Icon size={13} />}{t(key)}</span>;
  };

  return (
    <div className="mx-auto w-full max-w-[900px] pb-10">
      <Breadcrumb items={[{ label: t('payments.title') }]} />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">{t('payments.title')}</h1>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('payments.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} title={t('common.refresh')}><RotateCcw size={16} className={loading ? 'animate-spin' : ''} />{t('common.refresh')}</Button>
      </header>

      {success && <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[.88rem] text-emerald-700"><CheckCircle2 size={18} />{success}</div>}
      {error && <ErrorAlert message={t('payments.errorLoading')} onRetry={load} />}

      {loading && charges.length === 0 ? (
        <p role="status" className="p-10 text-center text-[var(--text-body)]">{t('common.loading')}</p>
      ) : (
        <>
          {nextUnpaid && (
            <section className={`mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6 text-white shadow-md ${isOverdue(nextUnpaid) ? 'bg-gradient-to-br from-red-600 to-red-500' : 'bg-gradient-to-br from-[var(--accent-primary)] to-blue-500'}`}>
              <div>
                <span className="flex items-center gap-1 text-[.78rem] font-semibold uppercase opacity-90"><CreditCard size={14} />{t('payments.nextDue')}</span>
                <div className="my-1 flex items-baseline gap-3">
                  <span className="text-[2rem] font-bold">{formatBRL(nextUnpaid.amountCents)}</span>
                  <span className="text-[.82rem] opacity-90">{t('payments.cycle', { sequence: nextUnpaid.sequence || 1 })}</span>
                </div>
                <span className="flex items-center gap-2 text-[.88rem]"><Calendar size={15} />{dueLabel(nextUnpaid)}<span>·</span><span className="opacity-90">{formatIsoDate(nextUnpaid.dueDate)}</span></span>
              </div>
              <button type="button" onClick={() => setSelected(nextUnpaid)} className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-100">
                <CreditCard size={18} />{t('payments.payButton')}<ArrowUpRight size={18} />
              </button>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="m-0 flex items-center gap-2 text-[1.05rem]"><Receipt size={18} />{t('payments.sectionTitle')}</h3>
              <span className="rounded-full bg-slate-100 px-3 py-[2px] text-[.78rem] font-semibold">{charges.length} {t(charges.length === 1 ? 'payments.invoice' : 'payments.invoices')}</span>
            </div>
            {charges.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-white p-10 text-center text-[var(--text-body)]"><Receipt size={40} /><h3 className="m-0">{t('payments.emptyMessage')}</h3></div>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {charges.map((charge) => {
                  const payable = isPayable(charge);
                  const overdue = isOverdue(charge);
                  const Icon = charge.status === 'paid' ? CheckCircle2 : overdue ? AlertCircle : Clock;
                  return (
                    <li key={charge.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 ${overdue ? 'border-red-300' : 'border-[var(--border-color)]'} ${charge.status === 'paid' ? 'opacity-80' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${charge.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : overdue ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}><Icon size={20} /></span>
                        <div className="flex flex-col gap-1">
                          <span className="flex flex-wrap items-center gap-2 font-semibold">{t('payments.cycle', { sequence: charge.sequence || 1 })}{statusBadge(charge.status)}</span>
                          <span className="flex flex-wrap items-center gap-1 text-[.8rem] text-[var(--text-body)]">
                            <Calendar size={13} />{t('payments.dueDate', { date: formatIsoDate(charge.dueDate) })}
                            {charge.paidAt && <span>· {t('payments.paidOn', { date: formatIsoDate(charge.paidAt) })}</span>}
                            {payable && <span className={overdue ? 'font-semibold text-red-600' : ''}>· {dueLabel(charge)}</span>}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[1.05rem] font-semibold">{formatBRL(charge.amountCents)}</span>
                        {payable && <Button onClick={() => setSelected(charge)} title={t('payments.payButton')}>{t('payments.payCharge')}<ChevronRight size={15} /></Button>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      <CardPaymentModal isOpen={selected !== null} charge={selected} onClose={() => setSelected(null)} onSuccess={() => { setSuccess(t('payments.approved')); load(); }} />
    </div>
  );
};
