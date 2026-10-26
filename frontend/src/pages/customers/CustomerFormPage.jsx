import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { createCustomer, updateCustomer } from '../../store/customerSlice';
import { FilterableMultiSelect } from '../../components/common/FilterableMultiSelect';
import {
  customerDietaryRestrictionService,
  customerBowelFunctionService,
  customerPreExistingConditionsService,
  customerDailyMealService,
  provinceService,
  cityService,
} from '../../services/api';
import {
  ChevronRight,
  ArrowLeft,
  User,
  MapPin,
  FileText,
  AlertCircle,
  Activity,
  Heart,
  CalendarDays,
  Save,
  X,
} from 'lucide-react';

// Formats digits into Brazilian phone mask: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
const formatPhone = (phoneStr) => {
  if (!phoneStr) return '';
  const digits = String(phoneStr).replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

// Extracts digits only to send to backend
const stripPhone = (phoneStr) => {
  return (phoneStr || '').replace(/\D/g, '');
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

const countries = [
  { code: 'BR', flag: '🇧🇷', labelKey: 'tenants.brazil' },
  { code: 'US', flag: '🇺🇸', labelKey: 'tenants.unitedStates' },
];

export const CustomerFormPage = ({
  editingCustomer = null,
  clinicalPlans = [],
  prepareMeals = [],
  dietaryRestrictionsList = [],
  bowelFunctionsList = [],
  preExistingConditionsList = [],
  dailyMealsList = [],
  onBack,
  onSaveSuccess,
}) => {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'Feminino',
    addressLine1: '',
    addressLine2: '',
    province: '',
    city: '',
    postalCode: '',
    countryCode: '',
    clinicalPlanId: '',
    prepareMealId: '',
  });

  const [provincesList, setProvincesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Selected associations state
  const [selectedRestrictions, setSelectedRestrictions] = useState([]);
  const [selectedBowelFunctions, setSelectedBowelFunctions] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [selectedDailyMeals, setSelectedDailyMeals] = useState([]);

  // Load cities for selected province
  const loadProvincesForCountry = async (countryCode) => {
    const normalized = countryCode.trim().toUpperCase();
    if (normalized.length !== 2) {
      setProvincesList([]);
      return [];
    }
    setLoadingProvinces(true);
    try {
      const data = await provinceService.getAll(normalized);
      const provinces = Array.isArray(data) ? data : [];
      setProvincesList(provinces);
      return provinces;
    } catch {
      setProvincesList([]);
      return [];
    } finally {
      setLoadingProvinces(false);
    }
  };

  const loadCitiesForProvince = async (provinceVal, provinceOptions = provincesList) => {
    if (!provinceVal) {
      setCitiesList([]);
      return;
    }
    const foundProv = (provinceOptions || []).find(
      (p) =>
        p.acronym.toLowerCase() === provinceVal.toLowerCase() ||
        p.name.toLowerCase() === provinceVal.toLowerCase() ||
        String(p.id) === String(provinceVal)
    );
    if (foundProv && foundProv.id) {
      setLoadingCities(true);
      try {
        const citiesData = await cityService.getByProvinceId(foundProv.id);
        setCitiesList(Array.isArray(citiesData) ? citiesData : []);
      } catch {
        setCitiesList([]);
      } finally {
        setLoadingCities(false);
      }
    } else {
      setCitiesList([]);
    }
  };

  // Initialize form when editing or adding
  useEffect(() => {
    const defaultCountryCode = i18n.resolvedLanguage?.startsWith('en') ? 'US' : 'BR';
    if (editingCustomer) {
      const formattedPhone = formatPhone(editingCustomer.phone || '');
      const custProvince = editingCustomer.administrativeArea || editingCustomer.province || '';
      const custCity = editingCustomer.locality || editingCustomer.city || '';

      setFormData({
        name: editingCustomer.name || '',
        email: editingCustomer.email || '',
        phone: formattedPhone,
        dateOfBirth:
          editingCustomer.dateOfBirth ||
          editingCustomer.dateOfbirth ||
          editingCustomer.date_of_birth ||
          '',
        gender: editingCustomer.gender || 'Feminino',
        addressLine1: editingCustomer.addressLine1 || '',
        addressLine2: editingCustomer.addressLine2 || '',
        province: custProvince,
        city: custCity,
        postalCode: editingCustomer.postalCode || editingCustomer.zipcode || '',
        countryCode: (editingCustomer.countryCode || defaultCountryCode).toUpperCase(),
        clinicalPlanId:
          editingCustomer.clinicalPlanId || editingCustomer.clinical_plan_id || '',
        prepareMealId:
          editingCustomer.prepareMealId || editingCustomer.prepare_meal_id || '',
      });

      const loadAddressOptions = async () => {
        const provinces = await loadProvincesForCountry(editingCustomer.countryCode || defaultCountryCode);
        if (custProvince) await loadCitiesForProvince(custProvince, provinces);
      };
      loadAddressOptions();

      // Fetch customer associations
      const fetchAssociations = async () => {
        try {
          const [restrs, bowels, conds, meals] = await Promise.all([
            customerDietaryRestrictionService.getByCustomerId(editingCustomer.id),
            customerBowelFunctionService.getByCustomerId(editingCustomer.id),
            customerPreExistingConditionsService.getByCustomerId(editingCustomer.id),
            customerDailyMealService.getByCustomerId(editingCustomer.id),
          ]);

          setSelectedRestrictions(
            (restrs || []).map((r) => r.dietaryRestrictionId || r.dietary_restriction_id)
          );
          setSelectedBowelFunctions(
            (bowels || []).map((b) => b.bowelFunctionId || b.bowel_function_id)
          );
          setSelectedConditions(
            (conds || []).map((c) => c.preExistingConditionsId || c.pre_existing_conditions_id)
          );
          setSelectedDailyMeals((meals || []).map((m) => m.dailyMealId || m.daily_meal_id));
        } catch {
          setSelectedRestrictions([]);
          setSelectedBowelFunctions([]);
          setSelectedConditions([]);
          setSelectedDailyMeals([]);
        } finally {
        }
      };

      fetchAssociations();
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: 'Feminino',
        addressLine1: '',
        addressLine2: '',
        province: '',
        city: '',
        postalCode: '',
        countryCode: defaultCountryCode,
        clinicalPlanId: clinicalPlans[0]?.id || '',
        prepareMealId: prepareMeals[0]?.id || '',
      });
      setCitiesList([]);
      loadProvincesForCountry(defaultCountryCode);
      setSelectedRestrictions([]);
      setSelectedBowelFunctions([]);
      setSelectedConditions([]);
      setSelectedDailyMeals([]);
    }
  }, [editingCustomer, clinicalPlans, prepareMeals, i18n.resolvedLanguage]);

  const handleProvinceChange = (selectedProv) => {
    setFormData((prev) => ({ ...prev, province: selectedProv, city: '' }));
    loadCitiesForProvince(selectedProv);
  };

  const handleCountryChange = (value) => {
    const countryCode = value.toUpperCase();
    setFormData((prev) => ({ ...prev, countryCode, province: '', city: '' }));
    setProvincesList([]);
    setCitiesList([]);
    loadProvincesForCountry(countryCode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.dateOfBirth) {
      setError(t('customerForm.requiredFields'));
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: stripPhone(formData.phone),
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      addressLine1: formData.addressLine1.trim() || null,
      addressLine2: formData.addressLine2.trim() || null,
      administrativeArea: formData.province.trim() || null,
      locality: formData.city.trim() || null,
      postalCode: formData.postalCode.trim() || null,
      countryCode: formData.countryCode.trim().toUpperCase() || null,
      clinicalPlanId: formData.clinicalPlanId ? parseInt(formData.clinicalPlanId, 10) : null,
      prepareMealId: formData.prepareMealId ? parseInt(formData.prepareMealId, 10) : null,
    };

    try {
      let savedCustomer;
      if (editingCustomer) {
        const actionRes = await dispatch(updateCustomer({ id: editingCustomer.id, customerData: payload }));
        savedCustomer = actionRes.payload;
      } else {
        const actionRes = await dispatch(createCustomer(payload));
        savedCustomer = actionRes.payload;
      }

      const customerId = savedCustomer.id || editingCustomer?.id;

      if (customerId) {
        // Sync associations
        // 1. Dietary Restrictions
        const existingRestrs = await customerDietaryRestrictionService.getByCustomerId(customerId);
        const existingRestrIds = (existingRestrs || []).map(
          (r) => r.dietaryRestrictionId || r.dietary_restriction_id
        );

        for (const id of selectedRestrictions) {
          if (!existingRestrIds.includes(id)) {
            await customerDietaryRestrictionService.create({
              customerId,
              dietaryRestrictionId: id,
            });
          }
        }
        for (const id of existingRestrIds) {
          if (!selectedRestrictions.includes(id)) {
            await customerDietaryRestrictionService.delete(customerId, id);
          }
        }

        // 2. Bowel Functions
        const existingBowels = await customerBowelFunctionService.getByCustomerId(customerId);
        const existingBowelIds = (existingBowels || []).map(
          (b) => b.bowelFunctionId || b.bowel_function_id
        );

        for (const id of selectedBowelFunctions) {
          if (!existingBowelIds.includes(id)) {
            await customerBowelFunctionService.create({
              customerId,
              bowelFunctionId: id,
            });
          }
        }
        for (const id of existingBowelIds) {
          if (!selectedBowelFunctions.includes(id)) {
            await customerBowelFunctionService.delete(customerId, id);
          }
        }

        // 3. Pre-existing Conditions
        const existingConds = await customerPreExistingConditionsService.getByCustomerId(customerId);
        const existingCondIds = (existingConds || []).map(
          (c) => c.preExistingConditionsId || c.pre_existing_conditions_id
        );

        for (const id of selectedConditions) {
          if (!existingCondIds.includes(id)) {
            await customerPreExistingConditionsService.create({
              customerId,
              preExistingConditionsId: id,
            });
          }
        }
        for (const id of existingCondIds) {
          if (!selectedConditions.includes(id)) {
            await customerPreExistingConditionsService.delete(customerId, id);
          }
        }

        // 4. Daily Meals
        const existingMeals = await customerDailyMealService.getByCustomerId(customerId);
        const existingMealIds = (existingMeals || []).map(
          (m) => m.dailyMealId || m.daily_meal_id
        );

        for (const id of selectedDailyMeals) {
          if (!existingMealIds.includes(id)) {
            await customerDailyMealService.create({
              customerId,
              dailyMealId: id,
            });
          }
        }
        for (const id of existingMealIds) {
          if (!selectedDailyMeals.includes(id)) {
            await customerDailyMealService.delete(customerId, id);
          }
        }
      }

      onSaveSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || t('customerForm.errorSavingCustomer'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px', boxSizing: 'border-box' }}>
      {/* Breadcrumb Navigation Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          color: 'var(--text-body)',
          marginBottom: '16px',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-primary)',
            cursor: 'pointer',
            fontWeight: '600',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <ArrowLeft size={16} />
          <span>{t('customerForm.customerManagement')}</span>
        </button>
        <ChevronRight size={14} style={{ color: 'var(--text-body)' }} />
        <span style={{ color: 'var(--text-heading)', fontWeight: '500' }}>
          {editingCustomer
            ? t('customerForm.editCustomer', { name: editingCustomer.name })
            : t('customerForm.registerNewCustomer')}
        </span>
      </div>

      {/* Header Bar */}
      <div
        style={{
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <h2
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: '1.6rem',
            color: 'var(--text-heading)',
            margin: '0 0 4px 0',
            fontWeight: '500',
          }}
        >
          {editingCustomer ? t('customerForm.editPatientFile') : t('customerForm.registerNewPatient')}
        </h2>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-body)' }}>
          {editingCustomer
            ? t('customerForm.editSubtitle')
            : t('customerForm.registerSubtitle')}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
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
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B91C1C' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} style={{ boxSizing: 'border-box', width: '100%' }}>
        {/* Section 1: Dados Pessoais & Contato */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px 32px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          <h3
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: '1.1rem',
              color: 'var(--accent-primary)',
              margin: '0 0 20px 0',
              paddingBottom: '8px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <User size={18} />
            <span>{t('customerForm.section1Title')}</span>
          </h3>

          <div style={{ marginBottom: '16px', width: '100%', boxSizing: 'border-box' }}>
            <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
              {t('customerForm.fullName')}
            </label>
            <input
              type="text"
              placeholder={t('customerForm.fullNamePlaceholder')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '0.88rem',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('customerForm.emailLabel')}
              </label>
              <input
                type="email"
                placeholder={t('customerForm.emailPlaceholder')}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.88rem',
                }}
              />
            </div>
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('customerForm.phoneLabel')}
              </label>
              <input
                type="text"
                placeholder={t('customerForm.phonePlaceholder')}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.88rem',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('customerForm.dateOfBirth')}
              </label>
              <input
                type="date"
                lang={i18n.resolvedLanguage?.startsWith('en') ? 'en-US' : 'pt-BR'}
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.88rem',
                }}
              />
            </div>
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('customerForm.gender')}
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#FFF',
                  fontSize: '0.88rem',
                }}
              >
                <option value="Feminino">{t('customerForm.female')}</option>
                <option value="Masculino">{t('customerForm.male')}</option>
                <option value="Outro">{t('customerForm.other')}</option>
              </select>
            </div>
          </div>

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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', width: '100%', boxSizing: 'border-box', marginBottom: '20px' }}>
            {['addressLine1', 'addressLine2', 'postalCode'].map((field) => (
              <div key={field}>
                <label style={labelStyle}>{t(`address.${field}`)}</label>
                <input style={fieldStyle} type="text" value={formData[field]} onChange={(event) => setFormData({ ...formData, [field]: event.target.value })} />
              </div>
            ))}
          </div>

          {/* Filterable Single-Select Dropdowns for Province & City */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
            <FilterableMultiSelect
              label={t('customerForm.stateProvince')}
              icon={MapPin}
              iconColor="var(--accent-primary)"
              options={provincesList.map((p) => ({ id: p.acronym, name: `${p.acronym} - ${p.name}` }))}
              selectedIds={formData.province ? [formData.province] : []}
              onChange={(vals) => handleProvinceChange(vals[0] || '')}
              placeholder={loadingProvinces ? t('tenants.loadingProvinces') : t('customerForm.selectState')}
              emptyMessage={t('customerForm.noStateFound')}
              isSingleSelect={true}
              disabled={loadingProvinces}
            />

            <FilterableMultiSelect
              label={t('customerForm.city')}
              icon={MapPin}
              iconColor="var(--accent-primary)"
              options={citiesList.map((c) => ({ id: c.name, name: c.name }))}
              selectedIds={formData.city ? [formData.city] : []}
              onChange={(vals) => setFormData((prev) => ({ ...prev, city: vals[0] || '' }))}
              placeholder={
                !formData.province
                  ? t('customerForm.selectStatFirst')
                  : loadingCities
                  ? t('customerForm.loadingCities')
                  : t('customerForm.searchCity')
              }
              emptyMessage={t('customerForm.noCityFound')}
              isSingleSelect={true}
              disabled={!formData.province || loadingCities}
            />
          </div>
        </div>

        {/* Section 2: Plano Clínico & Refeição de Preparo */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px 32px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          <h3
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: '1.1rem',
              color: 'var(--accent-primary)',
              margin: '0 0 20px 0',
              paddingBottom: '8px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FileText size={18} />
            <span>{t('customerForm.section2Title')}</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('customerForm.clinicalPlan')}
              </label>
              <select
                value={formData.clinicalPlanId}
                onChange={(e) => setFormData({ ...formData, clinicalPlanId: e.target.value })}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#FFF',
                  fontSize: '0.88rem',
                }}
              >
                <option value="">{t('customerForm.selectPlan')}</option>
                {clinicalPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('customerForm.prepareMeal')}
              </label>
              <select
                value={formData.prepareMealId}
                onChange={(e) => setFormData({ ...formData, prepareMealId: e.target.value })}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#FFF',
                  fontSize: '0.88rem',
                }}
              >
                <option value="">{t('customerForm.selectMeal')}</option>
                {prepareMeals.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Associação de Parâmetros Clínicos */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px 32px',
            marginBottom: '32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          <h3
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: '1.1rem',
              color: 'var(--accent-primary)',
              margin: '0 0 20px 0',
              paddingBottom: '8px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Activity size={18} />
            <span>{t('customerForm.section3Title')}</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
            {/* Dietary Restrictions */}
            <FilterableMultiSelect
              label={t('customerForm.dietaryRestrictions')}
              icon={AlertCircle}
              iconColor="#E11D48"
              options={dietaryRestrictionsList}
              selectedIds={selectedRestrictions}
              onChange={setSelectedRestrictions}
              placeholder={t('customerForm.selectRestrictions')}
              emptyMessage={t('customerForm.noRestrictions')}
            />

            {/* Bowel Functions */}
            <FilterableMultiSelect
              label={t('customerForm.bowelFunction')}
              icon={Activity}
              iconColor="#2563EB"
              options={bowelFunctionsList}
              selectedIds={selectedBowelFunctions}
              onChange={setSelectedBowelFunctions}
              placeholder={t('customerForm.selectBowelFunctions')}
              emptyMessage={t('customerForm.noBowelFunctions')}
            />

            {/* Pre-existing Conditions */}
            <FilterableMultiSelect
              label={t('customerForm.preExistingConditions')}
              icon={Heart}
              iconColor="#D97706"
              options={preExistingConditionsList}
              selectedIds={selectedConditions}
              onChange={setSelectedConditions}
              placeholder={t('customerForm.selectConditions')}
              emptyMessage={t('customerForm.noConditions')}
            />

            {/* Daily Meals */}
            <FilterableMultiSelect
              label={t('customerForm.dailyMeals')}
              icon={CalendarDays}
              iconColor="#059669"
              options={dailyMealsList}
              selectedIds={selectedDailyMeals}
              onChange={setSelectedDailyMeals}
              placeholder={t('customerForm.selectDailyMeals')}
              emptyMessage={t('customerForm.noDailyMeals')}
            />
          </div>
        </div>

        {/* Page Footer Action Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '24px',
            marginTop: '16px',
            borderTop: '1px solid var(--border-color)',
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          <button
            type="button"
            onClick={onBack}
            className="btn-modal-cancel"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '24px',
              border: '1px solid var(--border-color)',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontFamily: "'Jost', sans-serif",
              fontSize: '0.88rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <X size={16} />
            <span>{t('common.cancel')}</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="btn-action-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
              color: '#FFFFFF',
              fontFamily: "'Jost', sans-serif",
              fontSize: '0.88rem',
              fontWeight: '600',
              letterSpacing: '0.04em',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(29, 111, 209, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            <Save size={18} />
            <span>{saving ? t('common.saving') : editingCustomer ? t('common.saveChanges') : t('customerForm.registerCustomer')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
