import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PaymentReversal } from '../../types/clinical';

const MAX_SHOWN = 5;

export const ReversalAlert = ({ reversals }: { reversals: PaymentReversal[] }) => {
  const { t } = useTranslation();
  if (reversals.length === 0) return null;
  return (
    <section role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
      <h3 className="m-0 flex items-center gap-2 text-[.95rem]"><AlertTriangle size={18} />{t('paymentDates.reversalsTitle', { count: reversals.length })}</h3>
      <p className="mx-0 mb-2 mt-1 text-[.85rem]">{t('paymentDates.reversalsHint')}</p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[.85rem]">
        {reversals.slice(0, MAX_SHOWN).map((row) => (
          <li key={row.attemptId} className="flex flex-wrap gap-x-4">
            <span className="font-semibold">{row.customerName}</span>
            <span>{`R$ ${(row.amountCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
            <span>{t('paymentDates.reversalOn', { date: new Date(row.reversedAt).toLocaleDateString('pt-BR') })}</span>
          </li>
        ))}
      </ul>
      {reversals.length > MAX_SHOWN && <p className="mx-0 mb-0 mt-2 text-[.85rem]">{t('paymentDates.reversalsMore', { count: reversals.length - MAX_SHOWN })}</p>}
    </section>
  );
};
