import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Building, Plus, RefreshCw, ShieldAlert } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { Button } from '../../components/atoms/Button';
import { TenantCard } from '../../components/organisms/TenantCard';
import { fetchTenants, setActiveTenant } from '../../store/tenantSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS, newPath } from '../../router/routeConfig';
import { ROLES } from '../../utils/enums';

export const TenantListPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { tenantsList, activeTenant, loading, error } = useAppSelector((state) => state.tenant);
  const user = useAppSelector((state) => state.auth.user);
  const isSysAdmin = user?.role === ROLES.SYS_ADMIN;

  const load = () => { dispatch(fetchTenants()); };
  useEffect(() => { if (isSysAdmin) dispatch(fetchTenants()); }, [dispatch, isSysAdmin]);

  if (!isSysAdmin) {
    return (
      <div role="alert" className="mx-auto mt-16 flex max-w-md flex-col items-center gap-2 text-center text-[var(--text-body)]">
        <ShieldAlert size={48} />
        <h3 className="m-0 text-[var(--text-heading)]">{t('tenants.restrictedAccess')}</h3>
        <p className="m-0">{t('tenants.sysAdminOnly')}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: t('tenants.title') }]} />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">{t('tenants.title')}</h2>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('tenants.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{t('common.refresh')}</Button>
          <Button to={newPath(PATHS.TENANTS)}><Plus size={18} />{t('tenants.newTenant')}</Button>
        </div>
      </header>

      {error !== null && <ErrorAlert message={error || t('tenants.errorLoadingTenants')} onRetry={load} />}

      {loading && tenantsList.length === 0 ? (
        <p role="status" className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-color)] bg-white p-10 text-[var(--text-body)]"><RefreshCw size={22} className="animate-spin" />{t('tenants.loadingTenants')}</p>
      ) : tenantsList.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-white p-10 text-center text-[var(--text-body)]">
          <Building size={36} />
          <p className="m-0">{t('tenants.noTenantsFound')}</p>
          <Button to={newPath(PATHS.TENANTS)}><Plus size={16} />{t('tenants.addFirstTenant')}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tenantsList.map((tenant) => (
            <TenantCard key={tenant.id} tenant={tenant} active={activeTenant?.id === tenant.id} onSelect={(selected) => dispatch(setActiveTenant(selected))} />
          ))}
        </div>
      )}
    </div>
  );
};
