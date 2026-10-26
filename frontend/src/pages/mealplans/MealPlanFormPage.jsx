import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Stethoscope,
  Plus,
  Trash2,
  Save,
  X,
  AlertCircle,
  Star,
  CalendarDays,
  User,
} from 'lucide-react';
import { fetchAllCustomers } from '../../store/customerSlice';
import { fetchIngredients } from '../../store/ingredientSlice';
import { doctorService } from '../../services/api';
import { FilterableMultiSelect } from '../../components/common/FilterableMultiSelect';
import { StyledInput } from '../../components/common/StyledInput';
import { MEAL_PLAN_CATEGORIES } from './mealPlanCategories';
import { ENUM_VALUES, enumLabel } from '../../utils/enums';

const getGramMultiplier = (unit) => {
  switch (unit) {
    case 'Grams': return 1.0;
    case 'Kg': return 1000.0;
    case 'Ml': return 1.0;
    case 'Liter': return 1000.0;
    case 'Units': return 1.0;
    case 'Cup': return 120.0;
    case 'Tablespoon': return 15.0;
    case 'TeaSpoon': return 5.0;
    case 'CoffeeSpoon': return 2.5;
    case 'DessertSpoon': return 10.0;
    case 'Pinch': return 0.5;
    case 'Slice': return 30.0;
    case 'Shell': return 100.0;
    case 'Glass': return 200.0;
    case 'LittleSquares': return 10.0;
    case 'Scoop': return 30.0;
    default: return 1.0;
  }
};

const calculateOptionMacros = (items, availableIngredients) => {
  let kcal = 0, p = 0, c = 0, f = 0, fi = 0;
  if (!items || !availableIngredients) return { kcal: 0, p: 0, c: 0, f: 0, fi: 0 };
  
  items.forEach(it => {
    if (it.ingredientId && it.quantity) {
      const ing = availableIngredients.find(i => i.id === parseInt(it.ingredientId) || i.id === it.ingredientId);
      if (ing) {
        const qty = parseFloat(it.quantity) || 0;
        const mult = getGramMultiplier(it.unit || 'Grams');
        const ratio = (qty * mult) / 100.0;
        
        kcal += (ing.kcal || 0) * ratio;
        p += (ing.protein || 0) * ratio;
        c += (ing.carbs || 0) * ratio;
        f += (ing.fat || 0) * ratio;
        fi += (ing.fiber || 0) * ratio;
      }
    }
  });
  
  return { 
    kcal: kcal.toFixed(1), 
    p: p.toFixed(1), 
    c: c.toFixed(1), 
    f: f.toFixed(1), 
    fi: fi.toFixed(1) 
  };
};

