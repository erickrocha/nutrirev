import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { CustomerFormPage } from './CustomerFormPage';
import { fetchAllCustomers } from '../../store/customerSlice';
import {
  customerService,
  clinicalPlanService,
  prepareMealService,
  dietaryRestrictionService,
  bowelFunctionService,
  preExistingConditionsService,
  dailyMealService,
} from '../../services/api';
import {
  UserCheck,
  Plus,
  Edit2,
  RefreshCw,
  Search,
  Mail,
  Phone,
  MapPin,
  FileText,
  Smartphone,
  CheckCircle,
  X,
  LayoutGrid,
  List,
  Users,
  Calendar,
} from 'lucide-react';

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
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat(language?.startsWith('en') ? 'en-US' : 'pt-BR').format(
    new Date(year, month - 1, day)
  );
};

export const CustomerManagement = () => {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const { allCustomers: customers } = useSelector((state) => state.customer);


  const [clinicalPlans, setClinicalPlans] = useState([]);
  const [prepareMeals, setPrepareMeals] = useState([]);
  const [dietaryRestrictionsList, setDietaryRestrictionsList] = useState([]);
  const [bowelFunctionsList, setBowelFunctionsList] = useState([]);
  const [preExistingConditionsList, setPreExistingConditionsList] = useState([]);
  const [dailyMealsList, setDailyMealsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Navigation mode: 'list' (main view) | 'form' (full-page form view)
  const [viewMode, setViewMode] = useState('list');
  const [displayView, setDisplayView] = useState('cards');
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Mobile App Access enablement state
  const [confirmMobileCustomer, setConfirmMobileCustomer] = useState(null);
  const [enablingMobile, setEnablingMobile] = useState(false);
  const [mobileAlertMsg, setMobileAlertMsg] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      dispatch(fetchAllCustomers());
      const [
        plansData,
        mealsData,
        restrictionsData,
        bowelData,
        preExData,
        dailyData,
      ] = await Promise.all([
        clinicalPlanService.getAll(),
        prepareMealService.getAll(),
        dietaryRestrictionService.getAll(),
        bowelFunctionService.getAll(),
        preExistingConditionsService.getAll(),
        dailyMealService.getAll(),
      ]);

      setClinicalPlans(Array.isArray(plansData) ? plansData : []);
      setPrepareMeals(Array.isArray(mealsData) ? mealsData : []);
      setDietaryRestrictionsList(Array.isArray(restrictionsData) ? restrictionsData : []);
      setBowelFunctionsList(Array.isArray(bowelData) ? bowelData : []);
      setPreExistingConditionsList(Array.isArray(preExData) ? preExData : []);
      setDailyMealsList(Array.isArray(dailyData) ? dailyData : []);
    } catch (err) {
      setError(err?.response?.data?.message || t('customers.errorLoadingList'));
    } finally {
      setLoading(false);
    }
  }, [dispatch, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAddForm = () => {
    setEditingCustomer(null);
    setViewMode('form');
  };

  const handleOpenEditForm = (customer) => {
    setEditingCustomer(customer);
    setViewMode('form');
  };

  const handleOpenEnableMobileModal = (customer) => {
    setConfirmMobileCustomer(customer);
  };

  const handleConfirmEnableMobile = async () => {
    if (!confirmMobileCustomer) return;
    setEnablingMobile(true);
    setError(null);
    try {
      await customerService.enableMobile(confirmMobileCustomer.id);
      setMobileAlertMsg(
        `${t('customers.mobileEnabledSuccess')} "${confirmMobileCustomer.name}"!`
      );
      setConfirmMobileCustomer(null);
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || t('customers.errorEnablingMobile'));
    } finally {
      setEnablingMobile(false);
    }
  };

  const getClinicalPlanName = (id) => {
    const found = clinicalPlans.find((p) => p.id === parseInt(id, 10));
    return found ? found.name : t('common.noPlan');
  };

  const getPrepareMealName = (id) => {
    const found = prepareMeals.find((m) => m.id === parseInt(id, 10));
    return found ? found.name : t('common.notAvailable');
  };

  const displayedCustomers = customers.filter((c) => {
      return (
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone || '').includes(searchTerm)
      );
  });

  // Render Full-Page Add/Edit Form Page
  if (viewMode === 'form') {
    return (
      <CustomerFormPage
        editingCustomer={editingCustomer}
        clinicalPlans={clinicalPlans}
        prepareMeals={prepareMeals}
        dietaryRestrictionsList={dietaryRestrictionsList}
        bowelFunctionsList={bowelFunctionsList}
        preExistingConditionsList={preExistingConditionsList}
        dailyMealsList={dailyMealsList}
        onBack={() => setViewMode('list')}
        onSaveSuccess={() => {
          setViewMode('list');
          loadData();
        }}
      />
    );
  }

  // Render Customer Table List View
  return (
    <div className="user-management-container">
      {/* Top Header */}
      <div className="management-header">
        <div>
          <h2 className="section-title">{t('customers.title')}</h2>
          <p className="section-subtitle">
            {t('customers.subtitle')}
          </p>
        </div>

        <div className="header-action-buttons">
          <button
            type="button"
            className="btn-action-outline"
            onClick={loadData}
            title={t('common.refreshList')}
          >
            <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
            <span>{t('common.refresh')}</span>
          </button>

          <button
            type="button"
            className="btn-action-primary"
            onClick={handleOpenAddForm}
          >
            <Plus size={18} />
            <span>{t('customers.addCustomer')}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#B91C1C',
            fontSize: '0.88rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <X size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B91C1C' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Success Alert for Mobile Enablement */}
      {mobileAlertMsg && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#047857',
            fontSize: '0.88rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} />
            <span>{mobileAlertMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileAlertMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#047857' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="customer-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrapper gold">
            <Users size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{displayedCustomers.length}</span>
            <span className="kpi-label">{t('customers.totalCustomers')}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper emerald">
            <Smartphone size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">
              {displayedCustomers.filter((c) => c.mobileEnabled || c.mobile_enabled).length}
            </span>
            <span className="kpi-label">{t('customers.mobileAccessActive')}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper indigo">
            <FileText size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">
              {displayedCustomers.filter((c) => c.clinicalPlanId || c.clinical_plan_id).length}
            </span>
            <span className="kpi-label">{t('customers.clinicalPlansAssigned')}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar with View Switcher */}
      <div
        className="filter-bar"
        style={{
          marginBottom: '24px',
          width: '100%',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '260px', boxSizing: 'border-box' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#888',
            }}
          />
          <input
            type="text"
            placeholder={t('customers.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px 10px 38px',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #E2E8F0)',
              backgroundColor: 'var(--bg-secondary, #FFF)',
              fontSize: '0.9rem',
            }}
          />
        </div>

        {/* View Mode Toggle Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            background: '#F1F5F9',
            padding: '4px',
            borderRadius: '10px',
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
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: displayView === 'cards' ? '#FFFFFF' : 'transparent',
              color: displayView === 'cards' ? 'var(--text-heading)' : '#64748B',
              boxShadow: displayView === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease',
            }}
            title={t('common.cardsView')}
          >
            <LayoutGrid size={16} />
            <span>{t('common.cards')}</span>
          </button>
          <button
            type="button"
            onClick={() => setDisplayView('table')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: displayView === 'table' ? '#FFFFFF' : 'transparent',
              color: displayView === 'table' ? 'var(--text-heading)' : '#64748B',
              boxShadow: displayView === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease',
            }}
            title={t('common.tableView')}
          >
            <List size={16} />
            <span>{t('common.table')}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Cards or Table */}
      {loading && customers.length === 0 ? (
        <div className="table-card">
          <div className="table-loading-state">
            <RefreshCw size={24} className="spin-icon" />
            <p>{t('customers.loadingCustomers')}</p>
          </div>
        </div>
      ) : displayedCustomers.length === 0 ? (
        <div className="table-card">
          <div className="table-empty-state">
            <UserCheck size={36} />
            <p>{t('customers.noCustomerRegistered')}</p>
            <button type="button" className="btn-action-primary" onClick={handleOpenAddForm}>
              <Plus size={16} />
              <span>{t('customers.registerFirstCustomer')}</span>
            </button>
          </div>
        </div>
      ) : displayView === 'cards' ? (
        /* Customer Cards Grid View */
        <div className="customer-cards-grid">
          {displayedCustomers.map((c) => {
            const planId = c.clinicalPlanId || c.clinical_plan_id;
            const prepareMealId = c.prepareMealId || c.prepare_meal_id;
            const dob = c.dateOfBirth || c.dateOfbirth || c.date_of_birth || '';
            const isMobileEnabled = c.mobileEnabled || c.mobile_enabled;
            const photoSrc = c.photoUrl || c.photo || null;

            return (
              <div key={c.id} className="customer-card">
                <div className="customer-card-header">
                  <div className="customer-card-avatar">
                    {photoSrc ? (
                      <img src={photoSrc} alt={c.name} />
                    ) : (
                      <span>{(c.name || 'P')[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div className="customer-card-title-group">
                    <h3 className="customer-card-name" title={c.name}>
                      {c.name}
                    </h3>
                    <span className="customer-card-id">ID #{c.id}</span>
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
                    <span className="info-text">{c.email || t('customers.noEmail')}</span>
                  </div>
                  <div className="info-row">
                    <Phone size={14} className="info-icon" />
                    <span className="info-text">{formatPhone(c.phone)}</span>
                  </div>
                  <div className="info-row">
                    <MapPin size={14} className="info-icon" />
                    <span className="info-text">
                      {formatAddress(c, t('common.notAvailable'))}
                    </span>
                  </div>

                  <div className="tags-row">
                    {c.gender && <span className="badge-tag gender-tag">{c.gender}</span>}
                    {dob && (
                      <span className="badge-tag dob-tag">
                        <Calendar size={12} /> {formatDate(dob, i18n.resolvedLanguage)}
                      </span>
                    )}
                  </div>

                  <div className="clinical-info-box">
                    <div className="clinical-row">
                      <FileText size={14} className="info-icon text-gold" />
                      <span className="clinical-title">{getClinicalPlanName(planId)}</span>
                    </div>
                    {prepareMealId && (
                      <span className="prepare-meal-subtext">
                        {t('customers.meal')}: {getPrepareMealName(prepareMealId)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="customer-card-footer">
                  <button
                    type="button"
                    className="btn-card-edit"
                    onClick={() => handleOpenEditForm(c)}
                  >
                    <Edit2 size={15} />
                    <span>{t('common.edit')}</span>
                  </button>

                  {!isMobileEnabled && (
                    <button
                      type="button"
                      className="btn-card-mobile"
                      onClick={() => handleOpenEnableMobileModal(c)}
                    >
                      <Smartphone size={15} />
                      <span>{t('customers.activateMobile')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Customer Table List View */
        <div className="table-card">
          <div className="table-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th>{t('customers.customer')}</th>
                  <th>{t('customers.contact')}</th>
                  <th>{t('customers.location')}</th>
                  <th>{t('customers.genderAge')}</th>
                  <th>{t('customers.planMeal')}</th>
                  <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {displayedCustomers.map((c) => {
                  const planId = c.clinicalPlanId || c.clinical_plan_id;
                  const prepareMealId = c.prepareMealId || c.prepare_meal_id;
                  const dob = c.dateOfBirth || c.dateOfbirth || c.date_of_birth || '';
                  const isMobileEnabled = c.mobileEnabled || c.mobile_enabled;

                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="user-table-info">
                          <span className="user-table-name" style={{ fontWeight: '600' }}>
                            {c.name}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#888' }}>
                            ID #{c.id}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mail size={12} style={{ color: 'var(--accent-primary)' }} /> {c.email}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666' }}>
                            <Phone size={12} /> {formatPhone(c.phone)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                          <MapPin size={12} style={{ color: '#888' }} />
                          {formatAddress(c, t('common.notAvailable'))}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          <span className="role-badge" style={{ backgroundColor: '#F1F5F9', color: 'var(--text-heading)' }}>
                            {c.gender}
                          </span>
                          {dob && (
                            <span style={{ marginLeft: '6px', color: '#666', fontSize: '0.8rem' }}>
                              ({formatDate(dob, i18n.resolvedLanguage)})
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className="tenant-name-tag">
                            <FileText size={12} />
                            {getClinicalPlanName(planId)}
                          </span>
                          {prepareMealId && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-body)' }}>
                              {t('customers.meal')}: {getPrepareMealName(prepareMealId)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(c)}
                            title={t('customers.editCustomer')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              border: '1px solid var(--border-color)',
                              backgroundColor: '#FFFFFF',
                              color: '#475569',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            }}
                          >
                            <Edit2 size={16} />
                          </button>

                          {isMobileEnabled ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 12px',
                                borderRadius: '16px',
                                backgroundColor: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                color: '#047857',
                                fontSize: '0.78rem',
                                fontWeight: '600',
                              }}
                              title={t('customers.mobileAppActiveTitle')}
                            >
                              <Smartphone size={14} />
                              <span>{t('customers.mobileActive')}</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenEnableMobileModal(c)}
                              title={t('customers.enableMobileAccess')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                border: '1px solid #FCD34D',
                                backgroundColor: '#FFFBEB',
                                color: '#B45309',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 1px 3px rgba(180, 83, 9, 0.08)',
                              }}
                            >
                              <Smartphone size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enable Mobile Confirmation Modal */}
      {confirmMobileCustomer && (
        <div className="modal-backdrop">
          <div
            className="modal-content"
            style={{
              maxWidth: '480px',
              borderRadius: '16px',
              padding: '28px',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#FEF3C7',
                color: '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <Smartphone size={28} />
            </div>

            <h3
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: '1.3rem',
                color: 'var(--text-heading)',
                margin: '0 0 8px 0',
                fontWeight: '600',
              }}
            >
              {t('customers.enableMobileAccessTitle')}
            </h3>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              {t('customers.enableMobileConfirm')}{' '}
              <strong style={{ color: 'var(--text-heading)' }}>{confirmMobileCustomer.name}</strong>?
            </p>

            <div
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '0.82rem',
                color: '#475569',
                marginBottom: '24px',
              }}
            >
              <p style={{ margin: '0 0 4px 0' }}>
                • <strong>{t('customers.accessEmail')}</strong> {confirmMobileCustomer.email}
              </p>
              <p style={{ margin: '0 0 4px 0' }}>
                • <strong>{t('customers.defaultPassword')}</strong> <code>Mudar123!</code>
              </p>
              <p style={{ margin: 0 }}>
                • <strong>{t('customers.assignedPermission')}</strong> {t('customers.userFirstAccess')}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setConfirmMobileCustomer(null)}
                disabled={enablingMobile}
                style={{ flex: 1, padding: '10px 16px', borderRadius: '24px' }}
              >
                <span>{t('common.cancel')}</span>
              </button>

              <button
                type="button"
                className="btn-action-primary"
                onClick={handleConfirmEnableMobile}
                disabled={enablingMobile}
                style={{ flex: 1, padding: '10px 16px', borderRadius: '24px' }}
              >
                <span>{enablingMobile ? t('customers.enabling') : t('customers.confirmEnable')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
