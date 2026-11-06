import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Building, ChevronRight, MapPin, Save, X } from 'lucide-react';
import { createTenant, updateTenant } from '../../store/tenantSlice';
import { cityService, provinceService } from '../../services';
import { FilterableMultiSelect } from '../../components/common/FilterableMultiSelect';
import { maskTaxId } from '../../utils/format';
import { isValidTaxId } from '../../utils/taxId';

const emptyTenantForm = {
  name: '',
  taxId: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  administrativeArea: '',
  locality: '',
  postalCode: '',
  countryCode: 'BR',
};

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid var(--border-color)',
  backgroundColor: '#FFF',
  fontSize: '0.88rem',
};

const labelStyle = {
  display: 'block',
  marginBottom: '6px',
  color: 'var(--text-heading)',
  fontSize: '0.85rem',
  fontWeight: '600',
};

const sectionStyle = {
  width: '100%',
  boxSizing: 'border-box',
  marginBottom: '24px',
  padding: '24px 32px',
  border: '1px solid var(--border-color)',
  borderRadius: '12px',
  backgroundColor: '#FFFFFF',
  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
};

const countries = [
  { code: 'BR', flag: '🇧🇷', labelKey: 'tenants.brazil' },
  { code: 'US', flag: '🇺🇸', labelKey: 'tenants.unitedStates' },
];

