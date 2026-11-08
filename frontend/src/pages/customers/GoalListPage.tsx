import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Flame, Plus, RefreshCw, Target, User } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { SearchBox } from '../../components/molecules/SearchBox';
import { Button } from '../../components/atoms/Button';
import { loadGoals } from '../../store/goalSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS, editPath, newPath } from '../../router/routeConfig';
import { actualWeightOf, caloricGoalOf, customerIdOf, desiredWeightOf, formulaIdOf, objectiveIdOf } from '../../utils/goalForm';

export const GoalListPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { goals, customers, formulas, objectives, loading, error } = useAppSelector((state) => state.goal);
  const [search, setSearch] = useState('');

  const load = () => { dispatch(loadGoals()); };
  useEffect(() => { dispatch(loadGoals()); }, [dispatch]);

  const customerName = (id: number | null) => customers.find((c) => c.id === id)?.name ?? t('goals.customer', { id });
  const nameIn = (list: Array<{ id: number; name: string }>, id: number | null) => list.find((item) => item.id === id)?.name ?? t('common.notAvailable');
  const term = search.toLowerCase();
  const visible = goals.filter((goal) => (goal.name || '').toLowerCase().includes(term) || customerName(customerIdOf(goal)).toLowerCase().includes(term));

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: t('goals.title') }]} />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">{t('goals.title')}</h2>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('goals.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading} title={t('common.refreshList')}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{t('common.refresh')}</Button>
          <Button to={newPath(PATHS.CUSTOMER_GOALS)}><Plus size={18} />{t('goals.newGoal')}</Button>
        </div>
      </header>

      <SearchBox value={search} onChange={setSearch} placeholder={t('goals.searchPlaceholder')} />
      {error !== null && <ErrorAlert message={error || t('goals.errorLoadingGoals')} onRetry={load} />}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)] bg-white">
        {loading && goals.length === 0 ? (
          <p role="status" className="flex items-center justify-center gap-2 p-10 text-[var(--text-body)]"><RefreshCw size={22} className="animate-spin" />{t('goals.loadingGoals')}</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center text-[var(--text-body)]">
            <Target size={36} />
            <p className="m-0">{t('goals.noGoalsRegistered')}</p>
            <Button to={newPath(PATHS.CUSTOMER_GOALS)}><Plus size={16} />{t('goals.registerFirstGoal')}</Button>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-slate-50 text-[.8rem] text-[var(--text-body)]">
                {['goals.goalClient', 'goals.weightHeight', 'goals.caloricGoal', 'goals.formulaObjective'].map((key) => <th key={key} className="px-4 py-3">{t(key)}</th>)}
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((goal) => {
                const desired = desiredWeightOf(goal);
                const calories = caloricGoalOf(goal);
                return (
                  <tr key={goal.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                    <td className="px-4 py-3"><div className="flex flex-col"><span className="font-semibold">{goal.name}</span><span className="flex items-center gap-1 text-[.82rem] text-[var(--accent-primary)]"><User size={12} />{customerName(customerIdOf(goal))}</span></div></td>
                    <td className="px-4 py-3 text-[.85rem]">
                      <span>{t('goals.currentWeight', { weight: actualWeightOf(goal) || 'N/A' })} {goal.height ? `| ${goal.height} cm` : ''}</span>
                      {desired && <span className="block text-[.78rem] font-medium text-emerald-600">{t('goals.goalWeight', { weight: desired })}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {calories ? <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-[2px] text-[.8rem] font-medium text-amber-700"><Flame size={12} />{calories} kcal</span> : <span className="text-[.82rem] text-slate-500">{t('goals.notCalculated')}</span>}
                    </td>
                    <td className="px-4 py-3 text-[.82rem]">
                      <span className="block font-medium text-[var(--text-heading)]">{nameIn(formulas, formulaIdOf(goal))}</span>
                      <span>{t('goals.objective')} {nameIn(objectives, objectiveIdOf(goal))}</span>
                    </td>
                    <td className="px-4 py-3 text-right"><Button variant="outline" to={editPath(PATHS.CUSTOMER_GOALS, goal.id)} title={t('goals.editGoal')}><Edit2 size={16} />{t('common.edit')}</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
