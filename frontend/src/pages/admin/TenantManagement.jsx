import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchTenants, setActiveTenant } from '../../store/tenantSlice';
import { Building, Plus, Check, RefreshCw, ShieldAlert, Pencil, MapPin, CreditCard } from 'lucide-react';
import { TenantFormPage } from './TenantFormPage';
import { TenantPlanPage } from './TenantPlanPage';
import { ROLES } from '../../utils/enums';

export const TenantManagement = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { tenantsList, activeTenant, loading } = useSelector((state) => state.tenant);
  const { user } = useSelector((state) => state.auth);

  const isSysAdmin = user?.role === ROLES.SYS_ADMIN;

  const [viewMode, setViewMode] = useState('list');
  const [editingTenant, setEditingTenant] = useState(null);

  useEffect(() => {
    dispatch(fetchTenants());
  }, [dispatch]);

  const openCreatePage = () => {
    setEditingTenant(null);
    setViewMode('form');
  };

  const openEditPage = (tenant) => {
    setEditingTenant(tenant);
    setViewMode('form');
  };

  const openPlanPage = (tenant) => {
    setEditingTenant(tenant);
    setViewMode('plan');
  };

  const formatAddress = (tenant) => {
    const lines = [tenant.addressLine1, tenant.addressLine2].filter(Boolean);
    const region = [tenant.locality || tenant.city, tenant.administrativeArea || tenant.province].filter(Boolean).join(', ');
    if (region) lines.push(region);
    const postalCountry = [tenant.postalCode || tenant.zipcode, tenant.countryCode].filter(Boolean).join(' · ');
    if (postalCountry) lines.push(postalCountry);
    return lines.join(' — ');
  };

  if (!isSysAdmin) {
    return (
      <div className="access-denied-box">
        <ShieldAlert size={48} />
        <h3>{t('tenants.restrictedAccess')}</h3>
        <p>{t('tenants.sysAdminOnly')}</p>
      </div>
    );
  }

  if (viewMode === 'form') {
    return (
      <TenantFormPage
        editingTenant={editingTenant}
        onBack={() => setViewMode('list')}
        onSaveSuccess={() => {
          setViewMode('list');
          setEditingTenant(null);
          dispatch(fetchTenants());
        }}
      />
    );
  }

  if (viewMode === 'plan') {
    return (
      <TenantPlanPage
        tenant={editingTenant}
        onBack={() => setViewMode('list')}
        onSaveSuccess={() => {
          setViewMode('list');
          setEditingTenant(null);
          dispatch(fetchTenants());
        }}
      />
    );
  }

  return (
    <div className="tenant-management-container">
      <div className="management-header">
        <div>
          <h2 className="section-title">{t('tenants.title')}</h2>
          <p className="section-subtitle">
            {t('tenants.subtitle')}
          </p>
        </div>

        <div className="header-action-buttons">
          <button
            type="button"
            className="btn-action-outline"
            onClick={() => dispatch(fetchTenants())}
          >
            <RefreshCw size={16} />
            <span>{t('common.refresh')}</span>
          </button>

          <button
            type="button"
            className="btn-action-primary"
            onClick={openCreatePage}
          >
            <Plus size={18} />
            <span>{t('tenants.newTenant')}</span>
          </button>
        </div>
      </div>

      {/* Tenants Grid / Cards */}
      {loading && tenantsList.length === 0 ? (
        <div className="table-card">
          <div className="table-loading-state">
            <RefreshCw size={24} className="spin-icon" />
            <p>{t('tenants.loadingTenants')}</p>
          </div>
        </div>
      ) : tenantsList.length === 0 ? (
        <div className="table-card">
          <div className="table-empty-state">
            <Building size={36} />
            <p>{t('tenants.noTenantsFound')}</p>
            <button type="button" className="btn-action-primary" onClick={openCreatePage}>
              <Plus size={16} />
              <span>{t('tenants.addFirstTenant')}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="tenants-grid">
          {tenantsList.map((tenant) => {
          const isActive = activeTenant?.id === tenant.id;
          return (
            <div key={tenant.id} className={`tenant-card ${isActive ? 'active-tenant-card' : ''}`}>
              <div className="tenant-card-header">
                <div className="tenant-icon-box">
                  <Building size={24} />
                </div>
                {isActive && (
                  <span className="active-badge">
                    <Check size={12} /> {t('tenants.selected')}
                  </span>
                )}
              </div>

              <div className="tenant-card-body">
                <h3>{tenant.name}</h3>
                <p className="tenant-uuid">UUID: {tenant.uuid || 'N/A'}</p>
                <p className="tenant-id-label">{t('tenants.dbId')}: #{tenant.id}</p>
                {tenant.email && <p className="tenant-id-label">{tenant.email}</p>}
                {tenant.phone && <p className="tenant-id-label">{tenant.phone}</p>}
                {formatAddress(tenant) && <p className="tenant-id-label"><MapPin size={13} /> {formatAddress(tenant)}</p>}
              </div>

              <div className="tenant-card-footer">
                <button
                  type="button"
                  className={`btn-select-tenant ${isActive ? 'is-active' : ''}`}
                  onClick={() => dispatch(setActiveTenant(tenant))}
                  disabled={isActive}
                >
                  {isActive ? (
                    <>
                      <Check size={14} /> {t('tenants.currentTenant')}
                    </>
                  ) : (
                    t('tenants.switchView')
                  )}
                </button>
                <div className="tenant-card-actions-row">
                  <button type="button" className="btn-card-action" onClick={() => openEditPage(tenant)}>
                    <Pencil size={14} /> <span>{t('common.edit')}</span>
                  </button>
                  <button type="button" className="btn-card-action btn-card-action-highlight" onClick={() => openPlanPage(tenant)}>
                    <CreditCard size={14} /> <span>{t('tenants.managePlan')}</span>
                  </button>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}

    </div>
  );
};
