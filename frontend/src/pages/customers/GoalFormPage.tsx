import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { Activity, Loader2, Save, Scale, Target, User, X } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { SectionCard } from '../../components/molecules/SectionCard';
import { Button } from '../../components/atoms/Button';
import { SelectField } from '../../components/atoms/SelectField';
import { TextField } from '../../components/atoms/TextField';
import { FilterableMultiSelect } from '../../components/common/FilterableMultiSelect';
import { clearGoalError, loadGoals, saveGoal } from '../../store/goalSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { goalToForm, newGoalDefaults, toGoalPayload, type GoalFormValues } from '../../utils/goalForm';

const NUMBER_FIELDS: Array<{ name: keyof GoalFormValues; label: string; step: number }> = [
  { name: 'actualWeight', label: 'goalForm.currentWeight', step: 0.1 },
  { name: 'height', label: 'goalForm.height', step: 0.1 },
  { name: 'desiredWeight', label: 'goalForm.desiredWeight', step: 0.1 },
  { name: 'customerCaloricGoal', label: 'goalForm.caloricGoalKcal', step: 1 },
];
const MACRO_FIELDS: Array<{ name: keyof GoalFormValues; label: string }> = [
  { name: 'carbohydrate', label: 'goalForm.carbohydrates' },
  { name: 'protein', label: 'goalForm.proteins' },
  { name: 'lipids', label: 'goalForm.lipids' },
];

interface FormProps {
  defaults: GoalFormValues;
  editing: boolean;
  onSubmit: (values: GoalFormValues) => void;
}

// O formulário só monta com os dados prontos: assim os valores iniciais nunca sobrescrevem o que o usuário digitou.
const GoalForm = ({ defaults, editing, onSubmit }: FormProps) => {
  const { t } = useTranslation();
  const { customers, formulas, activityFactors, objectives, activityLevels, saving, error } = useAppSelector((state) => state.goal);

  const schema = useMemo(() => yup.object({
    name: yup.string().trim().required(t('goalForm.errorSelectClient')),
    customerId: yup.string().required(t('goalForm.errorSelectClient')),
  }), [t]);
  const { register, control, handleSubmit, formState: { errors } } = useForm<GoalFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: defaults,
  });

  const selectOf = (name: keyof GoalFormValues, labelKey: string, placeholderKey: string, options: Array<{ id: number; name: string }>) => (
    <SelectField id={`goal-${name}`} label={t(labelKey)} {...register(name)}>
      <option value="">{t(placeholderKey)}</option>
      {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
    </SelectField>
  );

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {error !== null && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{error || t('goalForm.errorSavingGoal')}</div>}

      <SectionCard title={t('goalForm.section1Title')} icon={<Target size={18} />}>
        <div className="flex flex-col gap-5">
          <Controller name="customerId" control={control} render={({ field }) => (
            <div className="flex flex-col gap-1">
              <FilterableMultiSelect
                label={t('goalForm.customerPatient')} icon={User} iconColor="var(--accent-primary)" isSingleSelect
                options={customers.map((c) => ({ id: c.id, name: `${c.name} ${c.email ? `(${c.email})` : ''}`.trim() }))}
                selectedIds={field.value ? [Number(field.value)] : []} onChange={(ids) => field.onChange(ids[0] ? String(ids[0]) : '')}
                placeholder={t('goalForm.selectPatient')} emptyMessage={t('goalForm.noCustomer')}
              />
              {errors.customerId && <small role="alert" className="text-[.72rem] text-red-700">{errors.customerId.message}</small>}
            </div>
          )} />
          <TextField id="goal-name" label={t('goalForm.goalName')} placeholder={t('goalForm.goalNamePlaceholder')} error={errors.name?.message} {...register('name')} />
        </div>
      </SectionCard>

      <SectionCard title={t('goalForm.section2Title')} icon={<Scale size={18} />}>
        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {NUMBER_FIELDS.map(({ name, label, step }) => <TextField key={name} id={`goal-${name}`} type="number" step={step} label={t(label)} {...register(name)} />)}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {MACRO_FIELDS.map(({ name, label }) => <TextField key={name} id={`goal-${name}`} type="number" step={0.1} label={t(label)} {...register(name)} />)}
        </div>
      </SectionCard>

      <SectionCard title={t('goalForm.section3Title')} icon={<Activity size={18} />}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {selectOf('formulaId', 'goalForm.calculationFormula', 'goalForm.selectFormula', formulas)}
          {selectOf('activityFactorId', 'goalForm.activityFactor', 'goalForm.selectFactor', activityFactors)}
          {selectOf('objectiveId', 'goalForm.clinicalObjective', 'goalForm.selectObjective', objectives)}
          {selectOf('physicalActivityLevelId', 'goalForm.physicalActivityLevel', 'goalForm.selectLevel', activityLevels)}
        </div>
      </SectionCard>

      <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4">
        <Button variant="outline" to={PATHS.CUSTOMER_GOALS}><X size={16} />{t('common.cancel')}</Button>
        <Button type="submit" disabled={saving}><Save size={18} />{saving ? t('common.saving') : editing ? t('common.saveChanges') : t('common.register')}</Button>
      </div>
    </form>
  );
};

export const GoalFormPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const goalId = id ? Number(id) : undefined;
  const editing = goalId !== undefined;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { goals, customers, formulas, activityFactors, objectives, activityLevels, loading, error } = useAppSelector((state) => state.goal);
  const [loaded, setLoaded] = useState(false);

  const load = () => { dispatch(loadGoals()).then(() => setLoaded(true)); };
  useEffect(() => {
    dispatch(clearGoalError());
    dispatch(loadGoals()).then(() => setLoaded(true));
  }, [dispatch]);

  const current = editing ? goals.find((goal) => goal.id === goalId) : undefined;
  const save = async (values: GoalFormValues) => {
    const result = await dispatch(saveGoal({ id: goalId, payload: toGoalPayload(values) }));
    if (saveGoal.fulfilled.match(result)) navigate(PATHS.CUSTOMER_GOALS);
  };

  const formTitle = editing ? t('goalForm.editGoalTitle') : t('goalForm.registerGoalTitle');
  const crumb = editing && current ? t('goalForm.editGoal', { name: current.name }) : t('goalForm.registerNewGoal');
  const notFound = editing && loaded && !loading && !current;
  const loadFailed = loaded && !loading && error !== null && goals.length === 0 && customers.length === 0;
  const ready = loaded && !loading && !loadFailed && !notFound;
  const defaults = current ? goalToForm(current) : newGoalDefaults({ customers, formulas, activityFactors, objectives, activityLevels }, t('goalForm.defaultGoalName'));

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-14">
      <Breadcrumb items={[{ label: t('goalForm.goalManagement'), to: PATHS.CUSTOMER_GOALS }, { label: crumb }]} />
      <header className="mb-6 border-b border-[var(--border-color)] pb-4">
        <h2 className="m-0 mb-1 text-[1.6rem] font-medium text-[var(--text-heading)]">{formTitle}</h2>
        <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('goalForm.subtitle')}</p>
      </header>

      {!loaded && <p role="status" className="flex items-center gap-2 text-[var(--text-body)]"><Loader2 size={18} className="animate-spin" />{t('common.loading')}</p>}
      {loadFailed && <ErrorAlert message={error || t('goals.errorLoadingGoals')} onRetry={load} />}
      {notFound && <ErrorAlert message={t('goals.noGoalsRegistered')} onRetry={load} />}
      {ready && <GoalForm key={current?.id ?? 'new'} defaults={defaults} editing={editing} onSubmit={save} />}
    </div>
  );
};
