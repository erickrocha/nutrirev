import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Clock, Star, Utensils, Video } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { fetchIngredientsByIds } from '../../store/ingredientSlice';
import { fetchRecipeById } from '../../store/recipeSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { enumLabel } from '../../utils/enums';
import { ingredientName as localizedName } from '../../utils/ingredients';

export const CustomerEatDetailPage = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'pt';
  const dispatch = useAppDispatch();
  const { current: recipe, loading, error } = useAppSelector((state) => state.recipe);
  const ingredientsList = useAppSelector((state) => state.ingredient.ingredientsList);

  const load = () => {
    dispatch(fetchRecipeById(Number(id))).then((result) => {
      if (fetchRecipeById.fulfilled.match(result) && result.payload) dispatch(fetchIngredientsByIds((result.payload.ingredients ?? []).map((item) => item.ingredientId)));
    });
  };
  useEffect(() => {
    dispatch(fetchRecipeById(Number(id))).then((result) => {
      if (fetchRecipeById.fulfilled.match(result) && result.payload) dispatch(fetchIngredientsByIds((result.payload.ingredients ?? []).map((item) => item.ingredientId)));
    });
  }, [dispatch, id]);

  const nameOf = (ingredientId?: number) => localizedName(ingredientsList.find((item) => item.id === ingredientId), lang) || `Ingrediente #${ingredientId}`;
  const crumbs = [{ label: t('eat.recipes'), to: '/eat' }, { label: recipe?.name ?? '…' }];

  if (loading) return <p role="status" className="p-10 text-center text-[var(--text-body)]">{t('common.loading')}</p>;
  if (error !== null || !recipe) {
    return (
      <div className="mx-auto w-full max-w-[800px]">
        <Breadcrumb items={crumbs} />
        <ErrorAlert message={error || t('eat.recipeNotFound')} onRetry={load} />
      </div>
    );
  }

  const macros = recipe.total_macros;
  return (
    <div className="mx-auto w-full max-w-[800px] pb-10">
      <Breadcrumb items={crumbs} />
      <Link to="/eat" className="mb-3 inline-flex items-center gap-1 text-[.85rem] font-semibold text-[var(--accent-primary)] no-underline"><ArrowLeft size={16} />{t('eat.backToRecipes')}</Link>
      {recipe.photo
        ? <img src={recipe.photo} alt={recipe.name} className="mb-4 h-64 w-full rounded-2xl object-cover" />
        : <div className="mb-4 flex h-64 items-center justify-center rounded-2xl bg-slate-100 text-slate-300"><Utensils size={48} /></div>}
      <div className="mb-2 flex items-center gap-2">
        <h1 className="m-0 text-[1.6rem] text-[var(--text-heading)]">{recipe.name}</h1>
        {recipe.isHighlight && <Star size={20} fill="currentColor" className="text-[var(--accent-primary)]" aria-label="highlight" />}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[.88rem] text-[var(--text-body)]">
        {recipe.time ? <span className="flex items-center gap-1"><Clock size={14} />{recipe.time} min</span> : null}
        {recipe.portion ? <span>{t('eat.servings', { count: recipe.portion })}</span> : null}
        {recipe.price != null && <span className="font-semibold text-emerald-600">R$ {Number(recipe.price).toFixed(2)}</span>}
        {recipe.videoUrl && <a href={recipe.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[var(--accent-primary)]"><Video size={14} />{t('eat.watchVideo')}</a>}
      </div>
      {recipe.description && <p className="mb-4 mt-0 text-[var(--text-body)]">{recipe.description}</p>}
      {macros && (
        <div className="mb-5 flex flex-wrap gap-2 text-[.82rem]">
          <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-700">{macros.kcal} kcal</span>
          <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">P: {macros.protein_g}g</span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">C: {macros.carbs_g}g</span>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">G: {macros.fat_g}g</span>
        </div>
      )}
      {(recipe.ingredients?.length ?? 0) > 0 && (
        <section className="mb-5">
          <h3 className="mb-2 mt-0 text-[1.05rem]">{t('eat.ingredients')}</h3>
          <ul className="m-0 pl-5 text-[var(--text-body)]">{recipe.ingredients?.map((item, index) => <li key={index}>{nameOf(item.ingredientId)} — {item.quantity} {enumLabel(t, 'measurementUnit', item.unit)}</li>)}</ul>
        </section>
      )}
      {(recipe.directions?.length ?? 0) > 0 && (
        <section className="mb-5">
          <h3 className="mb-2 mt-0 text-[1.05rem]">{t('eat.directions')}</h3>
          <ol className="m-0 pl-5 text-[var(--text-body)]">{recipe.directions?.map((step, index) => <li key={index}>{step.description}</li>)}</ol>
        </section>
      )}
      {((recipe.restrictions?.length ?? 0) > 0 || (recipe.tags?.length ?? 0) > 0) && (
        <div className="flex flex-wrap gap-2 text-[.78rem]">
          {recipe.restrictions?.map((item, index) => <span key={`r-${index}`} className="rounded-full bg-red-50 px-3 py-[2px] text-red-700">{item.name}</span>)}
          {recipe.tags?.map((item, index) => <span key={`t-${index}`} className="rounded-full bg-blue-50 px-3 py-[2px] text-[var(--accent-primary)]">{item.name}</span>)}
        </div>
      )}
    </div>
  );
};