export const MealPlanFormPage = ({ editingPlan = null, onBack, onSaveSuccess }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const { allCustomers: availablePatients } = useSelector((state) => state.customer);
  const { ingredientsList: availableIngredients } = useSelector((state) => state.ingredient);

  const [formData, setFormData] = useState({
    name: '',
    category: 'KeepFit',
    generationStatus: 'Draft',
    isFavorite: false,
    patientId: '',
    nutritionistId: '',
  });

  const [doctorsList, setDoctorsList] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [mealsList, setMealsList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    dispatch(fetchAllCustomers());
    dispatch(fetchIngredients());
    loadDoctors();
  }, [dispatch]);

  const loadDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const data = await doctorService.getAll();
      if (Array.isArray(data)) {
        setDoctorsList(data);
      }
    } catch (err) {
      console.error('Error loading doctors:', err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    if (editingPlan) {
      setFormData({
        name: editingPlan.name || '',
        category: editingPlan.category || 'KeepFit',
        generationStatus: editingPlan.generationStatus || 'Draft',
        isFavorite: !!editingPlan.isFavorite,
        patientId: editingPlan.patientId || '',
        nutritionistId: editingPlan.nutritionistId || '',
      });
      setMealsList(
        (editingPlan.meals || []).map((m, mIdx) => ({
          mealType: m.mealType || 'Breakfast',
          isPreWorkout: !!m.isPreWorkout,
          isPostWorkout: !!m.isPostWorkout,
          nutritionistNote: m.nutritionistNote || '',
          position: mIdx + 1,
          options: (m.options || []).map((opt, oIdx) => ({
            label: opt.label || `${t('mealPlanForm.optionPrefix')}${oIdx + 1}`,
            position: oIdx + 1,
            items: (opt.items || []).map((it) => ({
              ingredientId: it.ingredientId,
              quantity: it.quantity || 100,
              unit: it.unit || 'Grams',
            })),
          })),
        }))
      );
    } else {
      setFormData({
        name: '',
        category: 'KeepFit',
        generationStatus: 'Draft',
        isFavorite: false,
        patientId: '',
        nutritionistId: '',
      });
      setMealsList([
        {
          mealType: 'Breakfast',
          isPreWorkout: false,
          isPostWorkout: false,
          nutritionistNote: '',
          position: 1,
          options: [
            {
              label: t('mealPlanForm.mainOption'),
              position: 1,
              items: [],
            },
          ],
        },
      ]);
    }
    setError('');
  }, [editingPlan]);

  const handleAddMeal = () => {
    setMealsList((prev) => [
      ...prev,
      {
        mealType: 'Lunch',
        isPreWorkout: false,
        isPostWorkout: false,
        nutritionistNote: '',
        position: prev.length + 1,
        options: [
          {
            label: t('mealPlanForm.mainOption'),
            position: 1,
            items: [],
          },
        ],
      },
    ]);
  };

  const handleRemoveMeal = (mIdx) => {
    setMealsList((prev) => prev.filter((_, i) => i !== mIdx));
  };

  const handleMealChange = (mIdx, field, value) => {
    setMealsList((prev) =>
      prev.map((meal, i) => (i === mIdx ? { ...meal, [field]: value } : meal))
    );
  };

  const handleAddItemToMealOption = (mIdx, oIdx) => {
    if (!availableIngredients || availableIngredients.length === 0) return;
    setMealsList((prev) =>
      prev.map((meal, i) => {
        if (i !== mIdx) return meal;
        return {
          ...meal,
          options: meal.options.map((opt, j) => {
            if (j !== oIdx) return opt;
            return {
              ...opt,
              items: [
                ...opt.items,
                {
                  ingredientId: availableIngredients[0].id,
                  quantity: 100,
                  unit: 'Grams',
                },
              ],
            };
          }),
        };
      })
    );
  };

  const handleRemoveItemFromMealOption = (mIdx, oIdx, itemIdx) => {
    setMealsList((prev) =>
      prev.map((meal, i) => {
        if (i !== mIdx) return meal;
        return {
          ...meal,
          options: meal.options.map((opt, j) => {
            if (j !== oIdx) return opt;
            return {
              ...opt,
              items: opt.items.filter((_, idx) => idx !== itemIdx),
            };
          }),
        };
      })
    );
  };

  const handleItemChange = (mIdx, oIdx, itemIdx, field, value) => {
    setMealsList((prev) =>
      prev.map((meal, i) => {
        if (i !== mIdx) return meal;
        return {
          ...meal,
          options: meal.options.map((opt, j) => {
            if (j !== oIdx) return opt;
            return {
              ...opt,
              items: opt.items.map((it, idx) => {
                if (idx !== itemIdx) return it;
                return { ...it, [field]: value };
              }),
            };
          }),
        };
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError(t('mealPlanForm.nameRequired'));
      return;
    }

    // Validate meal items
    for (const meal of mealsList) {
      for (const opt of meal.options) {
        for (const it of opt.items) {
          const ingId = parseInt(it.ingredientId, 10);
          if (isNaN(ingId)) {
            setError(t('mealPlanForm.invalidIngredient'));
            return;
          }
        }
      }
    }

    const nutId = formData.nutritionistId ? parseInt(formData.nutritionistId, 10) : null;
    const patId = formData.patientId ? parseInt(formData.patientId, 10) : null;

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      generationStatus: formData.generationStatus,
      isFavorite: !!formData.isFavorite,
      patientId: patId,
      nutritionistId: nutId,
      viewed: false,
      meals: mealsList.map((m, mIdx) => ({
        mealType: m.mealType,
        isPreWorkout: m.isPreWorkout,
        isPostWorkout: m.isPostWorkout,
        nutritionistNote: m.nutritionistNote,
        position: mIdx + 1,
        options: m.options.map((opt, oIdx) => ({
          label: opt.label || `${t('mealPlanForm.optionPrefix')}${oIdx + 1}`,
          position: oIdx + 1,
          items: opt.items.map((it) => ({
            ingredientId: parseInt(it.ingredientId, 10),
            quantity: parseFloat(it.quantity) || 0,
            unit: it.unit,
            substitutes: [],
          })),
        })),
      })),
    };

    try {
      setSaving(true);
      await onSaveSuccess(payload, editingPlan?.id);
    } catch (err) {
      console.error('Error saving meal plan:', err);
      setError(err?.response?.data?.message || err?.message || t('mealPlanForm.saveError'));
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
          <span>{t('mealPlanForm.breadcrumbPlans')}</span>
        </button>
        <ChevronRight size={14} style={{ color: 'var(--text-body)' }} />
        <span style={{ color: 'var(--text-heading)', fontWeight: '500' }}>
          {editingPlan ? `${t('mealPlanForm.editPlanPrefix')}${editingPlan.name}` : t('mealPlanForm.registerNewPlan')}
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
          {editingPlan ? t('mealPlanForm.editPlanTitle') : t('mealPlanForm.registerNewPlan')}
        </h2>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-body)' }}>
          {editingPlan
            ? t('mealPlanForm.editPlanSubtitle', { id: editingPlan.id }).replace('{{id}}', editingPlan.id)
            : t('mealPlanForm.newPlanSubtitle')}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B91C1C' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} style={{ boxSizing: 'border-box', width: '100%' }}>
        {/* Section 1: Informações Gerais */}
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
            <span>{t('mealPlanForm.generalData')}</span>
          </h3>

          <div style={{ marginBottom: '16px', width: '100%', boxSizing: 'border-box' }}>
            <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
              {t('mealPlanForm.planName')}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('mealPlanForm.planNamePlaceholder')}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', alignItems: 'center' }}>
            <div>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('mealPlanForm.category')}
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                {MEAL_PLAN_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{enumLabel(t, 'mealPlanCategory', category)}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-heading)' }}>
                {t('mealPlanForm.generationStatus')}
              </label>
              <select
                value={formData.generationStatus}
                onChange={(e) => setFormData({ ...formData, generationStatus: e.target.value })}
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
                {ENUM_VALUES.mealPlanGenerationStatus.map((status) => (
                  <option key={status} value={status}>{enumLabel(t, 'mealPlanGenerationStatus', status)}</option>
                ))}
              </select>
            </div>

            <div style={{ paddingTop: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.isFavorite}
                  onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                  style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }}
                />
                <Star size={16} fill={formData.isFavorite ? 'var(--accent-primary)' : 'none'} />
                <span>{t('mealPlanForm.markAsFavorite')}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Profissionais & Paciente */}
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
            <Stethoscope size={18} />
            <span>{t('mealPlanForm.responsible')}</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
            {/* Filterable Single-Select for Doctor / Nutritionist */}
            <FilterableMultiSelect
              label={t('mealPlanForm.nutritionist')}
              icon={Stethoscope}
              iconColor="var(--accent-primary)"
              options={doctorsList.map((doc) => ({
                id: doc.id,
                name: doc.document ? `${doc.name} (CRM/Doc: ${doc.document})` : doc.name,
              }))}
              selectedIds={formData.nutritionistId ? [formData.nutritionistId] : []}
              onChange={(vals) => setFormData((prev) => ({ ...prev, nutritionistId: vals[0] || '' }))}
              placeholder={loadingDoctors ? t('mealPlanForm.loadingDoctors') : t('mealPlanForm.selectDoctor')}
              emptyMessage={t('mealPlanForm.noDoctorFound')}
              isSingleSelect={true}
              disabled={loadingDoctors}
            />

            {/* Patient Select */}
            <FilterableMultiSelect
              label={t('mealPlanForm.patient')}
              icon={User}
              iconColor="var(--accent-primary)"
              options={availablePatients.map((p) => ({
                id: p.id,
                name: p.name,
              }))}
              selectedIds={formData.patientId ? [formData.patientId] : []}
              onChange={(vals) => setFormData((prev) => ({ ...prev, patientId: vals[0] || '' }))}
              placeholder={t('mealPlanForm.selectPatient')}
              emptyMessage={t('mealPlanForm.noPatientFound')}
              isSingleSelect={true}
            />
          </div>
        </div>

        {/* Section 3: Refeições do Plano */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
            <h3
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: '1.1rem',
                color: 'var(--accent-primary)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CalendarDays size={18} />
              <span>{t('mealPlanForm.mealsPrescription')}</span>
            </h3>

            <button
              type="button"
              onClick={handleAddMeal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-heading)',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Plus size={14} />
              <span>{t('mealPlanForm.addMeal')}</span>
            </button>
          </div>

          {mealsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-body)' }}>
              <p>{t('mealPlanForm.noMealsConfigured')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {mealsList.map((meal, mIdx) => (
                <div
                  key={mIdx}
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '20px',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        value={meal.mealType}
                        onChange={(e) => handleMealChange(mIdx, 'mealType', e.target.value)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.88rem',
                          fontWeight: '600',
                          color: 'var(--text-heading)',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        {ENUM_VALUES.mealType.map((mealType) => (
                          <option key={mealType} value={mealType}>{enumLabel(t, 'mealType', mealType)}</option>
                        ))}
                      </select>

                      <label style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={meal.isPreWorkout}
                          onChange={(e) => handleMealChange(mIdx, 'isPreWorkout', e.target.checked)}
                          style={{ accentColor: 'var(--accent-primary)' }}
                        />
                        <span>{t('mealPlanForm.preWorkout')}</span>
                      </label>

                      <label style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={meal.isPostWorkout}
                          onChange={(e) => handleMealChange(mIdx, 'isPostWorkout', e.target.checked)}
                          style={{ accentColor: 'var(--accent-primary)' }}
                        />
                        <span>{t('mealPlanForm.postWorkout')}</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveMeal(mIdx)}
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                      title={t('mealPlanForm.deleteMeal')}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Items in Option 0 */}
                  {meal.options.map((opt, oIdx) => {
                    const optionMacros = calculateOptionMacros(opt.items, availableIngredients);
                    return (
                    <div key={oIdx} style={{ marginTop: '12px', backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', fontWeight: '600' }}>
                            {t('mealPlanForm.foodsIngredients')}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-body)', fontWeight: '500' }}>
                            ({optionMacros.kcal}kcal | P:{optionMacros.p}g | C:{optionMacros.c}g | F:{optionMacros.f}g | Fi:{optionMacros.fi}g)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddItemToMealOption(mIdx, oIdx)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                        >
                          {t('mealPlanForm.addFood')}
                        </button>
                      </div>

                      {opt.items.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-body)', margin: 0 }}>{t('mealPlanForm.noIngredients')}</p>
                      ) : (
                        opt.items.map((it, itemIdx) => (
                          <div key={itemIdx} style={{ display: 'grid', gridTemplateColumns: '3.5fr 1.2fr 0.8fr 34px', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                            <FilterableMultiSelect
                              label=""
                              options={availableIngredients.map((item) => ({ 
                                id: item.id, 
                                name: `${item.name} (${item.kcal || 0}kcal, P:${item.protein || 0}g, C:${item.carbs || 0}g, F:${item.fat || 0}g, Fi:${item.fiber || 0}g)` 
                              }))}
                              selectedIds={it.ingredientId ? [it.ingredientId] : []}
                              onChange={(vals) => handleItemChange(mIdx, oIdx, itemIdx, 'ingredientId', vals[0] || '')}
                              placeholder={t('mealPlanForm.selectIngredient', 'Ingrediente...')}
                              emptyMessage={t('mealPlanForm.noIngredientFound', 'Nenhum ingrediente')}
                              isSingleSelect={true}
                              isClearable={true}
                            />

                            <FilterableMultiSelect
                              label=""
                              options={ENUM_VALUES.measurementUnit.map((unit) => ({ id: unit, name: enumLabel(t, 'measurementUnit', unit) }))}
                              selectedIds={it.unit ? [it.unit] : []}
                              onChange={(vals) => handleItemChange(mIdx, oIdx, itemIdx, 'unit', vals[0] || '')}
                              placeholder={t('mealPlanForm.selectUnit', 'Unidade...')}
                              emptyMessage={t('mealPlanForm.noUnitFound', 'Nenhuma unidade')}
                              isSingleSelect={true}
                              isClearable={false}
                            />

                            <StyledInput
                              type="number"
                              step="0.1"
                              value={it.quantity}
                              onChange={(e) => handleItemChange(mIdx, oIdx, itemIdx, 'quantity', e.target.value)}
                              placeholder={t('mealPlanForm.qtyPlaceholder')}
                            />

                            <button
                              type="button"
                              onClick={() => handleRemoveItemFromMealOption(mIdx, oIdx, itemIdx)}
                              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )})}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Page Footer Action Bar - Matching CustomerFormPage / DoctorFormPage exact layout & buttons */}
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
                : editingPlan
                ? t('common.saveChanges', 'Salvar Alterações')
                : t('mealPlanForm.submitRegister')}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
