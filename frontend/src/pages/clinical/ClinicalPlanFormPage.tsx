import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { FileText, Loader2, Save, X } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { FormCard } from '../../components/molecules/FormCard';
import { Button } from '../../components/atoms/Button';
import { TextField } from '../../components/atoms/TextField';
import { clearClinicalPlanError, fetchClinicalPlans, saveClinicalPlan } from '../../store/clinicalPlanSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { centsToDisplay, displayToCents } from '../../utils/currency';

interface Values { name: string; price: string; renewPeriodDays: string }

export const ClinicalPlanFormPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const planId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items, loading, saving, error } = useAppSelector((state) => state.clinicalPlan);
  const [loaded, setLoaded] = useState(false);

  const load = () => { dispatch(fetchClinicalPlans()).then(() => setLoaded(true)); };
  useEffect(() => {
    dispatch(clearClinicalPlanError());
    dispatch(fetchClinicalPlans()).then(() => setLoaded(true));
  }, [dispatch]);

  const editing = planId !== undefined;
  const current = editing ? items.find((item) => item.id === planId) : undefined;
  const formTitle = editing ? t('clinicalPlans.editPlan') : t('clinicalPlans.newPlan');

  const schema = useMemo(() => yup.object({
    name: yup.string().trim().required(t('clinicalPlans.nameRequired')),
    price: yup.string().test('price', t('clinicalPlans.priceInvalid'), (v) => !v?.trim() || displayToCents(v) !== null),
    renewPeriodDays: yup.string().test('renew', t('clinicalPlans.renewInvalid'), (v) => !v?.trim() || /^[1-9]\d*$/.test(v.trim())),
  }), [t]);

  const { register, handleSubmit, reset, setValue, getValues, formState: { errors } } = useForm<Values>({
    resolver: yupResolver(schema) as never,
    defaultValues: { name: '', price: '', renewPeriodDays: '' },
  });
  useEffect(() => {
    if (current) reset({ name: current.name, price: centsToDisplay(current.priceInCents), renewPeriodDays: current.renewPeriodDays ? String(current.renewPeriodDays) : '' });
  }, [current, reset]);

  const save = async (values: Values) => {
    const renew = values.renewPeriodDays.trim();
    const payload = { name: values.name.trim(), priceInCents: displayToCents(values.price), renewPeriodDays: renew ? Number.parseInt(renew, 10) : null };
    const result = await dispatch(saveClinicalPlan({ id: planId, payload }));
    if (saveClinicalPlan.fulfilled.match(result)) navigate(PATHS.CLINICAL_PLANS);
  };

  const formatPriceOnBlur = () => {
    const cents = displayToCents(getValues('price'));
    if (cents !== null) setValue('price', centsToDisplay(cents));
  };

  const notFound = editing && loaded && !loading && !current;
  const loadFailed = loaded && !loading && Boolean(error) && items.length === 0;

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-14">
      <Breadcrumb items={[{ label: t('clinical.clinicalPlan.title'), to: PATHS.CLINICAL_PLANS }, { label: formTitle }]} />
      <header className="mb-6 border-b border-[var(--border-color)] pb-4">
        <h2 className="m-0 text-[1.6rem] font-medium text-[var(--text-heading)]">{formTitle}</h2>
      </header>

      {!loaded && <p role="status" className="flex items-center gap-2 text-[var(--text-body)]"><Loader2 size={18} className="animate-spin" />{t('common.loading')}</p>}
      {loadFailed && <ErrorAlert message={error as string} onRetry={load} />}
      {notFound && <ErrorAlert message={t('clinicalPlans.emptyStateTitle')} onRetry={load} />}

      {loaded && !loadFailed && !notFound && (
        <form noValidate onSubmit={handleSubmit(save)}>
          <FormCard
            header={<h3 className="m-0 flex items-center gap-2 text-[1.1rem] text-[var(--accent-primary)]"><FileText size={18} />{formTitle}</h3>}
            footer={
              <>
                <Button variant="outline" to={PATHS.CLINICAL_PLANS}><X size={16} />{t('common.cancel')}</Button>
                <Button type="submit" disabled={saving}><Save size={18} />{saving ? t('common.saving') : editing ? t('common.saveChanges') : t('common.register')}</Button>
              </>
            }
          >
            {error && <div role="alert" className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{error}</div>}
            <div className="flex flex-col gap-5">
              <TextField id="plan-name" label={t('clinicalPlans.planName')} placeholder={t('clinicalPlans.planNamePlaceholder')} error={errors.name?.message} {...register('name')} />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <TextField id="plan-price" label={t('clinicalPlans.price')} inputMode="decimal" placeholder="0.00" error={errors.price?.message} {...register('price', { onBlur: formatPriceOnBlur })} />
                <TextField id="plan-renew" label={t('clinicalPlans.renewPeriod')} type="number" min={1} step={1} placeholder={t('clinicalPlans.renewPlaceholder')} error={errors.renewPeriodDays?.message} {...register('renewPeriodDays')} />
              </div>
            </div>
          </FormCard>
        </form>
      )}
    </div>
  );
};
