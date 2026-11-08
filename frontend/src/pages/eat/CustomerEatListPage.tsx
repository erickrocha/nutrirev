import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Utensils } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { Pagination } from '../../components/molecules/Pagination';
import { fetchRecipesPaginated } from '../../store/recipeSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';

const PAGE_SIZE = 10;

export const CustomerEatListPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { recipes, loading, error, totalPages, totalElements } = useAppSelector((state) => state.recipe);
  const [page, setPage] = useState(1);

  const load = () => { dispatch(fetchRecipesPaginated({ page, size: PAGE_SIZE })); };
  useEffect(() => { dispatch(fetchRecipesPaginated({ page, size: PAGE_SIZE })); }, [dispatch, page]);

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-10">
      <Breadcrumb items={[{ label: t('eat.recipes') }]} />
      <h1 className="mb-4 mt-0 flex items-center gap-2 text-[1.4rem] text-[var(--text-heading)]"><Utensils size={22} />{t('eat.recipes')}</h1>
      {error !== null && <ErrorAlert message={error || t('eat.errorLoadingRecipes')} onRetry={load} />}

      {loading ? (
        <p role="status" className="p-10 text-center text-[var(--text-body)]">{t('common.loading')}</p>
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-white p-10 text-center text-[var(--text-body)]"><Utensils size={48} /><h3 className="m-0">{t('eat.noRecipeFound')}</h3></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Link key={recipe.id} to={`/eat/${recipe.id}`} className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-white text-inherit no-underline shadow-sm hover:border-[var(--accent-primary)]">
              <span className="flex h-36 items-center justify-center bg-slate-100 text-slate-300">
                {recipe.photo ? <img src={recipe.photo} alt={recipe.name} className="h-full w-full object-cover" /> : <Utensils size={40} />}
              </span>
              <span className="flex flex-col gap-1 p-4">
                <h3 className="m-0 text-[1rem] text-[var(--text-heading)]">{recipe.name}</h3>
                {recipe.time ? <span className="flex items-center gap-1 text-[.8rem] text-[var(--text-body)]"><Clock size={13} />{recipe.time} min</span> : null}
                {recipe.total_macros && <span className="text-[.82rem] font-semibold text-orange-600">{recipe.total_macros.kcal} kcal</span>}
              </span>
            </Link>
          ))}
        </div>
      )}

      {totalElements > 0 && <Pagination page={page} totalPages={totalPages} total={totalElements} label={t('eat.recipesCount')} pageSize={PAGE_SIZE} pageSizeOptions={[PAGE_SIZE]} onPage={setPage} onPageSize={() => undefined} />}
    </div>
  );
};
