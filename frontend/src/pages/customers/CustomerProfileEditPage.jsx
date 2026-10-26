import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { updateCustomer, uploadCustomerPhoto } from '../../store/customerSlice';
import { FilterableMultiSelect } from '../../components/common/FilterableMultiSelect';
import {
  customerService,
  customerDietaryRestrictionService,
  customerBowelFunctionService,
  customerPreExistingConditionsService,
  customerDailyMealService,
  clinicalPlanService,
  prepareMealService,
  dietaryRestrictionService,
  bowelFunctionService,
  preExistingConditionsService,
  dailyMealService,
  provinceService,
  cityService,
} from '../../services/api';
import {
  User,
  MapPin,
  FileText,
  AlertCircle,
  Activity,
  Save,
  Camera,
  Check,
  Lock,
  Sparkles,
} from 'lucide-react';

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

const stripPhone = (phoneStr) => {
  return (phoneStr || '').replace(/\D/g, '');
};



export const CustomerProfileEditPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [customer, setCustomer] = useState(null);

  // Form Fields
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
    photo: '',
  });

  // Photo state
  const [photoPreview, setPhotoPreview] = useState(null);

  // Reference lists
  const [provincesList, setProvincesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [clinicalPlans, setClinicalPlans] = useState([]);
  const [prepareMeals, setPrepareMeals] = useState([]);
  const [dietaryRestrictionsList, setDietaryRestrictionsList] = useState([]);
  const [bowelFunctionsList, setBowelFunctionsList] = useState([]);
  const [preExistingConditionsList, setPreExistingConditionsList] = useState([]);
  const [dailyMealsList, setDailyMealsList] = useState([]);

  // Selected associations
  const [selectedRestrictions, setSelectedRestrictions] = useState([]);
  const [selectedBowelFunctions, setSelectedBowelFunctions] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [selectedDailyMeals, setSelectedDailyMeals] = useState([]);

  // 1. Initial Load of Master Options and Current Customer Profile
  useEffect(() => {
    const fetchMasterDataAndProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          cPlans,
          pMeals,
          dRestrs,
          bFuncs,
          pConds,
          dMeals,
        ] = await Promise.all([
          clinicalPlanService.getAll().catch(() => []),
          prepareMealService.getAll().catch(() => []),
          dietaryRestrictionService.getAll().catch(() => []),
          bowelFunctionService.getAll().catch(() => []),
          preExistingConditionsService.getAll().catch(() => []),
          dailyMealService.getAll().catch(() => []),
        ]);

        setClinicalPlans(cPlans || []);
        setPrepareMeals(pMeals || []);
        setDietaryRestrictionsList(dRestrs || []);
        setBowelFunctionsList(bFuncs || []);
        setPreExistingConditionsList(pConds || []);
        setDailyMealsList(dMeals || []);

        // Load Customer Profile for current logged in user
        const custData = await customerService.getMe();
        if (custData) {
          const provs = (custData.countryCode || '').trim().length === 2
            ? await provinceService.getAll(custData.countryCode).catch(() => [])
            : [];
          setProvincesList(Array.isArray(provs) ? provs : []);
          setCustomer(custData);
          setFormData({
            name: custData.name || '',
            email: custData.email || user?.email || '',
            phone: formatPhone(custData.phone || ''),
            dateOfBirth: custData.dateOfBirth || custData.date_of_birth || '',
            gender: custData.gender || 'Feminino',
            addressLine1: custData.addressLine1 || '',
            addressLine2: custData.addressLine2 || '',
            province: custData.administrativeArea || custData.province || '',
            city: custData.locality || custData.city || '',
            postalCode: custData.postalCode || custData.zipcode || '',
            countryCode: custData.countryCode || '',
            clinicalPlanId: custData.clinicalPlanId || custData.clinical_plan_id || '',
            prepareMealId: custData.prepareMealId || custData.prepare_meal_id || '',
            photo: custData.photo || '',
          });
          setPhotoPreview(custData.photoUrl || custData.photoBase64 || custData.photo || null);

          // Fetch customer's active associations
          if (custData.id) {
            const [restrs, bowels, conds, meals] = await Promise.all([
              customerDietaryRestrictionService.getByCustomerId(custData.id).catch(() => []),
              customerBowelFunctionService.getByCustomerId(custData.id).catch(() => []),
              customerPreExistingConditionsService.getByCustomerId(custData.id).catch(() => []),
              customerDailyMealService.getByCustomerId(custData.id).catch(() => []),
            ]);

            setSelectedRestrictions((restrs || []).map((r) => r.dietaryRestrictionId || r.dietary_restriction_id));
            setSelectedBowelFunctions((bowels || []).map((b) => b.bowelFunctionId || b.bowel_function_id));
            setSelectedConditions((conds || []).map((c) => c.preExistingConditionsId || c.pre_existing_conditions_id));
            setSelectedDailyMeals((meals || []).map((m) => m.dailyMealId || m.daily_meal_id));
          }

          const customerProvince = custData.administrativeArea || custData.province || '';
          if (customerProvince) {
            loadCitiesForProvince(customerProvince, provs);
          }
        }
      } catch (err) {
        console.error('Error fetching customer profile:', err);
        setError(t('customerProfile.errorLoading'));
      } finally {
        setLoading(false);
      }
    };

    fetchMasterDataAndProfile();
  }, [user]);

  const loadCitiesForProvince = async (provinceVal, provList = provincesList) => {
    if (!provinceVal) {
      setCitiesList([]);
      return;
    }
    const foundProv = (provList || []).find(
      (p) =>
        p.acronym.toLowerCase() === provinceVal.toLowerCase() ||
        p.name.toLowerCase() === provinceVal.toLowerCase() ||
        String(p.id) === String(provinceVal)
    );
    if (foundProv && foundProv.id) {
      setLoadingCities(true);
      try {
        const cities = await cityService.getByProvinceId(foundProv.id);
        setCitiesList(cities || []);
      } catch {
        setCitiesList([]);
      } finally {
        setLoadingCities(false);
      }
    } else {
      setCitiesList([]);
    }
  };

  const handleInputChange = (field, value) => {
    if (successMessage) setSuccessMessage(null);
    if (error) setError(null);

    let val = value;
    if (field === 'phone') {
      val = formatPhone(value);
    }

    if (field === 'countryCode') {
      val = value.toUpperCase();
      setFormData((prev) => ({ ...prev, countryCode: val, province: '', city: '' }));
      setProvincesList([]);
      setCitiesList([]);
      if (val.trim().length === 2) {
        provinceService.getAll(val).then((data) => {
          setProvincesList(Array.isArray(data) ? data : []);
        }).catch(() => setProvincesList([]));
      }
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: val }));

    if (field === 'province') {
      loadCitiesForProvince(val);
      setFormData((prev) => ({ ...prev, province: val, city: '' }));
    }
  };

  // Photo Selection & Base64 Upload
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(t('customerProfile.invalidImage'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(t('customerProfile.imageTooLarge'));
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result;
      setPhotoPreview(result);

      if (customer?.id) {
        // Strip data:image/...;base64, header prefix if present
        const base64Data = result.includes(',') ? result.split(',')[1] : result;
        const extension = file.name.split('.').pop() || 'jpg';
        const contentType = file.type || 'image/jpeg';

        setUploadingPhoto(true);
        try {
          const actionRes = await dispatch(uploadCustomerPhoto({ id: customer.id, imageBase64: base64Data, extension, contentType }));
          const photoRes = actionRes.payload;
          const newPhotoUrl = photoRes?.signed_url || photoRes?.signedUrl || photoRes?.customer?.photoUrl || photoRes?.customer?.photo_url || photoRes?.customer?.photoBase64 || photoRes?.customer?.photo;
          if (newPhotoUrl) {
            setPhotoPreview(newPhotoUrl);
            setFormData((prev) => ({ ...prev, photo: newPhotoUrl }));
            setSuccessMessage(t('customerProfile.photoSuccess'));
          }
        } catch (err) {
          console.error('Error uploading photo:', err);
          setError(t('customerProfile.photoError'));
        } finally {
          setUploadingPhoto(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Form Save Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer?.id) {
      setError(t('customerProfile.noCustomerToSave'));
      return;
    }

    if (!formData.name.trim()) {
      setError(t('customerProfile.nameRequired'));
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        ...customer,
        name: formData.name.trim(),
        email: customer.email, // Email stays unchanged
        phone: stripPhone(formData.phone),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        addressLine1: formData.addressLine1.trim() || null,
        addressLine2: formData.addressLine2.trim() || null,
        administrativeArea: formData.province || null,
        locality: formData.city || null,
        postalCode: formData.postalCode.trim() || null,
        countryCode: formData.countryCode.trim().toUpperCase() || null,
        clinicalPlanId: formData.clinicalPlanId ? Number(formData.clinicalPlanId) : null,
        prepareMealId: formData.prepareMealId ? Number(formData.prepareMealId) : null,
        photo: formData.photo || photoPreview || customer.photo,
      };

      const actionRes = await dispatch(updateCustomer({ id: customer.id, customerData: payload }));
      const updatedCust = actionRes.payload;
      if (updatedCust) setCustomer(updatedCust);

      // Update multi-select join tables
      const syncJoinTable = async (getService, selectedIds, keyName) => {
        try {
          const currentItems = await getService.getByCustomerId(customer.id);
          const currentIds = (currentItems || []).map((item) => item[keyName] || item[keyName.replace(/([A-Z])/g, '_$1').toLowerCase()]);

          const toAdd = selectedIds.filter((id) => !currentIds.includes(id));
          const toDelete = currentIds.filter((id) => !selectedIds.includes(id));

          for (const id of toAdd) {
            await getService.create({ customerId: customer.id, [keyName]: id });
          }
          for (const id of toDelete) {
            await getService.delete(customer.id, id);
          }
        } catch (err) {
          console.warn(`Error syncing ${keyName}:`, err);
        }
      };

      await Promise.all([
        syncJoinTable(customerDietaryRestrictionService, selectedRestrictions, 'dietaryRestrictionId'),
        syncJoinTable(customerBowelFunctionService, selectedBowelFunctions, 'bowelFunctionId'),
        syncJoinTable(customerPreExistingConditionsService, selectedConditions, 'preExistingConditionsId'),
        syncJoinTable(customerDailyMealService, selectedDailyMeals, 'dailyMealId'),
      ]);

      setSuccessMessage(t('customerProfile.saveSuccess'));
    } catch (err) {
      console.error('Error saving customer profile:', err);
      setError(err.response?.data?.message || t('customerProfile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="customer-loading-state" style={{ marginTop: '4rem' }}>
        <Sparkles size={36} />
        <p>{t('customerProfile.loadingProfile')}</p>
      </div>
    );
  }

  return (
    <div className="customer-form-page">
      {/* Header */}
      <div className="form-page-header">
        <h1>
          {t('customerProfile.title')}
          <span>{t('customerProfile.subtitle')}</span>
        </h1>

        <span className="badge-luxury">
          <Sparkles size={14} /> NutriRev
        </span>
      </div>

      {/* Alerts */}
      {error && (
        <div className="form-alert error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="form-alert success">
          <Check size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* ROW 1: Equal height Photo Upload box + Personal Info box */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.25rem', alignItems: 'stretch' }}>
          {/* Photo Upload Card */}
          <div className="form-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <h3 style={{ justifyContent: 'center' }}>{t('customerProfile.profilePhoto')}</h3>

            <div className="customer-photo-upload">
              <div className="photo-circle">
                {photoPreview ? (
                  <img src={photoPreview} alt="Foto de perfil" />
                ) : (
                  <User size={54} />
                )}
              </div>

              <label htmlFor="profile-photo-input" className="photo-upload-btn" title={t('customerProfile.changePhoto')}>
                <Camera size={15} />
                <input
                  id="profile-photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <p className="form-field-hint">
              {uploadingPhoto ? t('customerProfile.uploadingPhoto') : t('customerProfile.photoFormat')}
            </p>
          </div>

          {/* Personal Info Card */}
          <div className="form-card">
            <h3>
              <User size={17} /> {t('customerProfile.personalInfo')}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {['addressLine1', 'addressLine2', 'postalCode', 'countryCode'].map((field) => (
                <div className="form-group" key={field}>
                  <label>{t(`address.${field}`)}</label>
                  <input type="text" maxLength={field === 'countryCode' ? 2 : undefined} value={formData[field]}
                    onChange={(e) => handleInputChange(field, e.target.value)} />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>{t('customerProfile.fullName')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  {t('customerProfile.corporateEmail')} <Lock size={12} />
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  readOnly
                />
                <span className="form-field-hint">{t('customerProfile.emailCannotChange')}</span>
              </div>

              <div className="form-group">
                <label>{t('customerProfile.phone')}</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="form-group">
                <label>{t('customerProfile.dob')}</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>{t('customerProfile.gender')}</label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                >
                  <option value="Feminino">{t('customerProfile.genderFemale')}</option>
                  <option value="Masculino">{t('customerProfile.genderMale')}</option>
                  <option value="Outro">{t('customerProfile.genderOther')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: Localização + Parâmetros de Atendimento Side-by-Side (Full Width) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {/* Localização Card */}
          <div className="form-card">
            <h3>
              <MapPin size={17} /> {t('customerProfile.location')}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>{t('customerProfile.state')}</label>
                <select
                  value={formData.province}
                  onChange={(e) => handleInputChange('province', e.target.value)}
                  disabled={formData.countryCode.trim().length !== 2}
                >
                  <option value="">{t('customerProfile.selectState')}</option>
                  {provincesList.map((p) => (
                    <option key={p.id} value={p.acronym || p.name}>
                      {p.name} ({p.acronym})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{t('customerProfile.city')}</label>
                <select
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  disabled={!formData.province || loadingCities}
                  style={{ opacity: !formData.province ? 0.5 : 1 }}
                >
                  <option value="">{loadingCities ? t('customerProfile.loadingCities') : t('customerProfile.selectCity')}</option>
                  {citiesList.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Parâmetros de Atendimento Card */}
          <div className="form-card">
            <h3>
              <FileText size={17} /> {t('customerProfile.careParameters')}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>{t('customerProfile.clinicalPlan')}</label>
                <select
                  value={formData.clinicalPlanId}
                  onChange={(e) => handleInputChange('clinicalPlanId', e.target.value)}
                >
                  <option value="">{t('customerProfile.noPlanSelected')}</option>
                  {clinicalPlans.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{t('customerProfile.prepMeal')}</label>
                <select
                  value={formData.prepareMealId}
                  onChange={(e) => handleInputChange('prepareMealId', e.target.value)}
                >
                  <option value="">{t('customerProfile.noMealSelected')}</option>
                  {prepareMeals.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: Single Box Spanning Full Width with All Filterable Combos Side-by-Side */}
        <div className="form-card">
          <h3>
            <Activity size={17} /> {t('customerProfile.clinicalConditions')}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <FilterableMultiSelect
              label={t('customerProfile.dietaryRestrictions')}
              options={dietaryRestrictionsList}
              selectedIds={selectedRestrictions}
              onChange={setSelectedRestrictions}
              placeholder={t('customerProfile.selectRestrictions')}
            />

            <FilterableMultiSelect
              label={t('customerProfile.bowelFunctions')}
              options={bowelFunctionsList}
              selectedIds={selectedBowelFunctions}
              onChange={setSelectedBowelFunctions}
              placeholder={t('customerProfile.selectBowelFunctions')}
            />

            <FilterableMultiSelect
              label={t('customerProfile.preExistingConditions')}
              options={preExistingConditionsList}
              selectedIds={selectedConditions}
              onChange={setSelectedConditions}
              placeholder={t('customerProfile.selectConditions')}
            />

            <FilterableMultiSelect
              label={t('customerProfile.dailyMeals')}
              options={dailyMealsList}
              selectedIds={selectedDailyMeals}
              onChange={setSelectedDailyMeals}
              placeholder={t('customerProfile.selectDailyMeals')}
            />
          </div>
        </div>

        {/* Submit Action Bar */}
        <div className="form-submit-bar">
          <button type="submit" disabled={saving}>
            <Save size={18} />
            <span>{saving ? t('customerProfile.savingChanges') : t('customerProfile.saveProfile')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
