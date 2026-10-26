import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ChevronRight,
  User,
  MapPin,
  Save,
  X,
} from 'lucide-react';
import { FilterableMultiSelect } from '../../components/common/FilterableMultiSelect';
import { doctorService, provinceService, cityService } from '../../services/api';

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

export const DoctorFormPage = ({ editingDoctor = null, onBack, onSaveSuccess }) => {
  const { t } = useTranslation();
  const { activeTenant } = useSelector((state) => state.tenant);
  const tenantCountryCode = (activeTenant?.countryCode || '').trim().toUpperCase();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    document: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    province: '',
    city: '',
  });

  const [provincesList, setProvincesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);

  const loadProvinces = async (countryCode) => {
    if (countryCode.length !== 2) {
      setProvincesList([]);
      return [];
    }
    try {
      const data = await provinceService.getAll(countryCode);
      const provinces = Array.isArray(data) ? data : [];
      setProvincesList(provinces);
      return provinces;
    } catch (err) {
      console.error('Error loading provinces:', err);
      setProvincesList([]);
      return [];
    }
  };

  const loadCitiesForProvince = async (provinceVal, provinceOptions = provincesList) => {
    if (!provinceVal) {
      setCitiesList([]);
      return;
    }
    const foundProv = (provinceOptions || []).find(
      (p) =>
        (p.acronym || '').toLowerCase() === provinceVal.toLowerCase() ||
        (p.name || '').toLowerCase() === provinceVal.toLowerCase() ||
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

  useEffect(() => {
    const initializeAddress = async () => {
      const provinces = await loadProvinces(tenantCountryCode);
      if (editingDoctor?.province) {
        await loadCitiesForProvince(editingDoctor.province, provinces);
      }
    };

    if (editingDoctor) {
      const prov = editingDoctor.province || '';
      setFormData({
        name: editingDoctor.name || '',
        document: editingDoctor.document || '',
        email: editingDoctor.email || '',
        phone: formatPhone(editingDoctor.phone || ''),
        dateOfBirth: editingDoctor.dateOfBirth || editingDoctor.date_of_birth || '',
        province: prov,
        city: editingDoctor.city || '',
      });
    } else {
      setFormData({
        name: '',
        document: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        province: '',
        city: '',
      });
      setCitiesList([]);
    }
    initializeAddress();
  }, [editingDoctor, tenantCountryCode]);

  const handleProvinceChange = (selectedProv) => {
    setFormData((prev) => ({ ...prev, province: selectedProv, city: '' }));
    loadCitiesForProvince(selectedProv);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError(t('doctors.nameRequired', 'O nome do médico é obrigatório.'));
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: formData.name.trim(),
      document: formData.document.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      dateOfBirth: formData.dateOfBirth || null,
      province: formData.province || null,
      city: formData.city || null,
    };

    try {
      if (editingDoctor) {
        await doctorService.update(editingDoctor.id, payload);
      } else {
        await doctorService.create(payload);
      }
      onSaveSuccess();
    } catch (err) {
      console.error('Error saving doctor:', err);
      setError(err?.response?.data?.message || err?.message || t('common.errorSaving'));
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
          <span>{t('doctors.title', 'Corpo Médico')}</span>
        </button>
        <ChevronRight size={14} style={{ color: 'var(--text-body)' }} />
        <span style={{ color: 'var(--text-heading)', fontWeight: '500' }}>
          {editingDoctor
            ? t('doctors.editDoctor', 'Editar Médico')
            : t('doctors.addDoctor', 'Cadastrar Novo Médico')}
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
          {editingDoctor
            ? t('doctors.editSubtitle', 'Atualize as informações do médico cadastrado')
            : t('doctors.addSubtitle', 'Preencha os dados para cadastrar um novo médico')}
        </h2>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-body)' }}>
          {editingDoctor
            ? `ID #${editingDoctor.id} — ${editingDoctor.name}`
            : t('doctors.subtitle', 'Gerencie os médicos e profissionais de saúde cadastrados')}
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
        {/* Section 1: Dados Pessoais & Profissionais */}
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
            <span>{t('doctors.doctorDetails', 'Dados Pessoais & Profissionais')}</span>
          </h3>

          {/* Full Name */}
          <div style={{ marginBottom: '16px', width: '100%', boxSizing: 'border-box' }}>
            <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
              {t('doctors.fullName', 'Nome Completo')} *
            </label>
            <input
              type="text"
              placeholder={t('doctors.namePlaceholder', 'ex: Dr. Carlos Eduardo')}
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

          {/* Document / CRM & Date of Birth */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('doctors.documentCRM', 'CRM / Documento')}
              </label>
              <input
                type="text"
                placeholder="CRM/SP 123456"
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
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
                {t('doctors.dateOfBirth', 'Data de Nascimento')}
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
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

          {/* Email & Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('common.email', 'E-mail')}
              </label>
              <input
                type="email"
                placeholder="dr.carlos@clinica.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                {t('doctors.phone', 'Telefone')}
              </label>
              <input
                type="text"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
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

          {/* Filterable Single-Select Dropdowns for State / Province & City */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
            <FilterableMultiSelect
              label={t('doctors.province', 'Estado / Província')}
              icon={MapPin}
              iconColor="var(--accent-primary)"
              options={provincesList.map((p) => ({
                id: p.acronym || p.name,
                name: p.acronym ? `${p.acronym} - ${p.name}` : p.name,
              }))}
              selectedIds={formData.province ? [formData.province] : []}
              onChange={(vals) => handleProvinceChange(vals[0] || '')}
              placeholder={t('doctors.selectProvince', 'Selecione o estado...')}
              emptyMessage={t('doctors.noProvinceFound', 'Nenhum estado encontrado')}
              isSingleSelect={true}
              disabled={tenantCountryCode.length !== 2}
            />

            <FilterableMultiSelect
              label={t('doctors.city', 'Cidade')}
              icon={MapPin}
              iconColor="var(--accent-primary)"
              options={citiesList.map((c) => ({ id: c.name, name: c.name }))}
              selectedIds={formData.city ? [formData.city] : []}
              onChange={(vals) => setFormData((prev) => ({ ...prev, city: vals[0] || '' }))}
              placeholder={
                !formData.province
                  ? t('doctors.selectProvinceFirst', 'Selecione o estado primeiro')
                  : loadingCities
                  ? t('doctors.loadingCities', 'Carregando cidades...')
                  : t('doctors.searchCity', 'Selecione a cidade...')
              }
              emptyMessage={t('doctors.noCityFound', 'Nenhuma cidade encontrada')}
              isSingleSelect={true}
              disabled={!formData.province || loadingCities}
            />
          </div>
        </div>

        {/* Page Footer Action Bar - Matching CustomerFormPage exact layout & buttons */}
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
            <span>{t('common.cancel', 'Cancelar')}</span>
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
            <span>
              {saving
                ? t('common.saving', 'Salvando...')
                : editingDoctor
                ? t('common.saveChanges', 'Salvar Alterações')
                : t('doctors.addDoctor', 'Novo Médico')}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
