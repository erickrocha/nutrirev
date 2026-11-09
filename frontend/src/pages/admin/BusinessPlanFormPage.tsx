import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { Layers, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { FormCard } from '../../components/molecules/FormCard';
import { Button } from '../../components/atoms/Button';
import { TextField } from '../../components/atoms/TextField';
import { clearBusinessPlanError, fetchBusinessPlan, saveBusinessPlan } from '../../store/businessPlanSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { displayToCents } from '../../utils/currency';
import { emptyBusinessPlanForm, planToForm, toPlanPayload, type BusinessPlanFormValues } from '../../utils/businessPlanForm';

interface FormProps {
  defaults: BusinessPlanFormValues;
  editing: boolean;
  onSubmit: (values: BusinessPlanFormValues) => void;
}

// O formulário só monta com os dados prontos: assim os valores iniciais nunca sobrescrevem o que o usuário digitou.
const BusinessPlanForm = ({ defaults, editing, onSubmit }: FormProps) => {
  const { t } = useTranslation();
  const { saving, error } = useAppSelector((state) => state.businessPlan);

  const schema = useMemo(() => {
    const invalid = t('businessPlans.validationError');
    const money = (value?: string) => displayToCents(value ?? '') !== null && (displayToCents(value ?? '') as number) >= 0;
    return yup.object({
      name: yup.string().trim().max(200).required(invalid),
      price: yup.string().test('money', invalid, money),
      availableUsers: yup.string().test('users', invalid, (v) => Number(v) > 0),
      periodDays: yup.string().test('period', invalid, (v) => Number(v) > 0),
      dailyAiQuota: yup.string().test('quota', invalid, (v) => v !== undefined && v.trim() !== '' && Number(v) >= 0),
      paymentDate: yup.string().required(invalid),
      tiers: yup.array(yup.object({
        tierId: yup.number().nullable(),
        upToUsers: yup.string().test('upTo', invalid, (v) => !v?.trim() || Number(v) >= 0),
        pricePerUser: yup.string().test('tierPrice', invalid, money),
      })),
    });
  }, [t]);

  const { register, control, handleSubmit, formState: { errors } } = useForm<BusinessPlanFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: defaults,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'tiers' });
  const title = editing ? t('businessPlans.editTitle') : t('businessPlans.createTitle');

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <FormCard
        header={<h3 className="m-0 text-[1.1rem]">{title}</h3>}
        footer={
          <>
            <Button variant="outline" to={PATHS.BUSINESS_PLANS}><X size={16} />{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving}><Save size={17} />{saving ? t('common.saving') : t('common.save')}</Button>
          </>
        }
      >
        {error !== null && <div role="alert" className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{error || t('businessPlans.saveError')}</div>}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextField id="plan-name" label={`${t('businessPlans.name')} *`} maxLength={200} error={errors.name?.message} {...register('name')} />
          <TextField id="plan-price" type="number" min={0} step="0.01" label={`${t('businessPlans.basePrice')} *`} error={errors.price?.message} {...register('price')} />
          <TextField id="plan-users" type="number" min={1} step={1} label={`${t('businessPlans.availableUsers')} *`} error={errors.availableUsers?.message} {...register('availableUsers')} />
          <TextField id="plan-quota" type="number" min={0} step={1} label={`${t('businessPlans.dailyAiQuota')} *`} error={errors.dailyAiQuota?.message} {...register('dailyAiQuota')} />
          <TextField id="plan-period" type="number" min={1} step={1} label={`${t('businessPlans.periodDays')} *`} error={errors.periodDays?.message} {...register('periodDays')} />
          <TextField id="plan-payment-date" type="date" label={`${t('businessPlans.paymentDate')} *`} error={errors.paymentDate?.message} {...register('paymentDate')} />
        </div>

        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="m-0 flex items-center gap-2 text-[1rem] text-[var(--accent-primary)]"><Layers size={17} />{t('businessPlans.tiers')}</h3>
              <p className="m-0 text-[.82rem] text-[var(--text-body)]">{t('businessPlans.tiersSubtitle')}</p>
            </div>
            <Button variant="outline" onClick={() => append({ tierId: null, upToUsers: '', pricePerUser: '' })}><Plus size={15} />{t('businessPlans.addTier')}</Button>
          </div>
          {fields.length === 0 ? (
            <p className="m-0 rounded-lg border border-dashed border-[var(--border-color)] p-4 text-center text-[.85rem] text-[var(--text-body)]">{t('businessPlans.noTiers')}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
                  <TextField id={`tier-up-${index}`} type="number" min={1} step={1} label={t('businessPlans.upToUsers')} placeholder={t('businessPlans.unlimitedUsers')} error={errors.tiers?.[index]?.upToUsers?.message} {...register(`tiers.${index}.upToUsers`)} />
                  <TextField id={`tier-price-${index}`} type="number" min={0} step="0.01" label={`${t('businessPlans.pricePerUserTier')} *`} error={errors.tiers?.[index]?.pricePerUser?.message} {...register(`tiers.${index}.pricePerUser`)} />
                  <Button variant="outline" onClick={() => remove(index)} title={t('businessPlans.removeTier')} aria-label={t('businessPlans.removeTier')}><Trash2 size={16} /></Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </FormCard>
    </form>
  );
};

export const BusinessPlanFormPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const planId = id ? Number(id) : undefined;
  const editing = planId !== undefined;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { current, loading, error } = useAppSelector((state) => state.businessPlan);
  const [loaded, setLoaded] = useState(!editing);

  const load = () => { if (editing) dispatch(fetchBusinessPlan(planId)).then(() => setLoaded(true)); };
  useEffect(() => {
    dispatch(clearBusinessPlanError());
    if (planId !== undefined) dispatch(fetchBusinessPlan(planId)).then(() => setLoaded(true));
  }, [dispatch, planId]);

  const save = async (values: BusinessPlanFormValues) => {
    const result = await dispatch(saveBusinessPlan({ id: planId, payload: toPlanPayload(values) }));
    if (saveBusinessPlan.fulfilled.match(result)) navigate(PATHS.BUSINESS_PLANS, { replace: true });
  };

  const title = editing ? t('businessPlans.editTitle') : t('businessPlans.createTitle');
  const loadFailed = editing && loaded && !loading && (error !== null || !current);
  const ready = loaded && !loading && !loadFailed;

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-14">
      <Breadcrumb items={[{ label: t('businessPlans.title'), to: PATHS.BUSINESS_PLANS }, { label: title }]} />
      <header className="mb-6 border-b border-[var(--border-color)] pb-4">
        <h2 className="m-0 mb-1 text-[1.6rem] font-medium text-[var(--text-heading)]">{title}</h2>
        <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('businessPlans.formSubtitle')}</p>
      </header>

      {!loaded && <p role="status" className="flex items-center gap-2 text-[var(--text-body)]"><Loader2 size={18} className="animate-spin" />{t('common.loading')}</p>}
      {loadFailed && <ErrorAlert message={error || t('businessPlans.formLoadError')} onRetry={load} />}
      {ready && <BusinessPlanForm key={current?.id ?? 'new'} defaults={current ? planToForm(current) : emptyBusinessPlanForm()} editing={editing} onSubmit={save} />}
    </div>
  );
};
