import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, Clock, Edit, Eye, Plus, Sparkles, Trash2, Utensils, Video } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { Pagination } from '../../components/molecules/Pagination';
import { SearchBox } from '../../components/molecules/SearchBox';
import { Button } from '../../components/atoms/Button';
import { deleteRecipe, fetchRecipesPaginated, type RecipeQuery } from '../../store/recipeSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { PATHS, editPath, newPath } from '../../router/routeConfig';
import { ENUM_VALUES, enumLabel } from '../../utils/enums';
import type { Recipe } from '../../types/recipe';

const PAGE_SIZES = [10, 20, 50];
const SEARCH_DELAY_MS = 300;

export const RecipeListPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { recipes, loading, saving, error, totalPages, totalElements } = useAppSelector((state) => state.recipe);
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);
  const [period, setPeriod] = useState('');
  const [highlight, setHighlight] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleting, setDeleting] = useState<Recipe | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const params = (): RecipeQuery => ({
    page, size: pageSize, ...(query ? { search: query } : {}), ...(period ? { recommended_period: period } : {}), ...(highlight !== '' ? { is_highlight: highlight === 'true' } : {}),
  });
  const load = () => { dispatch(fetchRecipesPaginated(params())); };
  useEffect(() => {
    dispatch(fetchRecipesPaginated({
      page, size: pageSize, ...(query ? { search: query } : {}), ...(period ? { recommended_period: period } : {}), ...(highlight !== '' ? { is_highlight: highlight === 'true' } : {}),
    }));
  }, [dispatch, page, pageSize, query, period, highlight]);

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await dispatch(deleteRecipe(deleting.id));
    setDeleteFailed(!deleteRecipe.fulfilled.match(result));
    if (deleteRecipe.fulfilled.match(result)) { setDeleting(null); setNotice(t('recipeAdmin.deleted')); load(); }
  };
  const message = error === null ? null : error || t(deleteFailed ? 'recipeAdmin.deleteError' : 'recipeAdmin.loadError');
  const select = 'h-[42px] rounded-lg border border-[var(--border-color)] bg-white px-3 hover:border-[var(--accent-primary)]';

  return (
    <div className="mx-auto w-full max-w-[1200px] pb-6">
      <Breadcrumb items={[{ label: t('recipeAdmin.title') }]} />
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-[1.5rem] font-bold text-[var(--accent-primary)]"><Utensils size={24} />{t('recipeAdmin.title')}</h1>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('recipeAdmin.subtitle')}</p>
        </div>
        <Button to={newPath(PATHS.RECIPES)}><Plus size={18} />{t('recipeAdmin.newRecipe')}</Button>
      </header>

      {message !== null && <ErrorAlert message={message} onRetry={load} />}
      {notice && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[.88rem] text-emerald-700">{notice}</div>}

      <div className="mb-2 flex flex-wrap items-start gap-3">
        <div className="min-w-[260px] flex-1"><SearchBox value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder={t('recipeAdmin.searchPlaceholder')} /></div>
        <select aria-label={t('recipeAdmin.period')} value={period} onChange={(event) => { setPeriod(event.target.value); setPage(1); }} className={select}>
          <option value="">{t('recipeAdmin.allPeriods')}</option>
          {ENUM_VALUES.recommendedPeriod.map((item: string) => <option key={item} value={item}>{enumLabel(t, 'recommendedPeriod', item)}</option>)}
        </select>
        <select aria-label={t('recipeAdmin.highlight')} value={highlight} onChange={(event) => { setHighlight(event.target.value); setPage(1); }} className={select}>
          <option value="">{t('recipeAdmin.allHighlights')}</option>
          <option value="true">{t('recipeAdmin.onlyHighlight')}</option>
          <option value="false">{t('recipeAdmin.normal')}</option>
        </select>
      </div>

      {loading && recipes.length === 0 ? (
        <p role="status" className="p-10 text-center text-[var(--text-body)]">{t('recipeAdmin.loading')}</p>
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-white p-10 text-center text-[var(--text-body)]">
          <Utensils size={40} />
          <h3 className="m-0 text-[var(--text-heading)]">{t('recipeAdmin.empty')}</h3>
          <p className="m-0">{t('recipeAdmin.emptyHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {recipes.map((recipe) => (
            <article key={recipe.id} className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-white shadow-sm">
              <div className="relative h-40 bg-slate-100">
                {recipe.photo ? <img src={recipe.photo} alt={recipe.name} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-slate-300"><Utensils size={40} /></span>}
                <div className="absolute left-2 top-2 flex flex-wrap gap-1 text-[.72rem] font-semibold">
                  {recipe.isHighlight && <span className="flex items-center gap-1 rounded-full bg-amber-400 px-2 py-[2px] text-amber-950"><Sparkles size={12} />{t('recipeAdmin.highlight')}</span>}
                  {recipe.recommendedPeriod && <span className="rounded-full bg-white/90 px-2 py-[2px] text-[var(--accent-primary)]">{enumLabel(t, 'recommendedPeriod', recipe.recommendedPeriod)}</span>}
                  {recipe.videoUrl && <a href={recipe.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-[2px] text-white no-underline"><Video size={12} />YouTube</a>}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="m-0 text-[1.05rem] text-[var(--text-heading)]">{recipe.name}</h3>
                  <span className="flex shrink-0 gap-3 text-[.75rem] text-slate-500"><span className="flex items-center gap-1" title="views"><Eye size={12} />{recipe.views || 0}</span><span className="flex items-center gap-1" title="additions"><Bookmark size={12} />{recipe.additions || 0}</span></span>
                </div>
                {recipe.price !== null && recipe.price !== undefined && <span className="text-[.9rem] font-semibold text-emerald-600">R$ {Number(recipe.price).toFixed(2)}</span>}
                {recipe.description && <p className="m-0 line-clamp-2 text-[.85rem] text-[var(--text-body)]">{recipe.description}</p>}
                <div className="flex flex-wrap gap-3 text-[.8rem] text-[var(--text-body)]">
                  {recipe.time ? <span className="flex items-center gap-1"><Clock size={14} className="text-[var(--accent-primary)]" />{t('recipeAdmin.minutes', { count: recipe.time })}</span> : null}
                  {recipe.portion ? <span>{t('recipeAdmin.serves', { count: recipe.portion })}</span> : null}
                </div>
                {recipe.total_macros && (
                  <div className="flex flex-wrap gap-2 text-[.78rem]">
                    <span className="rounded-full bg-orange-100 px-2 py-[2px] font-semibold text-orange-700">🔥 {recipe.total_macros.kcal} kcal</span>
                    <span className="rounded-full bg-slate-100 px-2 py-[2px]">P: {recipe.total_macros.protein_g}g</span>
                    <span className="rounded-full bg-slate-100 px-2 py-[2px]">C: {recipe.total_macros.carbs_g}g</span>
                  </div>
                )}
              </div>
              <footer className="flex justify-end gap-2 border-t border-slate-100 p-3">
                <Button variant="outline" to={editPath(PATHS.RECIPES, recipe.id)} title={t('common.edit')}><Edit size={15} />{t('common.edit')}</Button>
                <Button variant="outline" onClick={() => { setDeleteFailed(false); setDeleting(recipe); }} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 size={15} /></Button>
              </footer>
            </article>
          ))}
        </div>
      )}

      {totalElements > 0 && (
        <Pagination page={page} totalPages={totalPages} total={totalElements} label={t('recipeAdmin.items')} pageSize={pageSize} pageSizeOptions={PAGE_SIZES} onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />
      )}

      {deleting && (
        <ConfirmDialog
          title={t('recipeAdmin.deleteTitle')} message={t('recipeAdmin.deleteConfirm', { name: deleting.name })} confirmLabel={t('common.delete')}
          busy={saving} onConfirm={confirmDelete} onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
};
