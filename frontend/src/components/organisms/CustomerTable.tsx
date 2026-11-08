import { Edit2, FileText, Mail, MapPin, Phone, Smartphone, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { PATHS, editPath } from '../../router/routeConfig';
import { birthOf, formatAddress, formatBirthDate, isMobileEnabled, mealIdOf, phoneLabel } from '../../utils/customerView';
import type { Customer } from '../../types/customer';

interface Props {
  customers: Customer[];
  planName: (customer: Customer) => string;
  mealName: (customer: Customer) => string | null;
  language: string | undefined;
  mode?: 'manage' | 'summary';
  onEnableMobile?: (customer: Customer) => void;
}

export const CustomerTable = ({ customers, planName, mealName, language, mode = 'manage', onEnableMobile }: Props) => {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)] bg-white">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--border-color)] bg-slate-50 text-[.8rem] text-[var(--text-body)]">
            {['customers.customer', 'customers.contact', 'customers.location', 'customers.genderAge', 'customers.planMeal'].map((key) => <th key={key} className="px-4 py-3">{t(key)}</th>)}
            <th className="px-4 py-3 text-right">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => {
            const birth = birthOf(customer);
            const mobile = isMobileEnabled(customer);
            return (
              <tr key={customer.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                <td className="px-4 py-3"><div className="flex flex-col"><span className="font-semibold">{customer.name}</span><span className="text-[.78rem] text-slate-500">ID #{customer.id}</span></div></td>
                <td className="px-4 py-3 text-[.85rem]">
                  <span className="flex items-center gap-[6px]"><Mail size={12} className="text-[var(--accent-primary)]" />{customer.email}</span>
                  <span className="flex items-center gap-[6px] text-slate-500"><Phone size={12} />{phoneLabel(customer.phone)}</span>
                </td>
                <td className="px-4 py-3 text-[.85rem]"><span className="inline-flex items-center gap-1"><MapPin size={12} className="text-slate-400" />{formatAddress(customer, t('common.notAvailable'))}</span></td>
                <td className="px-4 py-3 text-[.85rem]">
                  <span className="rounded-md bg-slate-100 px-2 py-[2px]">{customer.gender}</span>
                  {birth && <span className="ml-[6px] text-[.8rem] text-slate-500">({formatBirthDate(birth, language)})</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-[2px] text-[.8rem] text-[var(--accent-primary)]"><FileText size={12} />{planName(customer)}</span>
                  {mealIdOf(customer) !== null && <span className="block text-[.78rem] text-[var(--text-body)]">{t('customers.meal')}: {mealName(customer)}</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  {mode === 'summary' ? (
                    <Button variant="outline" to={PATHS.CUSTOMERS}><UserCheck size={15} />{t('tenantDashboard.viewPatient')}</Button>
                  ) : (
                    <div className="inline-flex items-center justify-end gap-2">
                      <Button variant="outline" to={editPath(PATHS.CUSTOMERS, customer.id)} title={t('customers.editCustomer')} aria-label={t('customers.editCustomer')}><Edit2 size={16} /></Button>
                      {mobile ? (
                        <span className="inline-flex items-center gap-[6px] rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-[5px] text-[.78rem] font-semibold text-emerald-700" title={t('customers.mobileAppActiveTitle')}><Smartphone size={14} />{t('customers.mobileActive')}</span>
                      ) : onEnableMobile && (
                        <Button variant="outline" onClick={() => onEnableMobile(customer)} title={t('customers.enableMobileAccess')} aria-label={t('customers.enableMobileAccess')}><Smartphone size={16} /></Button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
