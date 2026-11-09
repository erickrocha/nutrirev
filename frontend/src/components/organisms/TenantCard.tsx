import { Building, Check, CreditCard, MapPin, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { PATHS, editPath } from '../../router/routeConfig';
import { formatAddress } from '../../utils/address';
import type { Tenant } from '../../types/tenant';

interface Props {
  tenant: Tenant;
  active: boolean;
  onSelect: (tenant: Tenant) => void;
}

export const TenantCard = ({ tenant, active, onSelect }: Props) => {
  const { t } = useTranslation();
  const address = formatAddress(tenant);
  return (
    <article className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ${active ? 'border-[var(--accent-primary)] ring-2 ring-blue-100' : 'border-[var(--border-color)]'}`}>
      <header className="flex items-center justify-between p-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-[var(--accent-primary)]"><Building size={24} /></span>
        {active && <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-[2px] text-[.72rem] font-semibold text-emerald-700"><Check size={12} />{t('tenants.selected')}</span>}
      </header>
      <div className="flex flex-1 flex-col gap-1 px-4 pb-4 text-[.82rem] text-[var(--text-body)]">
        <h3 className="m-0 text-[1.05rem] text-[var(--text-heading)]">{tenant.name}</h3>
        <p className="m-0 break-all">UUID: {tenant.uuid || 'N/A'}</p>
        <p className="m-0">{t('tenants.dbId')}: #{tenant.id}</p>
        {tenant.email && <p className="m-0">{tenant.email}</p>}
        {tenant.phone && <p className="m-0">{tenant.phone}</p>}
        {address && <p className="m-0 flex items-start gap-1"><MapPin size={13} className="mt-[2px] shrink-0" />{address}</p>}
      </div>
      <footer className="flex flex-col gap-2 border-t border-slate-100 p-3">
        <Button variant={active ? 'primary' : 'outline'} onClick={() => onSelect(tenant)} disabled={active} className="justify-center">
          {active ? <><Check size={14} />{t('tenants.currentTenant')}</> : t('tenants.switchView')}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" to={editPath(PATHS.TENANTS, tenant.id)} className="flex-1 justify-center"><Pencil size={14} />{t('common.edit')}</Button>
          <Button variant="outline" to={PATHS.TENANT_PLAN.replace(':id', String(tenant.id))} className="flex-1 justify-center"><CreditCard size={14} />{t('tenants.managePlan')}</Button>
        </div>
      </footer>
    </article>
  );
};
