import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Building,
  CalendarClock,
  CreditCard,
  FileText,
  RefreshCw,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react';
import { sysAdminDashboardService } from '../../services';
import { PATHS } from '../../router/routeConfig';

const formatCurrency = (cents, language) => new Intl.NumberFormat(
  language?.startsWith('en') ? 'en-US' : 'pt-BR',
  { style: 'currency', currency: 'BRL' },
).format((Number(cents) || 0) / 100);

const formatDate = (value, language) => {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat(language?.startsWith('en') ? 'en-US' : 'pt-BR').format(date);
};

const MetricCard = ({ icon: Icon, label, value, tone = 'gold' }) => (
  <article className={`sysadmin-metric-card tone-${tone}`}>
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
    <div className="sysadmin-metric-icon"><Icon size={22} /></div>
  </article>
);

export const SysAdminDashboardPage = () => {
  const { t, i18n } = useTranslation();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDashboard(await sysAdminDashboardService.getDashboard());
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t('sysAdminDashboard.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const totals = dashboard?.totals || {};
  const metrics = [
    { icon: Building, label: t('sysAdminDashboard.totalTenants'), value: totals.tenants ?? '—' },
    { icon: Users, label: t('sysAdminDashboard.totalUsers'), value: totals.users ?? '—', tone: 'blue' },
    { icon: ShieldCheck, label: t('sysAdminDashboard.activePlans'), value: totals.activePlans ?? '—', tone: 'green' },
    { icon: AlertCircle, label: t('sysAdminDashboard.tenantsWithoutPlan'), value: totals.tenantsWithoutActivePlan ?? '—', tone: 'red' },
    {
      icon: CreditCard,
      label: t('sysAdminDashboard.monthlyRevenue'),
      value: dashboard ? formatCurrency(totals.monthlyRecurringRevenueInCents, i18n.language) : '—',
      tone: 'purple',
    },
  ];

  return (
    <div className="sysadmin-dashboard-page">
      <header className="management-header">
        <div>
          <h2 className="section-title">{t('sysAdminDashboard.title')}</h2>
          <p className="section-subtitle">{t('sysAdminDashboard.subtitle')}</p>
        </div>
        <button type="button" className="btn-action-outline" onClick={loadDashboard} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
          <span>{t('common.refresh')}</span>
        </button>
      </header>

      {error && (
        <div className="dashboard-error-state" role="alert">
          <span><AlertCircle size={18} /> {error}</span>
          <button type="button" className="btn-action-outline" onClick={loadDashboard}>{t('common.retry')}</button>
        </div>
      )}

      <section className={`sysadmin-metrics-grid ${loading ? 'is-loading' : ''}`}>
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <section className="sysadmin-quick-actions" aria-label={t('sysAdminDashboard.quickActions')}>
        <Link to={PATHS.TENANTS}><Building size={18} /> {t('sysAdminDashboard.manageTenants')}</Link>
        <Link to={PATHS.USERS}><UserCog size={18} /> {t('sysAdminDashboard.manageUsers')}</Link>
        <Link to={PATHS.BUSINESS_PLANS}><FileText size={18} /> {t('sysAdminDashboard.managePlans')}</Link>
        <Link to={PATHS.TENANT_DASHBOARD}><ShieldCheck size={18} /> {t('sysAdminDashboard.openTenantDashboard')}</Link>
      </section>

      <div className="sysadmin-dashboard-columns">
        <section className="table-card sysadmin-dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h3><CalendarClock size={18} /> {t('sysAdminDashboard.billingAttention')}</h3>
              <p>{t('sysAdminDashboard.billingAttentionSubtitle')}</p>
            </div>
            <Link to={PATHS.BUSINESS_PLANS}>{t('common.viewAll', 'View all')}</Link>
          </div>
          {loading ? (
            <div className="table-loading-state"><RefreshCw size={22} className="spin-icon" /></div>
          ) : (dashboard?.billingAttention || []).length === 0 ? (
            <div className="table-empty-state"><CalendarClock size={30} /><p>{t('sysAdminDashboard.noBillingAttention')}</p></div>
          ) : (
            <div className="responsive-table-wrap">
              <table className="management-table">
                <thead><tr>
                  <th>{t('sysAdminDashboard.tenant')}</th>
                  <th>{t('sysAdminDashboard.plan')}</th>
                  <th>{t('sysAdminDashboard.dueDate')}</th>
                  <th>{t('sysAdminDashboard.value')}</th>
                  <th>{t('sysAdminDashboard.status')}</th>
                </tr></thead>
                <tbody>
                  {dashboard.billingAttention.map((item) => (
                    <tr key={item.businessPlanId || item.id}>
                      <td>{item.tenantName || `#${item.tenantId}`}</td>
                      <td>{item.planName}</td>
                      <td>{formatDate(item.paymentDate, i18n.language)}</td>
                      <td>{formatCurrency(item.contractValueInCents, i18n.language)}</td>
                      <td><span className={`plan-status-badge ${item.overdue ? 'overdue' : 'upcoming'}`}>
                        {item.overdue ? t('sysAdminDashboard.overdue') : t('sysAdminDashboard.upcoming')}
                      </span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="table-card sysadmin-dashboard-panel recent-tenants-panel">
          <div className="dashboard-panel-header">
            <div><h3><Building size={18} /> {t('sysAdminDashboard.recentTenants')}</h3></div>
            <Link to={PATHS.TENANTS}>{t('common.viewAll', 'View all')}</Link>
          </div>
          {loading ? (
            <div className="table-loading-state"><RefreshCw size={22} className="spin-icon" /></div>
          ) : (dashboard?.recentTenants || []).length === 0 ? (
            <div className="table-empty-state"><Building size={30} /><p>{t('sysAdminDashboard.noTenants')}</p></div>
          ) : (
            <div className="recent-tenant-list">
              {dashboard.recentTenants.map((tenant) => (
                <div key={tenant.id} className="recent-tenant-row">
                  <div className="tenant-initial">{(tenant.name || 'T')[0].toUpperCase()}</div>
                  <div><strong>{tenant.name || `#${tenant.id}`}</strong><span>{tenant.email || '—'}</span></div>
                  <div className="recent-tenant-meta"><span>{tenant.activePlanName || t('sysAdminDashboard.noActivePlan')}</span><small>{formatDate(tenant.createdAt, i18n.language)}</small></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
