import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Edit2, Plus, RefreshCw, Star, Utensils } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { SearchBox } from '../../components/molecules/SearchBox';
import { Button } from '../../components/atoms/Button';
import { fetchCatalog } from '../../store/catalogSlice';
import { fetchMealPointTiers } from '../../store/mealPointTierSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS, editPath, newPath } from '../../router/routeConfig';
import { formatDisplayTime } from '../../utils/time';

export const MealPointTierListPage = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.mealPointTier);
  const dailyMeals = useAppSelector((state) => state.catalog.items.daily_meal);
  const [search, setSearch] = useState('');

  const load = () => { dispatch(fetchMealPointTiers()); dispatch(fetchCatalog('daily_meal')); };
  useEffect(() => { dispatch(fetchMealPointTiers()); dispatch(fetchCatalog('daily_meal')); }, [dispatch]);

  const mealName = useMemo(() => new Map((dailyMeals ?? []).map((meal) => [meal.id, meal.name])), [dailyMeals]);
  const term = search.toLowerCase();
  const visible = items.filter((item) => (
    (mealName.get(item.dailyMealId as number) || '').toLowerCase().includes(term)
    || (item.deadlineTime || '').includes(term) || String(item.points).includes(term)
  ));

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: t('mealPointTiers.title') }]} />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">{t('mealPointTiers.title')}</h2>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('mealPointTiers.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading} title={t('common.refreshList')}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{t('common.refresh')}
          </Button>
          <Button to={newPath(PATHS.MEAL_POINT_TIERS)}><Plus size={18} />{t('mealPointTiers.newTier')}</Button>
        </div>
      </header>

      <SearchBox value={search} onChange={setSearch} placeholder={t('mealPointTiers.searchPlaceholder')} />
      {error && <ErrorAlert message={error} onRetry={load} />}

      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-white">
        {loading && items.length === 0 ? (
          <p role="status" className="flex items-center justify-center gap-2 p-10 text-[var(--text-body)]"><RefreshCw size={22} className="animate-spin" />{t('mealPointTiers.loadingRecords')}</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center text-[var(--text-body)]">
            <Star size={36} />
            <p className="m-0">{t('mealPointTiers.emptyStateTitle')}</p>
            <Button to={newPath(PATHS.MEAL_POINT_TIERS)}><Plus size={16} />{t('mealPointTiers.emptyStateBtn')}</Button>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-slate-50 text-[.8rem] text-[var(--text-body)]">
                <th className="px-4 py-3">{t('common.id')}</th>
                <th className="px-4 py-3">{t('mealPointTiers.dailyMeal')}</th>
                <th className="px-4 py-3">{t('mealPointTiers.deadlineTime')}</th>
                <th className="px-4 py-3">{t('mealPointTiers.points')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  <td className="w-20 px-4 py-3 font-semibold text-slate-500">#{item.id}</td>
                  <td className="px-4 py-3"><span className="flex items-center gap-[10px] font-medium"><Utensils size={16} className="text-[var(--accent-primary)]" />{mealName.get(item.dailyMealId as number) || `${t('mealPointTiers.dailyMeal')} #${item.dailyMealId}`}</span></td>
                  <td className="px-4 py-3"><span className="flex items-center gap-[6px]"><Clock size={14} className="text-blue-500" />{formatDisplayTime(item.deadlineTime, i18n.language)}</span></td>
                  <td className="px-4 py-3"><span className="flex items-center gap-[6px] font-semibold"><Star size={14} className="text-amber-500" />{item.points}</span></td>
                  <td className="px-4 py-3 text-right"><Button variant="outline" to={editPath(PATHS.MEAL_POINT_TIERS, item.id)} title={t('mealPointTiers.editRecord')}><Edit2 size={16} />{t('common.edit')}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
