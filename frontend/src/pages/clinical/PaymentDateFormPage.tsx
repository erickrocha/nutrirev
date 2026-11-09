import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { Calendar, Loader2, Save, X } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { FormCard } from '../../components/molecules/FormCard';
import { Button } from '../../components/atoms/Button';
import { SelectField } from '../../components/atoms/SelectField';
import { TextField } from '../../components/atoms/TextField';
import { clearPaymentDateError, loadPaymentDates, savePaymentDate } from '../../store/paymentDateSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { todayIso } from '../../utils/date';

interface Values { customerId: string; clinicalPlanId: string; firstDueDate: string }

export const PaymentDateFormPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const itemId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items, plans, customers, loading, saving, error } = useAppSelector((state) => state.paymentDate);
  const [loaded, setLoaded] = useState(false);

  const load = () => { dispatch(loadPaymentDates()).then(() => setLoaded(true)); };
  useEffect(() => {
    dispatch(clearPaymentDateError());
    dispatch(loadPaymentDates()).then(() => setLoaded(true));
  }, [dispatch]);

  const editing = itemId !== undefined;
  const current = editing ? items.find((item) => item.id === itemId) : undefined;
  const formTitle = editing ? t('paymentDates.editPaymentDate') : t('paymentDates.newPaymentDate');

  const schema = useMemo(() => yup.object({
    customerId: yup.string().required(t('paymentDates.customerRequired')),
    clinicalPlanId: yup.string(),
    firstDueDate: yup.string().required(t('paymentDates.firstDueDateRequired')),
  }), [t]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<Values>({
    resolver: yupResolver(schema) as never,
    defaultValues: { customerId: '', clinicalPlanId: '', firstDueDate: todayIso() },
  });

  useEffect(() => {
    if (current) {
      reset({ customerId: String(current.customerId ?? ''), clinicalPlanId: current.clinicalPlanId ? String(current.clinicalPlanId) : '', firstDueDate: current.firstDueDate || '' });
    } else if (!editing && customers.length > 0) {
      const first = customers[0];
      reset({ customerId: String(first.id), clinicalPlanId: String(first.clinicalPlanId ?? plans[0]?.id ?? ''), firstDueDate: todayIso() });
    }
  }, [current, editing, customers, plans, reset]);

  // Ao cadastrar, escolher o cliente já sugere o plano clínico dele.
  const customerId = watch('customerId');
  useEffect(() => {
    if (editing) return;
    const plan = customers.find((customer) => String(customer.id) === customerId)?.clinicalPlanId;
    if (plan) setValue('clinicalPlanId', String(plan));
  }, [customerId, customers, editing, setValue]);

  const save = async (values: Values) => {
    const payload = {
      customerId: Number.parseInt(values.customerId, 10),
      clinicalPlanId: values.clinicalPlanId ? Number.parseInt(values.clinicalPlanId, 10) : null,
      firstDueDate: values.firstDueDate,
    };
    const result = await dispatch(savePaymentDate({ id: itemId, payload }));
    if (savePaymentDate.fulfilled.match(result)) navigate(PATHS.PAYMENT_DATES);
  };

  const notFound = editing && loaded && !loading && !current;
  const loadFailed = loaded && !loading && Boolean(error) && items.length === 0 && customers.length === 0;

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-14">
      <Breadcrumb items={[{ label: t('paymentDates.title'), to: PATHS.PAYMENT_DATES }, { label: formTitle }]} />
      <header className="mb-6 border-b border-[var(--border-color)] pb-4">
        <h2 className="m-0 text-[1.6rem] font-medium text-[var(--text-heading)]">{formTitle}</h2>
      </header>

      {!loaded && <p role="status" className="flex items-center gap-2 text-[var(--text-body)]"><Loader2 size={18} className="animate-spin" />{t('common.loading')}</p>}
      {loadFailed && <ErrorAlert message={error as string} onRetry={load} />}
      {notFound && <ErrorAlert message={t('paymentDates.emptyStateTitle')} onRetry={load} />}

      {loaded && !loadFailed && !notFound && (
        <form noValidate onSubmit={handleSubmit(save)}>
          <FormCard
            header={<h3 className="m-0 flex items-center gap-2 text-[1.1rem] text-[var(--accent-primary)]"><Calendar size={18} />{formTitle}</h3>}
            footer={
              <>
                <Button variant="outline" to={PATHS.PAYMENT_DATES}><X size={16} />{t('common.cancel')}</Button>
                <Button type="submit" disabled={saving}><Save size={18} />{saving ? t('common.saving') : editing ? t('common.saveChanges') : t('common.register')}</Button>
              </>
            }
          >
            {error && <div role="alert" className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{error}</div>}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <SelectField id="pd-customer" label={t('paymentDates.client')} error={errors.customerId?.message} {...register('customerId')}>
                <option value="">{t('paymentDates.selectCustomer')}</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </SelectField>
              <SelectField id="pd-plan" label={t('paymentDates.clinicalPlan')} {...register('clinicalPlanId')}>
                <option value="">{t('paymentDates.selectPlan')}</option>
                {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </SelectField>
              <TextField id="pd-due" type="date" label={t('paymentDates.firstDueDateLabel')} error={errors.firstDueDate?.message} className="md:col-span-2" {...register('firstDueDate')} />
            </div>
          </FormCard>
        </form>
      )}
    </div>
  );
};
