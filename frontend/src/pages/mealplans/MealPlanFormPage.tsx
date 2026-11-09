import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Save, Stethoscope, User, X, FileText, Star } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { SectionCard } from '../../components/molecules/SectionCard';
import { Button } from '../../components/atoms/Button';
import { SelectField } from '../../components/atoms/SelectField';
import { TextField } from '../../components/atoms/TextField';
import { FilterableMultiSelect } from '../../components/common/FilterableMultiSelect';
import { MealPlanMealFields } from '../../components/organisms/MealPlanMealFields';
import { clearMealPlanError, fetchMealPlanById, saveMealPlan } from '../../store/mealPlanSlice';
import { fetchAllCustomers } from '../../store/customerSlice';
import { fetchDoctors } from '../../store/doctorSlice';
import { fetchIngredients, fetchIngredientsByIds } from '../../store/ingredientSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { ENUM_VALUES, enumLabel } from '../../utils/enums';
import { emptyMealPlanForm, hasInvalidIngredient, ingredientIdsOf, newMeal, planToForm, toMealPlanPayload, type MealPlanFormValues } from '../../utils/mealPlanForm';

interface FormProps {
  defaults: MealPlanFormValues;
  editing: boolean;
  lang: 'pt' | 'en';
  onSubmit: (values: MealPlanFormValues) => void;
}

// O formulário só monta com os dados prontos: assim os valores iniciais nunca sobrescrevem o que o usuário digitou.
const MealPlanForm = ({ defaults, editing, lang, onSubmit }: FormProps) => {
  const { t } = useTranslation();
  const { saving, error } = useAppSelector((state) => state.mealPlan);
  const doctors = useAppSelector((state) => state.doctor.doctors);
  const doctorsLoading = useAppSelector((state) => state.doctor.loading);
  const patients = useAppSelector((state) => state.customer.allCustomers);

  const schema = useMemo(() => yup.object({
    name: yup.string().trim().required(t('mealPlanForm.nameRequired')),
  }), [t]);
  const methods = useForm<MealPlanFormValues>({ resolver: yupResolver(schema) as never, defaultValues: defaults });
  const { register, control, handleSubmit, setError, formState: { errors } } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'meals' });

  const submit = (values: MealPlanFormValues) => {
    if (hasInvalidIngredient(values)) { setError('root', { message: t('mealPlanForm.invalidIngredient') }); return; }
    onSubmit(values);
  };
  const formError = errors.root?.message ?? (error !== null ? error || t('mealPlanForm.saveError') : null);

  return (
    <FormProvider {...methods}>
      <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-6">
        {formError && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{formError}</div>}

        <SectionCard title={t('mealPlanForm.generalData')} icon={<FileText size={18} />}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextField id="plan-name" label={`${t('mealPlanForm.planName')} *`} placeholder={t('mealPlanForm.planNamePlaceholder')} className="md:col-span-2" error={errors.name?.message} {...register('name')} />
            <SelectField id="plan-category" label={t('mealPlanForm.category')} {...register('category')}>
              {ENUM_VALUES.mealPlanCategory.map((category: string) => <option key={category} value={category}>{enumLabel(t, 'mealPlanCategory', category)}</option>)}
            </SelectField>
            <SelectField id="plan-status" label={t('mealPlanForm.generationStatus')} {...register('generationStatus')}>
              {ENUM_VALUES.mealPlanGenerationStatus.map((status: string) => <option key={status} value={status}>{enumLabel(t, 'mealPlanGenerationStatus', status)}</option>)}
            </SelectField>
            <label className="flex items-center gap-2 text-[.9rem]"><input type="checkbox" className="h-5 w-5" {...register('isFavorite')} /><Star size={15} /><span>{t('mealPlanForm.markAsFavorite')}</span></label>
          </div>
        </SectionCard>

        <SectionCard title={t('mealPlanForm.responsible')} icon={<Stethoscope size={18} />}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Controller name="nutritionistId" control={control} render={({ field }) => (
              <FilterableMultiSelect
                label={t('mealPlanForm.nutritionist')} icon={Stethoscope} iconColor="var(--accent-primary)" isSingleSelect
                options={doctors.map((doctor) => ({ id: doctor.id, name: doctor.name }))}
                selectedIds={field.value ? [Number(field.value)] : []} onChange={(ids) => field.onChange(ids[0] ? String(ids[0]) : '')}
                placeholder={doctorsLoading ? t('mealPlanForm.loadingDoctors') : t('mealPlanForm.selectDoctor')} emptyMessage={t('mealPlanForm.noDoctorFound')}
              />
            )} />
            <Controller name="patientId" control={control} render={({ field }) => (
              <FilterableMultiSelect
                label={t('mealPlanForm.patient')} icon={User} iconColor="var(--accent-primary)" isSingleSelect
                options={patients.map((patient) => ({ id: patient.id, name: `${patient.name}${patient.email ? ` (${patient.email})` : ''}` }))}
                selectedIds={field.value ? [Number(field.value)] : []} onChange={(ids) => field.onChange(ids[0] ? String(ids[0]) : '')}
                placeholder={t('mealPlanForm.selectPatient')} emptyMessage={t('mealPlanForm.noPatientFound')}
              />
            )} />
          </div>
        </SectionCard>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="m-0 text-[1.1rem] text-[var(--accent-primary)]">{t('mealPlanForm.mealsPrescription')}</h3>
            <Button variant="outline" onClick={() => append(newMeal('Lunch', t('mealPlanForm.mainOption')))}><Plus size={15} />{t('mealPlanForm.addMeal')}</Button>
          </div>
          {fields.length === 0
            ? <p className="m-0 rounded-lg border border-dashed border-[var(--border-color)] p-4 text-center text-[var(--text-body)]">{t('mealPlanForm.noMealsConfigured')}</p>
            : fields.map((field, index) => <MealPlanMealFields key={field.id} mealIndex={index} lang={lang} onRemove={() => remove(index)} />)}
        </section>

        <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4">
          <Button variant="outline" to={PATHS.MEAL_PLANS}><X size={16} />{t('common.cancel')}</Button>
          <Button type="submit" disabled={saving}><Save size={18} />{saving ? t('common.saving') : editing ? t('common.saveChanges') : t('mealPlanForm.submitRegister')}</Button>
        </div>
      </form>
    </FormProvider>
  );
};

