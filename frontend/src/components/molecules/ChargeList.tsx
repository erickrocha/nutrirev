import { Receipt } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PaymentCharge } from '../../types/clinical';
import { formatCents, formatIsoDate } from '../../utils/date';

const LABEL_KEYS: Record<string, string> = { open: 'chargeOpen', overdue: 'chargeOverdue', paid: 'chargePaid', cancelled: 'chargeCancelled' };
const COLORS: Record<string, string> = { paid: 'text-emerald-600', overdue: 'text-red-500', cancelled: 'text-slate-500' };

export const ChargeList = ({ charges }: { charges: PaymentCharge[] }) => {
  const { t } = useTranslation();
  if (charges.length === 0) return <span className="text-[.85rem] text-slate-500">{t('paymentDates.noCharges')}</span>;
  return (
    <ul className="m-0 flex list-none flex-col gap-[6px] p-0 text-[.85rem]">
      {charges.map((charge, index) => (
        <li key={charge.id ?? index} className="flex items-center gap-3">
          <Receipt size={14} className="text-[var(--accent-primary)]" />
          <span className="min-w-[90px]">{formatIsoDate(charge.dueDate)}</span>
          <span className="min-w-[90px] font-semibold">R$ {formatCents(charge.amountCents)}</span>
          <span className={`font-semibold ${COLORS[charge.status] ?? 'text-amber-500'}`}>
            {LABEL_KEYS[charge.status] ? t(`paymentDates.${LABEL_KEYS[charge.status]}`) : charge.status}
          </span>
        </li>
      ))}
    </ul>
  );
};
