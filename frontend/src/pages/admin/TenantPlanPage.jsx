import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Building,
  Calendar,
  CalendarDays,
  Check,
  CreditCard,
  Layers,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Sparkles,
  Users,
  X,
  Copy,
  CheckCheck
} from 'lucide-react';
import { addTenantPlan } from '../../store/tenantSlice';
import { businessPlanService, tenantService } from '../../services';

const formatCurrency = (cents, language) => new Intl.NumberFormat(
  language?.startsWith('en') ? 'en-US' : 'pt-BR',
  { style: 'currency', currency: 'BRL' },
).format((Number(cents) || 0) / 100);

export const TenantPlanPage = ({ tenant, onBack, onSaveSuccess }) => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [businessPlans, setBusinessPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [error, setError] = useState(null);
  const [copiedUuid, setCopiedUuid] = useState(false);

  const [formData, setFormData] = useState({
    businessPlanId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    active: true,
  });

  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      try {
        setDataLoading(true);
        setError(null);

        const [plansData, activePlanData] = await Promise.all([
          businessPlanService.getPlans().catch(() => []),
          tenant?.id ? tenantService.getTenantActivePlan(tenant.id).catch(() => null) : Promise.resolve(null),
        ]);

        if (!isMounted) return;

        const plans = Array.isArray(plansData) ? plansData : [];
        setBusinessPlans(plans);
        setActivePlan(activePlanData);

        if (activePlanData && activePlanData.businessPlanId) {
          setFormData({
            businessPlanId: activePlanData.businessPlanId,
            paymentDate: activePlanData.paymentDate || new Date().toISOString().split('T')[0],
            active: activePlanData.active ?? true,
          });
        } else if (plans.length > 0) {
          setFormData((prev) => ({
            ...prev,
            businessPlanId: plans[0].id,
          }));
        }
      } catch (err) {
        if (!isMounted) return;
        setError(t('tenants.errorLoadingPlans'));
      } finally {
        if (isMounted) setDataLoading(false);
      }
    };

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, [tenant?.id, t]);

  const handleCopyUuid = () => {
    if (!tenant?.uuid) return;
    navigator.clipboard?.writeText(tenant.uuid);
    setCopiedUuid(true);
    setTimeout(() => setCopiedUuid(false), 2000);
  };

  const handleSelectPlan = (planId) => {
    setFormData((prev) => ({
      ...prev,
      businessPlanId: planId,
    }));
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.businessPlanId) {
      setError(t('tenants.planRequired'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await dispatch(
        addTenantPlan({
          id: tenant.id,
          planData: {
            tenantId: tenant.id,
            businessPlanId: parseInt(formData.businessPlanId, 10),
            paymentDate: formData.paymentDate,
            active: formData.active,
          },
        })
      ).unwrap();

      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      setError(err || t('tenants.saveError') || 'Failed to save tenant subscription');
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (tObj) => {
    if (!tObj) return '';
    const lines = [tObj.addressLine1, tObj.addressLine2].filter(Boolean);
    const region = [tObj.locality || tObj.city, tObj.administrativeArea || tObj.province].filter(Boolean).join(', ');
    if (region) lines.push(region);
    const postalCountry = [tObj.postalCode || tObj.zipcode, tObj.countryCode].filter(Boolean).join(' · ');
    if (postalCountry) lines.push(postalCountry);
    return lines.join(' — ');
  };

  const currentActivePlanDetails = businessPlans.find(
    (p) => p.id === activePlan?.businessPlanId
  );

  return (
    <div className="tenant-subscription-page">
      {/* Top Back Navigation */}
      <div className="subscription-top-nav">
        <button type="button" className="btn-back-link" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>{t('common.back')}</span>
        </button>
      </div>

      {/* Tenant Profile Subheader Hero Banner */}
      <div className="tenant-profile-hero">
        <div className="hero-main-info">
          <div className="hero-clinic-avatar">
            <Building size={28} />
          </div>
          <div className="hero-titles">
            <h2>
              <span>{tenant.name}</span>
              <span className="tenant-id-pill">#{tenant.id}</span>
            </h2>
            <div className="hero-meta-row">
              {tenant.uuid && (
                <span
                  className="meta-item meta-uuid"
                  onClick={handleCopyUuid}
                  title="Click to copy UUID"
                  style={{ cursor: 'pointer' }}
                >
                  UUID: {tenant.uuid}
                  {copiedUuid ? <CheckCheck size={12} color="#15803d" /> : <Copy size={12} />}
                </span>
              )}
              {tenant.email && (
                <span className="meta-item">
                  <Mail size={13} /> {tenant.email}
                </span>
              )}
              {tenant.phone && (
                <span className="meta-item">
                  <Phone size={13} /> {tenant.phone}
                </span>
              )}
              {formatAddress(tenant) && (
                <span className="meta-item">
                  <MapPin size={13} /> {formatAddress(tenant)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Current Active Plan Status Banner */}
        <div className={`hero-active-plan-badge ${!activePlan ? 'is-empty' : ''}`}>
          <div className="badge-header">
            <CreditCard size={13} />
            <span>{t('tenants.currentActivePlan')}</span>
          </div>
          <div className="badge-plan-name">
            {currentActivePlanDetails?.name || (activePlan ? `Plan #${activePlan.businessPlanId}` : t('tenants.noActivePlan'))}
          </div>
          {activePlan && (
            <div className="badge-meta">
              <Calendar size={12} />
              <span>
                {activePlan.paymentDate || '—'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSave}>
        {error && (
          <div className="dashboard-error-state" role="alert" style={{ marginBottom: '24px' }}>
            <span>{error}</span>
            <button type="button" className="btn-action-outline" onClick={() => setError(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Business Plans Section Header */}
        <div className="subscription-section-header">
          <h3 className="section-title">
            <Sparkles size={18} color="var(--accent-primary)" />
            {t('tenants.selectPlan')}
          </h3>
          <p className="section-subtitle">{t('tenants.selectPlanSubtitle')}</p>
        </div>

        {/* Business Plans Selection Grid */}
        {dataLoading ? (
          <div className="table-card" style={{ marginBottom: '32px' }}>
            <div className="table-loading-state">
              <Loader2 size={28} className="spin-icon" />
              <p>{t('tenants.loadingTenants')}</p>
            </div>
          </div>
        ) : businessPlans.length === 0 ? (
          <div className="table-card" style={{ marginBottom: '32px' }}>
            <div className="table-empty-state">
              <CreditCard size={36} />
              <p>{t('businessPlans.empty')}</p>
            </div>
          </div>
        ) : (
          <div className="subscription-plans-grid">
            {businessPlans.map((plan) => {
              const isSelected = String(formData.businessPlanId) === String(plan.id);
              const sortedTiers = Array.isArray(plan.tiers) ? [...plan.tiers] : [];
              sortedTiers.sort((a, b) => {
                const aLimit = a.upToUsers === 0 ? Infinity : a.upToUsers;
                const bLimit = b.upToUsers === 0 ? Infinity : b.upToUsers;
                return aLimit - bLimit;
              });

              return (
                <div
                  key={plan.id}
                  className={`subscription-plan-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  <div className="card-top-bar">
                    <div className="plan-name-group">
                      <h3>{plan.name}</h3>
                      <span className="plan-tag">
                        {isSelected ? t('tenants.planSelected') : t('businessPlans.plan')}
                      </span>
                    </div>
                    <div className="selection-indicator">
                      {isSelected && <Check size={16} />}
                    </div>
                  </div>

                  <div className="plan-price-block">
                    <span className="price-currency">
                      {formatCurrency(plan.priceInCents, i18n.language)}
                    </span>
                    <span className="price-period">
                      / {t('businessPlans.days', { count: plan.periodDays })}
                    </span>
                  </div>

                  <div className="plan-specs-list">
                    <div className="spec-item">
                      <Users size={15} />
                      <span>
                        {t('tenants.includedUsers')}: <strong>{plan.availableUsers}</strong>
                      </span>
                    </div>

                    <div className="spec-item">
                      <Sparkles size={15} />
                      <span>
                        {t('tenants.aiQuotaPerDay')}: <strong>{plan.dailyAiQuota ?? 4}</strong> ({t('tenants.aiQuotaDetails', { count: plan.dailyAiQuota ?? 4 })})
                      </span>
                    </div>

                    <div className="spec-item">
                      <CalendarDays size={15} />
                      <span>
                        {t('businessPlans.period')}: <strong>{t('tenants.billingCycleDays', { count: plan.periodDays })}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Business Plan Tiers Breakdown Box */}
                  <div className="plan-tiers-box">
                    <div className="tiers-box-title">
                      <Layers size={13} />
                      <span>{t('tenants.planTiersTitle')}</span>
                    </div>

                    {sortedTiers.length > 0 ? (
                      <div className="tiers-list">
                        {sortedTiers.map((tier, idx) => (
                          <div key={tier.id || idx} className="tier-pill">
                            <span className="tier-range">
                              {tier.upToUsers > 0
                                ? t('tenants.upToUsers', { count: tier.upToUsers })
                                : t('tenants.unlimitedTier', { count: sortedTiers[idx - 1]?.upToUsers || plan.availableUsers })}
                            </span>
                            <span className="tier-price">
                              {formatCurrency(tier.pricePerUserInCents, i18n.language)} {t('tenants.perUser')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-tiers-label">
                        {t('tenants.fixedPricing')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Configuration & Status Card */}
        <div className="subscription-config-card">
          <div className="config-grid">
            {/* Payment Date Picker */}
            <div className="config-field-group">
              <label htmlFor="paymentDate">
                <CalendarDays size={15} color="var(--accent-primary)" />
                {t('tenants.paymentDate')} *
              </label>
              <div className="input-with-icon">
                <Calendar size={16} className="input-icon" />
                <input
                  type="date"
                  id="paymentDate"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <p className="field-help-text">
                {t('businessPlans.formSubtitle')}
              </p>
            </div>

            {/* Active Toggle Switch */}
            <div className="status-toggle-card">
              <div className="status-text-info">
                <strong>
                  {formData.active ? t('tenants.planActive') : t('tenants.planInactive')}
                </strong>
                <p>{t('tenants.activeToggleHelp')}</p>
              </div>

              <label className="luxury-switch">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleInputChange}
                />
                <span className="luxury-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="subscription-actions-footer">
          <button type="button" className="btn-cancel" onClick={onBack}>
            <X size={16} />
            <span>{t('common.cancel')}</span>
          </button>
          <button type="submit" className="btn-submit" disabled={loading || dataLoading}>
            {loading ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                <span>{t('tenants.saving')}</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{t('tenants.savePlan')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
