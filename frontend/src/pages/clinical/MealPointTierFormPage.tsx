import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { Loader2, Save, Star, X } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { FormCard } from '../../components/molecules/FormCard';
import { Button } from '../../components/atoms/Button';
import { SelectField } from '../../components/atoms/SelectField';
import { TextField } from '../../components/atoms/TextField';
import { fetchCatalog } from '../../store/catalogSlice';
import { clearMealPointTierError, fetchMealPointTiers, saveMealPointTier } from '../../store/mealPointTierSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { toApiTime, toInputTime } from '../../utils/time';

interface Values { dailyMealId: string; deadlineTime: string; points: string }

export const MealPointTierFormPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const tierId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items, loading, saving, error } = useAppSelector((state) => state.mealPointTier);
  const dailyMeals = useAppSelector((state) => state.catalog.items.daily_meal) ?? [];
  const firstMealId = dailyMeals[0]?.id;
  const [loaded, setLoaded] = useState(false);

  const fetchAll = () => Promise.all([dispatch(fetchMealPointTiers()), dispatch(fetchCatalog('daily_meal'))]).then(() => setLoaded(true));
  useEffect(() => {
    dispatch(clearMealPointTierError());
    Promise.all([dispatch(fetchMealPointTiers()), dispatch(fetchCatalog('daily_meal'))]).then(() => setLoaded(true));
  }, [dispatch]);

  const editing = tierId !== undefined;
  const current = editing ? items.find((item) => item.id === tierId) : undefined;
  const formTitle = editing ? t('mealPointTiers.editTier') : t('mealPointTiers.newTier');

  const schema = useMemo(() => yup.object({
    dailyMealId: yup.string().required(t('mealPointTiers.dailyMealRequired')),
    deadlineTime: yup.string().required(t('mealPointTiers.deadlineRequired')),
    points: yup.string().required(t('mealPointTiers.pointsInvalid')).matches(/^-?\d+$/, t('mealPointTiers.pointsInvalid')),
  }), [t]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({
    resolver: yupResolver(schema) as never,
    defaultValues: { dailyMealId: '', deadlineTime: '12:00', points: '10' },
  });
  useEffect(() => {
    if (current) reset({ dailyMealId: current.dailyMealId ? String(current.dailyMealId) : '', deadlineTime: toInputTime(current.deadlineTime), points: String(current.points) });
    else if (!editing && firstMealId !== undefined) reset({ dailyMealId: String(firstMealId), deadlineTime: '12:00', points: '10' });
  }, [current, editing, firstMealId, reset]);

  const save = async (values: Values) => {
    const payload = { dailyMealId: Number.parseInt(values.dailyMealId, 10), deadlineTime: toApiTime(values.deadlineTime), points: Number.parseInt(values.points, 10) };
    const result = await dispatch(saveMealPointTier({ id: tierId, payload }));
    if (saveMealPointTier.fulfilled.match(result)) navigate(PATHS.MEAL_POINT_TIERS);
  };

  const notFound = editing && loaded && !loading && !current;
  const loadFailed = loaded && !loading && Boolean(error) && items.length === 0;

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-14">
      <Breadcrumb items={[{ label: t('mealPointTiers.title'), to: PATHS.MEAL_POINT_TIERS }, { label: formTitle }]} />
      <header className="mb-6 border-b border-[var(--border-color)] pb-4">
        <h2 className="m-0 text-[1.6rem] font-medium text-[var(--text-heading)]">{formTitle}</h2>
      </header>

      {!loaded && <p role="status" className="flex items-center gap-2 text-[var(--text-body)]"><Loader2 size={18} className="animate-spin" />{t('common.loading')}</p>}
      {loadFailed && <ErrorAlert message={error as string} onRetry={fetchAll} />}
      {notFound && <ErrorAlert message={t('mealPointTiers.emptyStateTitle')} onRetry={fetchAll} />}

      {loaded && !loadFailed && !notFound && (
        <form noValidate onSubmit={handleSubmit(save)}>
          <FormCard
            header={<h3 className="m-0 flex items-center gap-2 text-[1.1rem] text-[var(--accent-primary)]"><Star size={18} />{formTitle}</h3>}
            footer={
              <>
                <Button variant="outline" to={PATHS.MEAL_POINT_TIERS}><X size={16} />{t('common.cancel')}</Button>
                <Button type="submit" disabled={saving}><Save size={18} />{saving ? t('common.saving') : editing ? t('common.saveChanges') : t('common.register')}</Button>
              </>
            }
          >
            {error && <div role="alert" className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{error}</div>}
            <div className="flex flex-col gap-5">
              <SelectField id="tier-meal" label={t('mealPointTiers.dailyMeal')} error={errors.dailyMealId?.message} {...register('dailyMealId')}>
                <option value="">{t('mealPointTiers.selectDailyMeal')}</option>
                {dailyMeals.map((meal) => <option key={meal.id} value={meal.id}>{meal.name}</option>)}
              </SelectField>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <TextField id="tier-deadline" type="time" label={t('mealPointTiers.deadlineTime')} error={errors.deadlineTime?.message} {...register('deadlineTime')} />
                <TextField id="tier-points" type="number" step={1} label={t('mealPointTiers.points')} placeholder={t('mealPointTiers.pointsPlaceholder')} error={errors.points?.message} {...register('points')} />
              </div>
            </div>
          </FormCard>
        </form>
      )}
    </div>
  );
};