export const TenantFormPage = ({ editingTenant = null, onBack, onSaveSuccess }) => {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const { loading, error: tenantError } = useSelector((state) => state.tenant);
  const [formData, setFormData] = useState(emptyTenantForm);
  const [provincesList, setProvincesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [error, setError] = useState(null);

  const loadProvinces = useCallback(async (countryCode) => {
    setLoadingProvinces(true);
    try {
      const data = await provinceService.getAll(countryCode);
      const provinces = Array.isArray(data) ? data : [];
      setProvincesList(provinces);
      return provinces;
    } catch {
      setProvincesList([]);
      setError(t('tenants.errorLoadingProvinces'));
      return [];
    } finally {
      setLoadingProvinces(false);
    }
  }, [t]);

  const loadCities = useCallback(async (administrativeArea, provinceOptions) => {
    const province = provinceOptions.find((item) => item.acronym === administrativeArea);
    if (!province) {
      setCitiesList([]);
      return;
    }
    setLoadingCities(true);
    try {
      const data = await cityService.getByProvinceId(province.id);
      setCitiesList(Array.isArray(data) ? data : []);
    } catch {
      setCitiesList([]);
      setError(t('tenants.errorLoadingCities'));
    } finally {
      setLoadingCities(false);
    }
  }, [t]);

  useEffect(() => {
    const initializeForm = async () => {
      const languageCountryCode = i18n.resolvedLanguage?.startsWith('en') ? 'US' : 'BR';
      const countryCode = (editingTenant?.countryCode || languageCountryCode).toUpperCase();
      const administrativeArea = editingTenant?.administrativeArea || editingTenant?.province || '';
      setFormData(editingTenant ? {
        name: editingTenant.name || '',
        taxId: maskTaxId(editingTenant.taxId),
        email: editingTenant.email || '',
        phone: editingTenant.phone || '',
        addressLine1: editingTenant.addressLine1 || '',
        addressLine2: editingTenant.addressLine2 || '',
        administrativeArea,
        locality: editingTenant.locality || editingTenant.city || '',
        postalCode: editingTenant.postalCode || editingTenant.zipcode || '',
        countryCode,
      } : { ...emptyTenantForm, countryCode });

      setCitiesList([]);
      const provinces = await loadProvinces(countryCode);
      if (administrativeArea) await loadCities(administrativeArea, provinces);
    };

    initializeForm();
  }, [editingTenant, i18n.resolvedLanguage, loadCities, loadProvinces]);

  const handleCountryChange = async (countryCode) => {
    setError(null);
    setFormData((current) => ({
      ...current,
      countryCode,
      administrativeArea: '',
      locality: '',
    }));
    setProvincesList([]);
    setCitiesList([]);
    await loadProvinces(countryCode);
  };

  const handleProvinceChange = (administrativeArea) => {
    setFormData((current) => ({ ...current, administrativeArea, locality: '' }));
    setCitiesList([]);
    loadCities(administrativeArea, provincesList);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    if (!formData.name.trim()) {
      setError(t('tenants.nameRequired'));
      return;
    }

    if (formData.taxId.trim() && !isValidTaxId(formData.taxId)) {
      setError(t('tenants.taxIdInvalid'));
      return;
    }

    const tenantData = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [key, value.trim() || null])
    );
    const result = editingTenant
      ? await dispatch(updateTenant({ id: editingTenant.id, tenantData }))
      : await dispatch(createTenant(tenantData));

    if (!result.error) onSaveSuccess();
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-body)', marginBottom: '16px' }}>
        <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: '600', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeft size={16} />
          <span>{t('tenants.title')}</span>
        </button>
        <ChevronRight size={14} style={{ color: 'var(--text-body)' }} />
        <span style={{ color: 'var(--text-heading)', fontWeight: '500' }}>
          {editingTenant ? t('tenants.editTenant') : t('tenants.registerNewTenant')}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px 16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
        <h2 style={{ fontFamily: "'Jost', sans-serif", fontSize: '1.6rem', color: 'var(--text-heading)', margin: 0, fontWeight: '500' }}>
          {editingTenant ? t('tenants.editTenant') : t('tenants.registerNewTenant')}
        </h2>
        <p style={{ margin: '0 0 0 auto', fontSize: '0.9rem', color: 'var(--text-body)', textAlign: 'right' }}>
          {editingTenant ? t('tenants.editSubtitle') : t('tenants.registerSubtitle')}
        </p>
      </div>

      {(error || tenantError) && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '12px 16px', color: '#B91C1C', fontSize: '0.88rem', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error || tenantError}</span>
          <button type="button" onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B91C1C' }}><X size={16} /></button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <section style={sectionStyle}>
          <h3 style={{ fontFamily: "'Jost', sans-serif", fontSize: '1.1rem', color: 'var(--accent-primary)', margin: '0 0 20px', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={18} /> {t('tenants.clinicDetails')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(240px, 2fr)', gap: '20px', marginBottom: '20px' }}>
            <div><label style={labelStyle}>{t('tenants.taxId')}</label><input style={fieldStyle} inputMode="numeric" autoComplete="off" placeholder="00.000.000/0000-00" value={formData.taxId} onChange={(event) => setFormData({ ...formData, taxId: maskTaxId(event.target.value) })} /></div>
            <div><label style={labelStyle}>{t('tenants.clinicName')}</label><input style={fieldStyle} value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} required /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div><label style={labelStyle}>{t('common.email')}</label><input style={fieldStyle} type="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} /></div>
            <div><label style={labelStyle}>{t('tenants.phone')}</label><input style={fieldStyle} type="tel" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} /></div>
          </div>
        </section>

        <section style={sectionStyle}>
          <h3 style={{ fontFamily: "'Jost', sans-serif", fontSize: '1.1rem', color: 'var(--accent-primary)', margin: '0 0 20px', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} /> {t('tenants.location')}
          </h3>

          <div style={{ marginBottom: '20px' }}>
            <span style={labelStyle}>{t('address.countryCode')}</span>
            <div role="radiogroup" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {countries.map((country) => {
                const selected = formData.countryCode === country.code;
                return (
                  <label key={country.code} style={{ minWidth: '180px', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', border: `1px solid ${selected ? 'var(--accent-primary)' : '#CBD5E1'}`, borderRadius: '10px', background: selected ? 'var(--bg-primary)' : '#FFF', cursor: 'pointer' }}>
                    <input type="radio" name="countryCode" value={country.code} checked={selected} onChange={() => handleCountryChange(country.code)} />
                    <span aria-hidden="true" style={{ fontSize: '1.5rem', lineHeight: 1 }}>{country.flag}</span>
                    <span style={{ color: 'var(--text-heading)', fontWeight: '600' }}>{t(country.labelKey)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div><label style={labelStyle}>{t('address.addressLine1')}</label><input style={fieldStyle} value={formData.addressLine1} onChange={(event) => setFormData({ ...formData, addressLine1: event.target.value })} /></div>
            <div><label style={labelStyle}>{t('address.addressLine2')}</label><input style={fieldStyle} value={formData.addressLine2} onChange={(event) => setFormData({ ...formData, addressLine2: event.target.value })} /></div>
            <div><label style={labelStyle}>{t('address.postalCode')}</label><input style={fieldStyle} value={formData.postalCode} onChange={(event) => setFormData({ ...formData, postalCode: event.target.value })} /></div>
            <FilterableMultiSelect
              label={t('address.administrativeArea')}
              icon={MapPin}
              iconColor="var(--accent-primary)"
              options={provincesList.map((province) => ({ id: province.acronym, name: `${province.acronym} - ${province.name}` }))}
              selectedIds={formData.administrativeArea ? [formData.administrativeArea] : []}
              onChange={(values) => handleProvinceChange(values[0] || '')}
              placeholder={loadingProvinces ? t('tenants.loadingProvinces') : t('address.selectProvince')}
              emptyMessage={t('customerForm.noStateFound')}
              isSingleSelect={true}
              disabled={loadingProvinces}
            />
            <FilterableMultiSelect
              label={t('address.locality')}
              icon={MapPin}
              iconColor="var(--accent-primary)"
              options={citiesList.map((city) => ({ id: city.name, name: city.name }))}
              selectedIds={formData.locality ? [formData.locality] : []}
              onChange={(values) => setFormData((current) => ({ ...current, locality: values[0] || '' }))}
              placeholder={loadingCities ? t('tenants.loadingCities') : t('address.selectCity')}
              emptyMessage={t('customerForm.noCityFound')}
              isSingleSelect={true}
              disabled={!formData.administrativeArea || loadingCities}
            />
          </div>
        </section>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '24px', marginTop: '16px', borderTop: '1px solid var(--border-color)', boxSizing: 'border-box', width: '100%' }}>
          <button type="button" onClick={onBack} className="btn-modal-cancel" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: '#FFFFFF', color: '#475569', fontFamily: "'Jost', sans-serif", fontSize: '0.88rem', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <X size={16} />
            <span>{t('common.cancel')}</span>
          </button>
          <button type="submit" className="btn-action-primary" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '24px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))', color: '#FFFFFF', fontFamily: "'Jost', sans-serif", fontSize: '0.88rem', fontWeight: '600', letterSpacing: '0.04em', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(29, 111, 209, 0.3)', transition: 'all 0.2s ease' }}>
            <Save size={18} />
            <span>{loading ? t('tenants.saving') : editingTenant ? t('common.saveChanges') : t('tenants.createTenant')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
