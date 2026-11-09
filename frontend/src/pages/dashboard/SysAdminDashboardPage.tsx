import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Building, CalendarClock, CreditCard, FileText, RefreshCw, ShieldCheck, UserCog, Users } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { MetricCard } from '../../components/molecules/MetricCard';
import { Button } from '../../components/atoms/Button';
import { loadSysAdminDashboard } from '../../store/dashboardSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { formatLocalDate } from '../../utils/date';
import { formatCurrency } from '../../utils/format';

export const SysAdminDashboardPage = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'pt';
  const dispatch = useAppDispatch();
  const { sysAdmin: dashboard, sysAdminLoading: loading, sysAdminError: error } = useAppSelector((state) => state.dashboard);

  const load = () => { dispatch(loadSysAdminDashboard()); };
  useEffect(() => { dispatch(loadSysAdminDashboard()); }, [dispatch]);

  const totals = dashboard?.totals ?? {};
  const billing = dashboard?.billingAttention ?? [];
  const recent = dashboard?.recentTenants ?? [];
  const dash = '—';
  const viewAll = <span className="text-[.84rem] font-semibold">{t('common.viewAll')}</span>;

  return (
    <div className="mx-auto w-full max-w-[1200px] pb-12">
      <Breadcrumb items={[{ label: t('sysAdminDashboard.title') }]} />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">{t('sysAdminDashboard.title')}</h2>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('sysAdminDashboard.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{t('common.refresh')}</Button>
      </header>

      {error !== null && <ErrorAlert message={error || t('sysAdminDashboard.loadError')} onRetry={load} />}

      <section className={`mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5 ${loading ? 'opacity-60' : ''}`}>
        <MetricCard icon={Building} label={t('sysAdminDashboard.totalTenants')} value={totals.tenants ?? dash} />
        <MetricCard icon={Users} label={t('sysAdminDashboard.totalUsers')} value={totals.users ?? dash} tone="blue" />
        <MetricCard icon={ShieldCheck} label={t('sysAdminDashboard.activePlans')} value={totals.activePlans ?? dash} tone="green" />
        <MetricCard icon={AlertCircle} label={t('sysAdminDashboard.tenantsWithoutPlan')} value={totals.tenantsWithoutActivePlan ?? dash} tone="red" />
        <MetricCard icon={CreditCard} label={t('sysAdminDashboard.monthlyRevenue')} value={dashboard ? formatCurrency(totals.monthlyRecurringRevenueInCents, lang) : dash} tone="purple" />
      </section>

      <nav aria-label={t('sysAdminDashboard.quickActions')} className="mb-6 flex flex-wrap gap-3">
        {([[PATHS.TENANTS, Building, 'manageTenants'], [PATHS.USERS, UserCog, 'manageUsers'], [PATHS.BUSINESS_PLANS, FileText, 'managePlans'], [PATHS.TENANT_DASHBOARD, ShieldCheck, 'openTenantDashboard']] as const).map(([to, Icon, key]) => (
          <Link key={key} to={to} className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-white px-4 py-3 text-[.88rem] font-semibold text-[var(--text-heading)] no-underline hover:border-[var(--accent-primary)]"><Icon size={18} />{t(`sysAdminDashboard.${key}`)}</Link>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-white">
          <header className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] p-4">
            <div>
              <h3 className="m-0 flex items-center gap-2 text-[1rem]"><CalendarClock size={18} />{t('sysAdminDashboard.billingAttention')}</h3>
              <p className="m-0 text-[.8rem] text-[var(--text-body)]">{t('sysAdminDashboard.billingAttentionSubtitle')}</p>
            </div>
            <Link to={PATHS.BUSINESS_PLANS} className="text-[var(--accent-primary)] no-underline">{viewAll}</Link>
          </header>
          {loading ? <p role="status" className="p-8 text-center text-[var(--text-body)]"><RefreshCw size={22} className="animate-spin" /></p>
            : billing.length === 0 ? <div className="flex flex-col items-center gap-2 p-8 text-center text-[var(--text-body)]"><CalendarClock size={30} /><p className="m-0">{t('sysAdminDashboard.noBillingAttention')}</p></div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] bg-slate-50 text-[.8rem] text-[var(--text-body)]">
                      {['tenant', 'plan', 'dueDate', 'value', 'status'].map((key) => <th key={key} className="px-4 py-3">{t(`sysAdminDashboard.${key}`)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {billing.map((item) => (
                      <tr key={item.businessPlanId ?? item.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-3">{item.tenantName || `#${item.tenantId}`}</td>
                        <td className="px-4 py-3">{item.planName}</td>
                        <td className="px-4 py-3">{formatLocalDate(item.paymentDate, i18n.language)}</td>
                        <td className="px-4 py-3">{formatCurrency(item.contractValueInCents, lang)}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-[2px] text-[.75rem] font-semibold ${item.overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{item.overdue ? t('sysAdminDashboard.overdue') : t('sysAdminDashboard.upcoming')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-white">
          <header className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] p-4">
            <h3 className="m-0 flex items-center gap-2 text-[1rem]"><Building size={18} />{t('sysAdminDashboard.recentTenants')}</h3>
            <Link to={PATHS.TENANTS} className="text-[var(--accent-primary)] no-underline">{viewAll}</Link>
          </header>
          {loading ? <p role="status" className="p-8 text-center text-[var(--text-body)]"><RefreshCw size={22} className="animate-spin" /></p>
            : recent.length === 0 ? <div className="flex flex-col items-center gap-2 p-8 text-center text-[var(--text-body)]"><Building size={30} /><p className="m-0">{t('sysAdminDashboard.noTenants')}</p></div>
            : (
              <ul className="m-0 list-none p-0">
                {recent.map((tenant) => (
                  <li key={tenant.id} className="flex items-center gap-3 border-b border-slate-100 p-3 last:border-b-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-[var(--accent-primary)]">{(tenant.name || 'T')[0].toUpperCase()}</span>
                    <span className="min-w-0 flex-1"><strong className="block truncate">{tenant.name || `#${tenant.id}`}</strong><span className="block truncate text-[.8rem] text-[var(--text-body)]">{tenant.email || dash}</span></span>
                    <span className="text-right text-[.8rem]"><span className="block">{tenant.activePlanName || t('sysAdminDashboard.noActivePlan')}</span><small className="text-[var(--text-body)]">{formatLocalDate(tenant.createdAt?.slice(0, 10), i18n.language)}</small></span>
                  </li>
                ))}
              </ul>
            )}
        </section>
      </div>
    </div>
  );
};
