import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, FileText, Star, Utensils } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { fetchIngredientsByIds } from '../../store/ingredientSlice';
import { fetchMealPlansPaginated } from '../../store/mealPlanSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { customerService } from '../../services/customerService';
import { enumLabel } from '../../utils/enums';
import { ingredientName as localizedName } from '../../utils/ingredients';
import { ingredientIdsOf } from '../../utils/mealPlanForm';
import { mealPlanCategoryLabel } from './mealPlanCategories';

const PLAN_LIMIT = 50;

export const MyMealPlanPage = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'pt';
  const dispatch = useAppDispatch();
  const { mealPlans, loading, error } = useAppSelector((state) => state.mealPlan);
  const ingredientsList = useAppSelector((state) => state.ingredient.ingredientsList);
  const [profileFailed, setProfileFailed] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setProfileFailed(false);
    setProfileLoading(true);
    try {
      const customer = (await customerService.getMe()) as { id?: number } | null;
      if (customer?.id) await dispatch(fetchMealPlansPaginated({ patient_id: customer.id, page: 1, size: PLAN_LIMIT }));
    } catch {
      setProfileFailed(true);
    } finally {
      setProfileLoading(false);
    }
  }, [dispatch]);
  useEffect(() => { load(); }, [load]);

  // Só os ingredientes usados nos planos exibidos (o catálogo global é grande).
  useEffect(() => {
    const ids = mealPlans.flatMap((plan) => ingredientIdsOf(plan));
    if (ids.length) dispatch(fetchIngredientsByIds(ids));
  }, [mealPlans, dispatch]);

  const nameOf = (id: number | string) => localizedName(ingredientsList.find((item) => item.id === Number(id)), lang) || `Ingrediente #${id}`;
  const message = profileFailed ? t('mealPlan.errorLoadingProfile') : error;

  return (
    <div className="mx-auto w-full max-w-[900px] pb-10">
      <Breadcrumb items={[{ label: t('mealPlan.myMealPlan') }]} />
      <h1 className="mb-4 mt-0 flex items-center gap-2 text-[1.5rem] text-[var(--text-heading)]"><FileText size={24} />{t('mealPlan.myMealPlan')}</h1>

      {message !== null && message !== undefined && <ErrorAlert message={message || t('mealPlanAdmin.loadError')} onRetry={load} />}

      {loading || profileLoading ? (
        <p role="status" className="p-10 text-center text-[var(--text-body)]">{t('mealPlan.loadingMealPlan')}</p>
      ) : mealPlans.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-white p-10 text-center text-[var(--text-body)]">
          <FileText size={48} />
          <h3 className="m-0 text-[var(--text-heading)]">{t('mealPlan.noMealPlanFound')}</h3>
          <p className="m-0">{t('mealPlan.nutritionistNotRegistered')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {mealPlans.map((plan) => {
            const expanded = expandedId === plan.id;
            return (
              <article key={plan.id} className="flex flex-col gap-3 rounded-2xl border border-[var(--border-color)] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-blue-50 px-3 py-[2px] text-[.75rem] font-semibold text-[var(--accent-primary)]">{mealPlanCategoryLabel(t, plan.category)}</span>
                  {plan.isFavorite && <Star size={18} fill="currentColor" className="text-[var(--accent-primary)]" aria-label="favorite" />}
                </div>
                <h3 className="m-0 text-[1.1rem] text-[var(--text-heading)]">{plan.name}</h3>
                <div className="flex items-center gap-3 text-[.8rem]">
                  <span className={`rounded-full px-2 py-[2px] font-semibold ${plan.generationStatus === 'Finished' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{enumLabel(t, 'mealPlanGenerationStatus', plan.generationStatus || 'Draft')}</span>
                  <span className="text-[var(--text-body)]">{t('mealPlan.mealsCount', { count: (plan.meals ?? []).length })}</span>
                </div>
                {plan.totalMacros && (
                  <div className="flex flex-wrap gap-2 text-[.78rem]">
                    <span className="rounded-full bg-orange-100 px-2 py-[2px] font-semibold text-orange-700">🔥 {plan.totalMacros.kcal} kcal</span>
                    <span className="rounded-full bg-rose-50 px-2 py-[2px] text-rose-700">P: {plan.totalMacros.proteinG}g</span>
                    <span className="rounded-full bg-amber-50 px-2 py-[2px] text-amber-700">C: {plan.totalMacros.carbsG}g ({plan.totalMacros.carbsPct}%)</span>
                    <span className="rounded-full bg-sky-50 px-2 py-[2px] text-sky-700">G: {plan.totalMacros.lipidsG}g ({plan.totalMacros.lipidsPct}%)</span>
                  </div>
                )}
                <button type="button" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : plan.id)} className="flex items-center gap-1 self-start text-[.85rem] font-semibold text-[var(--accent-primary)] hover:underline">
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}{expanded ? t('mealPlan.hideDetails') : t('mealPlan.viewDetails')}
                </button>
                {expanded && (
                  <div className="flex flex-col gap-4 border-t border-slate-100 pt-3">
                    {(plan.meals ?? []).map((meal, mealIndex) => (
                      <section key={mealIndex}>
                        <h4 className="m-0 mb-1 flex flex-wrap items-center gap-2 text-[.95rem]">
                          <Utensils size={15} />{meal.mealType ? enumLabel(t, 'mealType', meal.mealType) : t('mealPlan.mealNumber', { number: mealIndex + 1 })}
                          {meal.isPreWorkout && <span className="rounded bg-slate-100 px-2 py-[1px] text-[.72rem]">{t('mealPlan.preWorkout')}</span>}
                          {meal.isPostWorkout && <span className="rounded bg-slate-100 px-2 py-[1px] text-[.72rem]">{t('mealPlan.postWorkout')}</span>}
                        </h4>
                        {(meal.options ?? []).map((option, optionIndex) => (
                          <div key={optionIndex} className="mb-2 ml-5">
                            <div className="text-[.82rem] font-semibold text-[var(--text-heading)]">{option.label || t('mealPlan.optionNumber', { number: optionIndex + 1 })}</div>
                            <ul className="m-0 pl-5 text-[.85rem] text-[var(--text-body)]">
                              {(option.items ?? []).map((item, itemIndex) => <li key={itemIndex}>{nameOf(item.ingredientId)} — {item.quantity} {enumLabel(t, 'measurementUnit', item.unit)}</li>)}
                            </ul>
                          </div>
                        ))}
                        {meal.nutritionistNote && <p className="m-0 ml-5 text-[.82rem] italic text-[var(--text-body)]">{meal.nutritionistNote}</p>}
                      </section>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
