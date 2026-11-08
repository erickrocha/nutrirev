import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building, ClipboardCheck, FileText, LayoutGrid, List, RefreshCw, Smartphone, Stethoscope, UserCheck, Users } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { MetricCard } from '../../components/molecules/MetricCard';
import { ViewToggle } from '../../components/molecules/ViewToggle';
import { Button } from '../../components/atoms/Button';
import { CustomerCard } from '../../components/organisms/CustomerCard';
import { CustomerTable } from '../../components/organisms/CustomerTable';
import { loadTenantDashboard } from '../../store/dashboardSlice';
import { fetchTenants, setActiveTenant } from '../../store/tenantSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { mealIdOf, planIdOf } from '../../utils/customerView';
import { ROLES } from '../../utils/enums';
import type { Customer } from '../../types/customer';

type DisplayView = 'cards' | 'table';

export const TenantDashboardPage = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { activeTenant, tenantsList, loading: tenantsLoading } = useAppSelector((state) => state.tenant);
  const { tenant: dashboard, plans, meals, tenantLoading, tenantError } = useAppSelector((state) => state.dashboard);
  const isSysAdmin = user?.role === ROLES.SYS_ADMIN;
  const [view, setView] = useState<DisplayView>('cards');

  useEffect(() => { if (isSysAdmin && tenantsList.length === 0) dispatch(fetchTenants()); }, [dispatch, isSysAdmin, tenantsList.length]);
  useEffect(() => {
    if (!isSysAdmin || activeTenant || tenantsList.length === 0) return;
    dispatch(setActiveTenant(tenantsList[0]));
  }, [activeTenant, dispatch, isSysAdmin, tenantsList]);

  // O operador precisa de uma clínica escolhida; para a equipe da clínica o servidor já sabe qual é.
  const tenantId = isSysAdmin ? activeTenant?.id : undefined;
  const waiting = isSysAdmin && !tenantId;
  const load = () => { if (!waiting) dispatch(loadTenantDashboard(tenantId)); };
  useEffect(() => { if (!(isSysAdmin && !tenantId)) dispatch(loadTenantDashboard(tenantId)); }, [dispatch, isSysAdmin, tenantId]);

  const planName = (customer: Customer) => plans.find((plan) => plan.id === planIdOf(customer))?.name ?? t('common.noPlan');
  const mealName = (customer: Customer) => meals.find((meal) => meal.id === mealIdOf(customer))?.name ?? t('common.notAvailable');
  const totals = dashboard?.totals ?? {};
  const recent = useMemo(() => dashboard?.recentCustomers ?? [], [dashboard]);
  const loading = tenantLoading || (waiting && tenantsLoading);
  const dash = '—';

  return (
    <div className="mx-auto w-full max-w-[1200px] pb-12">
      <Breadcrumb items={[{ label: t('tenantDashboard.title') }]} />
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h2 className="m-0 mb-1 text-[1.65rem] font-medium text-[var(--text-heading)]">{t('tenantDashboard.title')}</h2>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('tenantDashboard.subtitle', { tenant: activeTenant?.name || t('tenantDashboard.yourTenant') })}</p>
        </div>
        <div className="flex items-center gap-3">
          {isSysAdmin && (
            <label className="flex items-center gap-2 text-[.85rem] font-semibold text-slate-600">
              <Building size={17} className="text-[var(--accent-primary)]" />
              <select
                aria-label={t('paymentSettings.supportingClinic')} value={activeTenant?.id || ''}
                onChange={(event) => { const tenant = tenantsList.find((item) => item.id === Number(event.target.value)); if (tenant) dispatch(setActiveTenant(tenant)); }}
                className="rounded-lg border border-[var(--border-color)] bg-white px-3 py-2 text-[var(--text-heading)] hover:border-[var(--accent-primary)]"
              >
                {tenantsList.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
              </select>
            </label>
          )}
          <Button variant="outline" onClick={load} disabled={loading} title={t('common.refresh')} aria-label={t('common.refresh')}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></Button>
        </div>
      </header>

      {tenantError !== null && <ErrorAlert message={tenantError || t('tenantDashboard.loadError')} onRetry={load} />}
      {isSysAdmin && !activeTenant && !tenantsLoading && (
        <div role="status" className="mb-6 flex flex-col items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-white p-6 text-center text-[var(--text-body)]"><Building size={34} /><p className="m-0">{t('tenantDashboard.noTenants')}</p></div>
      )}

      <section className={`mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5 ${loading ? 'opacity-60' : ''}`}>
        <MetricCard icon={Users} label={t('tenantDashboard.patients')} value={totals.customers ?? dash} to={PATHS.CUSTOMERS} />
        <MetricCard icon={Stethoscope} label={t('tenantDashboard.doctors')} value={totals.doctors ?? dash} to={PATHS.DOCTORS} />
        <MetricCard icon={ClipboardCheck} label={t('tenantDashboard.patientsWithGoals')} value={totals.customersWithGoals ?? dash} to={PATHS.CUSTOMER_GOALS} />
        <MetricCard icon={FileText} label={t('tenantDashboard.mealPlans')} value={totals.mealPlans ?? dash} detail={t('tenantDashboard.finishedPlans', { count: totals.finishedMealPlans ?? 0 })} to={PATHS.MEAL_PLANS} />
        <MetricCard icon={Smartphone} label={t('tenantDashboard.mobileEnabled')} value={totals.mobileEnabledCustomers ?? dash} to={PATHS.CUSTOMERS} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] p-4">
          <h3 className="m-0 flex items-center gap-2 text-[1rem]"><UserCheck size={18} className="text-[var(--accent-primary)]" />{t('tenantDashboard.recentPatients')}</h3>
          <div className="flex items-center gap-3">
            <ViewToggle
              value={view} onChange={setView}
              options={[
                { id: 'cards', label: t('tenantDashboard.cards'), title: t('tenantDashboard.cards'), icon: LayoutGrid },
                { id: 'table', label: t('tenantDashboard.table'), title: t('tenantDashboard.table'), icon: List },
              ]}
            />
            <Link to={PATHS.CUSTOMERS} className="text-[.84rem] font-semibold text-[var(--accent-primary)] no-underline">{t('tenantDashboard.viewAll')}</Link>
          </div>
        </header>
        {loading ? <p role="status" className="p-12 text-center text-[var(--text-body)]">{t('common.loading')}</p>
          : recent.length === 0 ? <div className="flex flex-col items-center gap-2 p-10 text-center text-[var(--text-body)]"><UserCheck size={34} /><p className="m-0">{t('tenantDashboard.noRecentPatients')}</p></div>
          : view === 'cards' ? (
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
              {recent.map((customer) => <CustomerCard key={customer.id} mode="summary" customer={customer} planName={planName(customer)} mealName={mealName(customer)} language={i18n.resolvedLanguage} />)}
            </div>
          ) : <CustomerTable mode="summary" customers={recent} planName={planName} mealName={mealName} language={i18n.resolvedLanguage} />}
      </section>
    </div>
  );
};