export const MealPlanFormPage = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'pt';
  const { id } = useParams();
  const planId = id ? Number(id) : undefined;
  const editing = planId !== undefined;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { current, loading, error } = useAppSelector((state) => state.mealPlan);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    dispatch(clearMealPlanError());
    const requests: Array<Promise<unknown>> = [dispatch(fetchAllCustomers()), dispatch(fetchDoctors()), dispatch(fetchIngredients(lang))];
    if (planId !== undefined) {
      requests.push(dispatch(fetchMealPlanById(planId)).then((result) => {
        if (fetchMealPlanById.fulfilled.match(result) && result.payload) dispatch(fetchIngredientsByIds(ingredientIdsOf(result.payload)));
      }));
    }
    Promise.all(requests).then(() => setLoaded(true));
  }, [dispatch, planId, lang]);
  useEffect(() => { load(); }, [load]);

  const save = async (values: MealPlanFormValues) => {
    const result = await dispatch(saveMealPlan({ id: planId, payload: toMealPlanPayload(values, t) }));
    if (saveMealPlan.fulfilled.match(result)) navigate(PATHS.MEAL_PLANS);
  };

  const title = editing ? t('mealPlanForm.editPlanTitle') : t('mealPlanForm.registerNewPlan');
  const crumb = editing && current ? `${t('mealPlanForm.editPlanPrefix')}${current.name}` : t('mealPlanForm.registerNewPlan');
  const loadFailed = editing && loaded && !loading && (error !== null || !current);
  const ready = loaded && !loading && !loadFailed;

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-14">
      <Breadcrumb items={[{ label: t('mealPlanForm.breadcrumbPlans'), to: PATHS.MEAL_PLANS }, { label: crumb }]} />
      <header className="mb-6 border-b border-[var(--border-color)] pb-4">
        <h2 className="m-0 mb-1 text-[1.6rem] font-medium text-[var(--text-heading)]">{title}</h2>
        <p className="m-0 text-[.9rem] text-[var(--text-body)]">{editing && current ? t('mealPlanForm.editPlanSubtitle', { id: current.id }) : t('mealPlanForm.newPlanSubtitle')}</p>
      </header>

      {!loaded && <p role="status" className="flex items-center gap-2 text-[var(--text-body)]"><Loader2 size={18} className="animate-spin" />{t('common.loading')}</p>}
      {loadFailed && <ErrorAlert message={error || t('mealPlanForm.loadError')} onRetry={load} />}
      {ready && <MealPlanForm key={current?.id ?? 'new'} lang={lang} editing={editing} defaults={current ? planToForm(current, t) : emptyMealPlanForm(t)} onSubmit={save} />}
    </div>
  );
};
