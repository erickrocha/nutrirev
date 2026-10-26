import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Building,
  Calendar,
  ClipboardCheck,
  FileText,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Smartphone,
  Stethoscope,
  UserCheck,
  Users,
} from 'lucide-react';

import {
  tenantDashboardService,
  clinicalPlanService,
  prepareMealService,
} from '../../services';
import { fetchTenants, setActiveTenant } from '../../store/tenantSlice';
import { PATHS } from '../../router/routeConfig';
import { ROLES } from '../../utils/enums';

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid var(--border-color)',
  borderRadius: '14px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  textDecoration: 'none',
};

const formatPhone = (val) => {
  if (!val) return 'N/A';
  const digits = val.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const formatAddress = (customer, fallback) => {
  const parts = [customer.addressLine1, customer.addressLine2].filter(Boolean);
  const region = [customer.locality || customer.city, customer.administrativeArea || customer.province].filter(Boolean).join(', ');
  if (region) parts.push(region);
  const postalCountry = [customer.postalCode || customer.zipcode, customer.countryCode].filter(Boolean).join(' · ');
  if (postalCountry) parts.push(postalCountry);
  return parts.join(' — ') || fallback;
};

const formatDate = (value, language) => {
  if (!value) return '';
  const dateStr = typeof value === 'string' ? value.slice(0, 10) : '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat(language?.startsWith('en') ? 'en-US' : 'pt-BR').format(
    new Date(year, month - 1, day)
  );
};

