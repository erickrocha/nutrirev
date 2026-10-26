import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { saveGoalSetting } from '../../store/customerSlice';
import { FilterableMultiSelect } from '../../components/common/FilterableMultiSelect';
import {
  ChevronRight,
  ArrowLeft,
  User,
  Target,
  Activity,
  Save,
  X,
  Scale,
} from 'lucide-react';

export const CustomerGoalSettingFormPage = ({
  editingGoal = null,
  customers = [],
  formulas = [],
  activityFactors = [],
  objectives = [],
  activityLevels = [],
  onBack,
  onSaveSuccess,
}) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    customerId: '',
    formulaId: '',
    activityFactorId: '',
    objectiveId: '',
    physicalActivityLevelId: '',
    height: '',
    actualWeight: '',
    desiredWeight: '',
    carbohydrate: '',
    lipids: '',
    protein: '',
    customerCaloricGoal: '',
  });

  useEffect(() => {
    if (editingGoal) {
      setFormData({
        name: editingGoal.name || '',
        customerId: editingGoal.customerId || editingGoal.customer_id || '',
        formulaId: editingGoal.formulaId || editingGoal.formula_id || '',
        activityFactorId: editingGoal.activityFactorId || editingGoal.activity_factor_id || '',
        objectiveId: editingGoal.objectiveId || editingGoal.objective_id || '',
        physicalActivityLevelId: editingGoal.physicalActivityLevelId || editingGoal.physical_activity_level_id || '',
        height: editingGoal.height !== undefined && editingGoal.height !== null ? editingGoal.height : '',
        actualWeight: editingGoal.actualWeight !== undefined && editingGoal.actualWeight !== null ? editingGoal.actualWeight : '',
        desiredWeight: editingGoal.desiredWeight !== undefined && editingGoal.desiredWeight !== null ? editingGoal.desiredWeight : '',
        carbohydrate: editingGoal.carbohydrate !== undefined && editingGoal.carbohydrate !== null ? editingGoal.carbohydrate : '',
        lipids: editingGoal.lipids !== undefined && editingGoal.lipids !== null ? editingGoal.lipids : '',
        protein: editingGoal.protein !== undefined && editingGoal.protein !== null ? editingGoal.protein : '',
        customerCaloricGoal: editingGoal.customerCaloricGoal !== undefined && editingGoal.customerCaloricGoal !== null ? editingGoal.customerCaloricGoal : '',
      });
    } else {
      setFormData({
        name: t('goalForm.defaultGoalName'),
        customerId: customers[0]?.id || '',
        formulaId: formulas[0]?.id || '',
        activityFactorId: activityFactors[0]?.id || '',
        objectiveId: objectives[0]?.id || '',
        physicalActivityLevelId: activityLevels[0]?.id || '',
        height: '',
        actualWeight: '',
        desiredWeight: '',
        carbohydrate: '',
        lipids: '',
        protein: '',
        customerCaloricGoal: '',
      });
    }
  }, [editingGoal, customers, formulas, activityFactors, objectives, activityLevels, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.customerId) {
      setError(t('goalForm.errorSelectClient'));
      return;
    }

    setSaving(true);
    setError(null);

    const parseFloatOrNull = (val) => (val !== '' && val !== null ? parseFloat(val) : null);
    const parseIntOrNull = (val) => (val !== '' && val !== null ? parseInt(val, 10) : null);

    const payload = {
      name: formData.name.trim(),
      customerId: parseInt(formData.customerId, 10),
      formulaId: parseIntOrNull(formData.formulaId),
      activityFactorId: parseIntOrNull(formData.activityFactorId),
      objectiveId: parseIntOrNull(formData.objectiveId),
      physicalActivityLevelId: parseIntOrNull(formData.physicalActivityLevelId),
      height: parseFloatOrNull(formData.height),
      actualWeight: parseFloatOrNull(formData.actualWeight),
      desiredWeight: parseFloatOrNull(formData.desiredWeight),
      carbohydrate: parseFloatOrNull(formData.carbohydrate),
      lipids: parseFloatOrNull(formData.lipids),
      protein: parseFloatOrNull(formData.protein),
      customerCaloricGoal: parseFloatOrNull(formData.customerCaloricGoal),
    };

    try {
      const result = await dispatch(saveGoalSetting({ id: editingGoal?.id, goalData: payload }));
      if (saveGoalSetting.fulfilled.match(result)) {
        onSaveSuccess();
      } else {
        setError(result.payload || t('goalForm.errorSavingGoal'));
      }
    } catch {
      setError(t('goalForm.errorSavingGoal'));
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
          <span>{t('goalForm.goalManagement')}</span>
        </button>
        <ChevronRight size={14} style={{ color: 'var(--text-body)' }} />
        <span style={{ color: 'var(--text-heading)', fontWeight: '500' }}>
          {editingGoal ? t('goalForm.editGoal', { name: editingGoal.name }) : t('goalForm.registerNewGoal')}
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
          {editingGoal ? t('goalForm.editGoalTitle') : t('goalForm.registerGoalTitle')}
        </h2>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-body)' }}>
          {t('goalForm.subtitle')}
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
        {/* Section 1: Identificação do Paciente & Nome da Meta */}
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
            <Target size={18} />
            <span>{t('goalForm.section1Title')}</span>
          </h3>

          {/* Row 1: Cliente (Paciente) - FULL PAGE WIDTH */}
          <div style={{ marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
            <FilterableMultiSelect
              label={t('goalForm.customerPatient')}
              icon={User}
              iconColor="var(--accent-primary)"
              options={customers.map((c) => ({
                id: c.id,
                name: `${c.name} ${c.email ? `(${c.email})` : ''}`,
              }))}
              selectedIds={formData.customerId ? [parseInt(formData.customerId, 10)] : []}
              onChange={(vals) => setFormData((prev) => ({ ...prev, customerId: vals[0] || '' }))}
              placeholder={t('goalForm.selectPatient')}
              emptyMessage={t('goalForm.noCustomer')}
              isSingleSelect={true}
            />
          </div>

          {/* Row 2: Nome da Meta - FULL PAGE WIDTH */}
          <div style={{ width: '100%', boxSizing: 'border-box' }}>
            <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
              {t('goalForm.goalName')}
            </label>
            <input
              type="text"
              placeholder={t('goalForm.goalNamePlaceholder')}
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
        </div>

        {/* Section 2: Parâmetros Antropométricos & Meta Calórica */}
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
            <Scale size={18} />
            <span>{t('goalForm.section2Title')}</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('goalForm.currentWeight')}
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="ex: 75.5"
                value={formData.actualWeight}
                onChange={(e) => setFormData({ ...formData, actualWeight: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.88rem' }}
              />
            </div>

            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('goalForm.height')}
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="ex: 175"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.88rem' }}
              />
            </div>

            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('goalForm.desiredWeight')}
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="ex: 70.0"
                value={formData.desiredWeight}
                onChange={(e) => setFormData({ ...formData, desiredWeight: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.88rem' }}
              />
            </div>

            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('goalForm.caloricGoalKcal')}
              </label>
              <input
                type="number"
                step="1"
                placeholder="ex: 2200"
                value={formData.customerCaloricGoal}
                onChange={(e) => setFormData({ ...formData, customerCaloricGoal: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.88rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('goalForm.carbohydrates')}
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="ex: 50.0"
                value={formData.carbohydrate}
                onChange={(e) => setFormData({ ...formData, carbohydrate: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.88rem' }}
              />
            </div>

            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('goalForm.proteins')}
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="ex: 30.0"
                value={formData.protein}
                onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.88rem' }}
              />
            </div>

            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('goalForm.lipids')}
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="ex: 20.0"
                value={formData.lipids}
                onChange={(e) => setFormData({ ...formData, lipids: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.88rem' }}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Parâmetros Clínicos & Fórmulas */}
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
            <span>{t('goalForm.section3Title')}</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('goalForm.calculationFormula')}
              </label>
              <select
                value={formData.formulaId}
                onChange={(e) => setFormData({ ...formData, formulaId: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#FFF', fontSize: '0.88rem' }}
              >
                <option value="">{t('goalForm.selectFormula')}</option>
                {formulas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('goalForm.activityFactor')}
              </label>
              <select
                value={formData.activityFactorId}
                onChange={(e) => setFormData({ ...formData, activityFactorId: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#FFF', fontSize: '0.88rem' }}
              >
                <option value="">{t('goalForm.selectFactor')}</option>
                {activityFactors.map((af) => (
                  <option key={af.id} value={af.id}>
                    {af.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('goalForm.clinicalObjective')}
              </label>
              <select
                value={formData.objectiveId}
                onChange={(e) => setFormData({ ...formData, objectiveId: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#FFF', fontSize: '0.88rem' }}
              >
                <option value="">{t('goalForm.selectObjective')}</option>
                {objectives.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('goalForm.physicalActivityLevel')}
              </label>
              <select
                value={formData.physicalActivityLevelId}
                onChange={(e) => setFormData({ ...formData, physicalActivityLevelId: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#FFF', fontSize: '0.88rem' }}
              >
                <option value="">{t('goalForm.selectLevel')}</option>
                {activityLevels.map((al) => (
                  <option key={al.id} value={al.id}>
                    {al.name}
                  </option>
                ))}
              </select>
            </div>
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
            <span>{saving ? t('common.saving') : editingGoal ? t('common.saveChanges') : t('goalForm.registerGoal')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
