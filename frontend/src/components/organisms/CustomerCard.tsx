import { Calendar, Edit2, FileText, Mail, MapPin, Phone, Smartphone, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { PATHS, editPath } from '../../router/routeConfig';
import { birthOf, formatAddress, formatBirthDate, isMobileEnabled, mealIdOf, phoneLabel, photoOf, planIdOf } from '../../utils/customerView';
import type { Customer } from '../../types/customer';

interface Props {
  customer: Customer;
  planName: string;
  mealName: string | null;
  language: string | undefined;
  /** `summary`: usado no painel, só leva ao cadastro; `manage`: edita e libera o acesso mobile. */
  mode?: 'manage' | 'summary';
  onEnableMobile?: (customer: Customer) => void;
}

export const CustomerCard = ({ customer, planName, mealName, language, mode = 'manage', onEnableMobile }: Props) => {
  const { t } = useTranslation();
  const photo = photoOf(customer);
  const birth = birthOf(customer);
  const mobile = isMobileEnabled(customer);
  const hasMeal = mealIdOf(customer) !== null;
  const showClinical = mode === 'manage' || planIdOf(customer) !== null || hasMeal;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-slate-100 p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 font-semibold text-[var(--accent-primary)]">
          {photo ? <img src={photo} alt={customer.name} className="h-full w-full object-cover" /> : (customer.name || 'P')[0].toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 truncate text-[1rem] text-[var(--text-heading)]" title={customer.name}>{customer.name}</h3>
          <span className="text-[.75rem] text-slate-500">ID #{customer.id}</span>
        </div>
        {mobile ? (
          <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-[2px] text-[.72rem] font-semibold text-emerald-700" title={t('customers.mobileActiveTitle')}><Smartphone size={12} />Mobile</span>
        ) : (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-[2px] text-[.72rem] font-semibold text-amber-700" title={t('customers.noMobileTitle')}>{t('customers.pending')}</span>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-2 p-4 text-[.85rem] text-[var(--text-body)]">
        <p className="m-0 flex items-center gap-2"><Mail size={14} className="shrink-0 text-amber-500" /><span className="truncate">{customer.email || t('customers.noEmail')}</span></p>
        <p className="m-0 flex items-center gap-2"><Phone size={14} className="shrink-0" />{phoneLabel(customer.phone)}</p>
        <p className="m-0 flex items-start gap-2"><MapPin size={14} className="mt-[2px] shrink-0" />{formatAddress(customer, t('common.notAvailable'))}</p>
        <div className="flex flex-wrap gap-2">
          {customer.gender && <span className="rounded-md bg-slate-100 px-2 py-[2px] text-[.75rem]">{customer.gender}</span>}
          {birth && <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-[2px] text-[.75rem]"><Calendar size={12} />{formatBirthDate(birth, language)}</span>}
        </div>
        {showClinical && <div className="mt-1 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="m-0 flex items-center gap-2 font-semibold text-[var(--text-heading)]"><FileText size={14} className="text-amber-500" />{planName}</p>
          {hasMeal && <span className="text-[.78rem]">{t('customers.meal')}: {mealName}</span>}
        </div>}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 p-3">
        {mode === 'summary' ? (
          <Button variant="outline" to={PATHS.CUSTOMERS} className="w-full justify-center"><UserCheck size={15} />{t('tenantDashboard.viewPatient')}</Button>
        ) : (
          <>
            <Button variant="outline" to={editPath(PATHS.CUSTOMERS, customer.id)}><Edit2 size={15} />{t('common.edit')}</Button>
            {!mobile && onEnableMobile && <Button variant="outline" onClick={() => onEnableMobile(customer)}><Smartphone size={15} />{t('customers.activateMobile')}</Button>}
          </>
        )}
      </footer>
    </article>
  );
};