const MetricCard = ({ icon: Icon, label, value, detail, to }) => (
  <Link to={to} style={cardStyle}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
      <div>
        <p style={{ margin: '0 0 8px', color: 'var(--text-body)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <strong style={{ display: 'block', color: 'var(--text-heading)', fontSize: '1.8rem', lineHeight: 1 }}>{value}</strong>
        {detail && <span style={{ display: 'block', color: 'var(--text-body)', fontSize: '0.78rem', marginTop: '8px' }}>{detail}</span>}
      </div>
      <span style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--bg-primary)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={21} />
      </span>
    </div>
  </Link>
);

export const TenantDashboardPage = () => {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  const { activeTenant, tenantsList, loading: tenantsLoading } = useSelector((state) => state.tenant);
  const isSysAdmin = user?.role === ROLES.SYS_ADMIN;
  const [dashboard, setDashboard] = useState(null);
  const [clinicalPlans, setClinicalPlans] = useState([]);
  const [prepareMeals, setPrepareMeals] = useState([]);
  const [displayView, setDisplayView] = useState('cards');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isSysAdmin && tenantsList.length === 0) dispatch(fetchTenants());
  }, [dispatch, isSysAdmin, tenantsList.length]);

  useEffect(() => {
    if (!isSysAdmin || activeTenant || tenantsList.length === 0) return;
    dispatch(setActiveTenant(tenantsList[0]));
  }, [activeTenant, dispatch, isSysAdmin, tenantsList]);

  const tenantId = isSysAdmin ? activeTenant?.id : undefined;
  const loadDashboard = useCallback(async () => {
    if (isSysAdmin && !tenantId) {
      setLoading(tenantsLoading);
      setDashboard(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [dashboardData, plansData, mealsData] = await Promise.all([
        tenantDashboardService.getDashboard(tenantId),
        clinicalPlanService.getAll().catch(() => []),
        prepareMealService.getAll().catch(() => []),
      ]);
      setDashboard(dashboardData);
      setClinicalPlans(Array.isArray(plansData) ? plansData : []);
      setPrepareMeals(Array.isArray(mealsData) ? mealsData : []);
    } catch (requestError) {
      setDashboard(null);
      setError(requestError?.response?.data?.message || t('tenantDashboard.loadError'));
    } finally {
      setLoading(false);
    }
  }, [isSysAdmin, tenantId, tenantsLoading, t]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const getClinicalPlanName = (id) => {
    const found = clinicalPlans.find((p) => p.id === parseInt(id, 10));
    return found ? found.name : t('common.noPlan', 'Sem plano');
  };

  const getPrepareMealName = (id) => {
    const found = prepareMeals.find((m) => m.id === parseInt(id, 10));
    return found ? found.name : t('common.notAvailable', 'N/A');
  };

  const totals = dashboard?.totals || {};
  const metricCards = [
    { icon: Users, label: t('tenantDashboard.patients'), value: totals.customers ?? '—', to: PATHS.CUSTOMERS },
    { icon: Stethoscope, label: t('tenantDashboard.doctors'), value: totals.doctors ?? '—', to: PATHS.DOCTORS },
    { icon: ClipboardCheck, label: t('tenantDashboard.patientsWithGoals'), value: totals.customersWithGoals ?? '—', to: PATHS.CUSTOMER_GOALS },
    { icon: FileText, label: t('tenantDashboard.mealPlans'), value: totals.mealPlans ?? '—', detail: t('tenantDashboard.finishedPlans', { count: totals.finishedMealPlans ?? 0 }), to: PATHS.MEAL_PLANS },
    { icon: Smartphone, label: t('tenantDashboard.mobileEnabled'), value: totals.mobileEnabledCustomers ?? '—', to: PATHS.CUSTOMERS },
  ];

  const recentCustomers = dashboard?.recentCustomers || [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '48px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', marginBottom: '28px', paddingBottom: '18px', borderBottom: '1px solid var(--border-color)' }}>
        <div>
          <h2 style={{ margin: '0 0 5px', color: 'var(--text-heading)', fontFamily: "'Jost', sans-serif", fontSize: '1.65rem', fontWeight: '500' }}>{t('tenantDashboard.title')}</h2>
          <p style={{ margin: 0, color: 'var(--text-body)', fontSize: '0.9rem' }}>{t('tenantDashboard.subtitle', { tenant: activeTenant?.name || t('tenantDashboard.yourTenant') })}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isSysAdmin && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.85rem', fontWeight: '600' }}>
              <Building size={17} color="var(--accent-primary)" />
              <select value={activeTenant?.id || ''} onChange={(event) => {
                const tenant = tenantsList.find((item) => item.id === Number(event.target.value));
                if (tenant) dispatch(setActiveTenant(tenant));
              }} style={{ padding: '9px 32px 9px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#FFF', color: 'var(--text-heading)' }}>
                {tenantsList.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
              </select>
            </label>
          )}
          <button type="button" onClick={loadDashboard} disabled={loading} className="btn-action-outline" title={t('common.refresh')}>
            <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '14px 16px', marginBottom: '22px', color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={18} /> {error}</span>
          <button type="button" onClick={loadDashboard} className="btn-action-outline">{t('common.retry')}</button>
        </div>
      )}

      {isSysAdmin && !activeTenant && !tenantsLoading ? (
        <div style={{ ...cardStyle, marginBottom: '28px', textAlign: 'center', color: 'var(--text-body)' }}>
          <Building size={34} style={{ marginBottom: '8px', color: 'var(--text-body)' }} />
          <p style={{ margin: 0 }}>{t('tenantDashboard.noTenants')}</p>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', marginBottom: '28px', opacity: loading ? 0.65 : 1 }}>
        {metricCards.map((card) => <MetricCard key={card.label} {...card} />)}
      </div>

      {/* Recent Patients Section */}
      <section style={{ ...cardStyle, padding: '0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-heading)', fontSize: '1rem', fontWeight: '600' }}>
            <UserCheck size={18} color="var(--accent-primary)" /> {t('tenantDashboard.recentPatients')}
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* View Mode Toggle Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                background: '#F1F5F9',
                padding: '4px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
              }}
            >
              <button
                type="button"
                onClick={() => setDisplayView('cards')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  backgroundColor: displayView === 'cards' ? '#FFFFFF' : 'transparent',
                  color: displayView === 'cards' ? 'var(--text-heading)' : '#64748B',
                  boxShadow: displayView === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s ease',
                }}
                title={t('tenantDashboard.cards', 'Cards')}
              >
                <LayoutGrid size={15} />
                <span>{t('tenantDashboard.cards', 'Cards')}</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayView('table')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  backgroundColor: displayView === 'table' ? '#FFFFFF' : 'transparent',
                  color: displayView === 'table' ? 'var(--text-heading)' : '#64748B',
                  boxShadow: displayView === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s ease',
                }}
                title={t('tenantDashboard.table', 'Tabela')}
              >
                <List size={15} />
                <span>{t('tenantDashboard.table', 'Tabela')}</span>
              </button>
            </div>

            <Link to={PATHS.CUSTOMERS} style={{ color: 'var(--accent-primary)', fontSize: '0.84rem', fontWeight: '600', textDecoration: 'none' }}>
              {t('tenantDashboard.viewAll')}
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-body)' }}>{t('common.loading')}</div>
        ) : recentCustomers.length === 0 ? (
          <div style={{ padding: '42px 20px', textAlign: 'center', color: 'var(--text-body)' }}>
            <UserCheck size={34} style={{ marginBottom: '8px', color: 'var(--text-body)' }} />
            <p style={{ margin: 0 }}>{t('tenantDashboard.noRecentPatients')}</p>
          </div>
        ) : displayView === 'cards' ? (
          /* Cards Grid View */
          <div style={{ padding: '20px' }}>
            <div className="customer-cards-grid" style={{ marginBottom: 0 }}>
              {recentCustomers.map((customer) => {
                const planId = customer.clinicalPlanId || customer.clinical_plan_id;
                const prepareMealId = customer.prepareMealId || customer.prepare_meal_id;
                const dob = customer.dateOfBirth || customer.date_of_birth || '';
                const isMobileEnabled = customer.mobileEnabled || customer.mobile_enabled;
                const photoSrc = customer.photoUrl || customer.photo_url || customer.photoBase64 || customer.photo_base64 || customer.photo || null;

                return (
                  <div key={customer.id} className="customer-card">
                    <div className="customer-card-header">
                      <div className="customer-card-avatar">
                        {photoSrc ? (
                          <img src={photoSrc} alt={customer.name} />
                        ) : (
                          <span>{(customer.name || 'P')[0].toUpperCase()}</span>
                        )}
                      </div>
                      <div className="customer-card-title-group">
                        <h3 className="customer-card-name" title={customer.name}>
                          {customer.name}
                        </h3>
                        <span className="customer-card-id">ID #{customer.id}</span>
                      </div>
                      {isMobileEnabled ? (
                        <span className="customer-status-badge mobile-active" title={t('customers.mobileActiveTitle')}>
                          <Smartphone size={12} /> Mobile
                        </span>
                      ) : (
                        <span className="customer-status-badge mobile-inactive" title={t('customers.noMobileTitle')}>
                          {t('customers.pending')}
                        </span>
                      )}
                    </div>

                    <div className="customer-card-body">
                      <div className="info-row">
                        <Mail size={14} className="info-icon text-gold" />
                        <span className="info-text">{customer.email || t('customers.noEmail')}</span>
                      </div>
                      <div className="info-row">
                        <Phone size={14} className="info-icon" />
                        <span className="info-text">{formatPhone(customer.phone)}</span>
                      </div>
                      <div className="info-row">
                        <MapPin size={14} className="info-icon" />
                        <span className="info-text">
                          {formatAddress(customer, t('common.notAvailable'))}
                        </span>
                      </div>

                      <div className="tags-row">
                        {customer.gender && <span className="badge-tag gender-tag">{customer.gender}</span>}
                        {dob && (
                          <span className="badge-tag dob-tag">
                            <Calendar size={12} /> {formatDate(dob, i18n.resolvedLanguage)}
                          </span>
                        )}
                      </div>

                      {(planId || prepareMealId) ? (
                        <div className="clinical-info-box">
                          {planId ? (
                            <div className="clinical-row">
                              <FileText size={14} className="info-icon text-gold" />
                              <span className="clinical-title">{getClinicalPlanName(planId)}</span>
                            </div>
                          ) : null}
                          {prepareMealId ? (
                            <span className="prepare-meal-subtext">
                              {t('customers.meal')}: {getPrepareMealName(prepareMealId)}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="customer-card-footer">
                      <Link
                        to={PATHS.CUSTOMERS}
                        className="btn-card-edit"
                        style={{ textDecoration: 'none', justifyContent: 'center' }}
                      >
                        <UserCheck size={15} />
                        <span>{t('tenantDashboard.viewPatient')}</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="table-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th>{t('customers.customer')}</th>
                  <th>{t('customers.contact')}</th>
                  <th>{t('customers.location')}</th>
                  <th>{t('tenantDashboard.patientsWithGoals')}</th>
                  <th>{t('customers.planMeal')}</th>
                  <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {recentCustomers.map((customer) => {
                  const planId = customer.clinicalPlanId || customer.clinical_plan_id;
                  const prepareMealId = customer.prepareMealId || customer.prepare_meal_id;
                  const isMobileEnabled = customer.mobileEnabled || customer.mobile_enabled;

                  return (
                    <tr key={customer.id}>
                      <td>
                        <div className="user-table-info">
                          <span className="user-table-name" style={{ fontWeight: '600' }}>
                            {customer.name}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#888' }}>
                            ID #{customer.id}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mail size={12} style={{ color: 'var(--accent-primary)' }} /> {customer.email}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666' }}>
                            <Phone size={12} /> {formatPhone(customer.phone)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                          <MapPin size={12} style={{ color: '#888' }} />
                          {formatAddress(customer, t('common.notAvailable'))}
                        </span>
                      </td>
                      <td>
                        {isMobileEnabled ? (
                          <span className="customer-status-badge mobile-active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Smartphone size={12} /> Mobile
                          </span>
                        ) : (
                          <span className="customer-status-badge mobile-inactive">
                            {t('customers.pending')}
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: '600', color: 'var(--text-heading)' }}>
                            {getClinicalPlanName(planId)}
                          </span>
                          {prepareMealId && (
                            <span style={{ display: 'block', color: 'var(--text-body)', fontSize: '0.78rem' }}>
                              {getPrepareMealName(prepareMealId)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          to={PATHS.CUSTOMERS}
                          className="btn-table-action"
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)', fontWeight: '600', fontSize: '0.82rem' }}
                        >
                          <UserCheck size={15} />
                          <span>{t('tenantDashboard.viewPatient')}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
