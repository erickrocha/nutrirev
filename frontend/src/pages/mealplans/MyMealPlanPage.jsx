import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { FileText, Star, AlertCircle, ChevronDown, ChevronUp, Utensils } from 'lucide-react';
import { fetchMealPlansPaginated } from '../../store/mealPlanSlice';
import { fetchIngredients } from '../../store/ingredientSlice';
import { mealPlanCategoryLabel } from './mealPlanCategories';
import { customerService } from '../../services/api';
import { enumLabel } from '../../utils/enums';

export const MyMealPlanPage = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { mealPlans: plans, loading, error: reduxError } = useSelector((state) => state.mealPlan);
  const { ingredientsList } = useSelector((state) => state.ingredient);

  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const loadPlans = useCallback(async () => {
    try {
      const customer = await customerService.getMe();
      if (customer?.id) {
        dispatch(fetchMealPlansPaginated({ patient_id: customer.id, page: 1, size: 50 }));
      }
    } catch (err) {
      console.error('Error loading customer profile:', err);
      setError(t('mealPlan.errorLoadingProfile'));
    }
  }, [dispatch, t]);

  useEffect(() => {
    loadPlans();
    dispatch(fetchIngredients());
  }, [loadPlans, dispatch]);

  const ingredientName = (id) => ingredientsList.find((i) => i.id === id)?.name || `Ingrediente #${id}`;

  return (
    <div className="my-meal-plan-page">
      <div className="form-page-header">
        <h1>
          <FileText size={24} /> {t('mealPlan.myMealPlan')}
        </h1>
      </div>

      {(error || reduxError) && (
        <div className="customer-error-banner">
          <AlertCircle size={18} />
          <span>{error || reduxError}</span>
        </div>
      )}

      {loading ? (
        <div className="customer-loading-state">
          <p>{t('mealPlan.loadingMealPlan')}</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="customer-empty-state">
          <FileText size={48} />
          <h3>{t('mealPlan.noMealPlanFound')}</h3>
          <p>{t('mealPlan.nutritionistNotRegistered')}</p>
        </div>
      ) : (
        <div className="meal-plan-list">
          {plans.map((plan) => {
            const isExpanded = expandedId === plan.id;
            return (
              <div key={plan.id} className="meal-plan-card">
                <div className="plan-card-top">
                  <span className="customer-badge-pill">{mealPlanCategoryLabel(t, plan.category)}</span>
                  {plan.isFavorite && <Star size={18} fill="var(--accent-primary)" color="var(--accent-primary)" />}
                </div>

                <h3>{plan.name}</h3>

                <div className="plan-status-row">
                  <span className={`plan-status-chip ${plan.generationStatus === 'Finished' ? 'finished' : ''}`}>
                    {enumLabel(t, 'mealPlanGenerationStatus', plan.generationStatus || 'Draft')}
                  </span>
                  <span className="plan-meals-count">
                    {t('mealPlan.mealsCount', { count: (plan.meals || []).length })}
                  </span>
                </div>

                {plan.totalMacros && (
                  <div className="customer-macro-chip-row">
                    <span className="customer-macro-chip">🔥 {plan.totalMacros.kcal} kcal</span>
                    <span className="customer-macro-chip protein">P: {plan.totalMacros.proteinG}g</span>
                    <span className="customer-macro-chip carbs">C: {plan.totalMacros.carbsG}g ({plan.totalMacros.carbsPct}%)</span>
                    <span className="customer-macro-chip fat">G: {plan.totalMacros.lipidsG}g ({plan.totalMacros.lipidsPct}%)</span>
                  </div>
                )}

                <button type="button" className="plan-toggle-btn" onClick={() => setExpandedId(isExpanded ? null : plan.id)}>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {isExpanded ? t('mealPlan.hideDetails') : t('mealPlan.viewDetails')}
                </button>

                {isExpanded && (
                  <div className="plan-meal-details">
                    {(plan.meals || []).map((meal, mIdx) => (
                      <div key={mIdx} className="plan-meal-block">
                        <div className="plan-meal-header">
                          <Utensils size={15} />
                          <span>
                            {meal.mealType
                              ? enumLabel(t, 'mealType', meal.mealType)
                              : t('mealPlan.mealNumber', { number: mIdx + 1 })}
                          </span>
                          {meal.isPreWorkout && (
                            <span className="workout-tag">{t('mealPlan.preWorkout')}</span>
                          )}
                          {meal.isPostWorkout && (
                            <span className="workout-tag">{t('mealPlan.postWorkout')}</span>
                          )}
                        </div>

                        {(meal.options || []).map((opt, oIdx) => (
                          <div key={oIdx} className="plan-meal-option">
                            <div className="plan-option-label">
                              {opt.label || t('mealPlan.optionNumber', { number: oIdx + 1 })}
                            </div>
                            <ul className="plan-option-items">
                              {(opt.items || []).map((it, itemIdx) => (
                                <li key={itemIdx}>
                                  {ingredientName(it.ingredientId)} — {it.quantity} {enumLabel(t, 'measurementUnit', it.unit)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}

                        {meal.nutritionistNote && (
                          <p className="plan-nutritionist-note">{meal.nutritionistNote}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
