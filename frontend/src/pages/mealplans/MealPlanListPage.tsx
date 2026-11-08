import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit, FileText, Plus, Star, Trash2 } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { Pagination } from '../../components/molecules/Pagination';
import { SearchBox } from '../../components/molecules/SearchBox';
import { Button } from '../../components/atoms/Button';
import { deleteMealPlan, fetchMealPlansPaginated, toggleMealPlanFavorite, type MealPlanQuery } from '../../store/mealPlanSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { PATHS, editPath, newPath } from '../../router/routeConfig';
import { enumLabel } from '../../utils/enums';
import { MEAL_PLAN_CATEGORIES, mealPlanCategoryLabel } from './mealPlanCategories';
import type { MealPlan } from '../../types/mealPlan';

const PAGE_SIZES = [10, 20, 50];
const SEARCH_DELAY_MS = 300;

export const MealPlanListPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { mealPlans, loading, saving, error, totalPages, totalElements } = useAppSelector((state) => state.mealPlan);
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleting, setDeleting] = useState<MealPlan | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);

  const params: MealPlanQuery = { page, size: pageSize, ...(query ? { search: query } : {}), ...(category ? { category } : {}) };
  const load = () => { dispatch(fetchMealPlansPaginated(params)); };
  useEffect(() => { dispatch(fetchMealPlansPaginated({ page, size: pageSize, ...(query ? { search: query } : {}), ...(category ? { category } : {}) })); }, [dispatch, page, pageSize, query, category]);

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await dispatch(deleteMealPlan(deleting.id));
    setDeleteFailed(!deleteMealPlan.fulfilled.match(result));
    if (deleteMealPlan.fulfilled.match(result)) { setDeleting(null); setNotice(t('mealPlanAdmin.deleted')); load(); }
  };

  const message = error === null ? null : error || t(deleteFailed ? 'mealPlanAdmin.deleteError' : 'mealPlanAdmin.loadError');

  return (
    <div className="mx-auto w-full max-w-[1200px] pb-6">
      <Breadcrumb items={[{ label: t('mealPlanAdmin.title') }]} />
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-[1.5rem] font-bold text-[var(--accent-primary)]"><FileText size={24} />{t('mealPlanAdmin.title')}</h1>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('mealPlanAdmin.subtitle')}</p>
        </div>
        <Button to={newPath(PATHS.MEAL_PLANS)}><Plus size={18} />{t('mealPlanAdmin.newPlan')}</Button>
      </header>

      {message !== null && <ErrorAlert message={message} onRetry={load} />}
      {notice && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[.88rem] text-emerald-700">{notice}</div>}

      <div className="mb-2 flex flex-wrap items-start gap-3">
        <div className="min-w-[260px] flex-1"><SearchBox value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder={t('mealPlanAdmin.searchPlaceholder')} /></div>
        <select
          aria-label={t('mealPlan.category')} value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}
          className="h-[42px] rounded-lg border border-[var(--border-color)] bg-white px-3 hover:border-[var(--accent-primary)]"
        >
          <option value="">{t('mealPlan.allCategories')}</option>
          {MEAL_PLAN_CATEGORIES.map((item) => <option key={item} value={item}>{enumLabel(t, 'mealPlanCategory', item)}</option>)}
        </select>
      </div>

      {loading && mealPlans.length === 0 ? (
        <p role="status" className="p-10 text-center text-[var(--text-body)]">{t('mealPlanAdmin.loading')}</p>
      ) : mealPlans.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-white p-10 text-center text-[var(--text-body)]">
          <FileText size={40} />
          <h3 className="m-0 text-[var(--text-heading)]">{t('mealPlanAdmin.empty')}</h3>
          <p className="m-0">{t('mealPlanAdmin.emptyHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {mealPlans.map((plan) => (
            <article key={plan.id} className="flex flex-col gap-3 rounded-2xl border border-[var(--border-color)] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-blue-50 px-3 py-[2px] text-[.75rem] font-semibold text-[var(--accent-primary)]">{mealPlanCategoryLabel(t, plan.category)}</span>
                <button
                  type="button" onClick={() => dispatch(toggleMealPlanFavorite(plan.id))} aria-pressed={Boolean(plan.isFavorite)} aria-label={t('mealPlanAdmin.favorite')} title={t('mealPlanAdmin.favorite')}
                  className={`rounded p-1 hover:bg-slate-100 ${plan.isFavorite ? 'text-yellow-400' : 'text-slate-500'}`}
                ><Star size={18} fill={plan.isFavorite ? 'currentColor' : 'none'} /></button>
              </div>
              <h3 className="m-0 text-[1.05rem] text-[var(--text-heading)]">{plan.name}</h3>
              <div className="flex flex-wrap items-center gap-2 text-[.78rem]">
                <span className={`rounded-full px-2 py-[2px] font-semibold ${plan.generationStatus === 'Finished' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{enumLabel(t, 'mealPlanGenerationStatus', plan.generationStatus || 'Draft')}</span>
                <span className="text-[var(--text-body)]">{t('mealPlanAdmin.mealsCount', { count: (plan.meals ?? []).length })}</span>
              </div>
              {plan.totalMacros && (
                <div className="flex flex-wrap gap-2 text-[.78rem]">
                  <span className="rounded-full bg-orange-100 px-2 py-[2px] font-semibold text-orange-700">🔥 {plan.totalMacros.kcal} kcal</span>
                  <span className="rounded-full bg-slate-100 px-2 py-[2px]">P: {plan.totalMacros.proteinG}g</span>
                  <span className="rounded-full bg-slate-100 px-2 py-[2px]">C: {plan.totalMacros.carbsG}g ({plan.totalMacros.carbsPct}%)</span>
                  <span className="rounded-full bg-slate-100 px-2 py-[2px]">G: {plan.totalMacros.lipidsG}g ({plan.totalMacros.lipidsPct}%)</span>
                </div>
              )}
              <div className="mt-auto flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Button variant="outline" to={editPath(PATHS.MEAL_PLANS, plan.id)} title={t('common.edit')}><Edit size={15} />{t('common.edit')}</Button>
                <Button variant="outline" onClick={() => { setDeleteFailed(false); setDeleting(plan); }} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 size={15} /></Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {totalElements > 0 && (
        <Pagination page={page} totalPages={totalPages} total={totalElements} label={t('mealPlanAdmin.plans')} pageSize={pageSize} pageSizeOptions={PAGE_SIZES} onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />
      )}

      {deleting && (
        <ConfirmDialog
          title={t('mealPlanAdmin.deleteTitle')} message={t('mealPlanAdmin.deleteConfirm', { name: deleting.name })} confirmLabel={t('common.delete')}
          busy={saving} onConfirm={confirmDelete} onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
};
