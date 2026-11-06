import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/atoms/Button';
import { TextField } from '../../components/atoms/TextField';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { FormCard } from '../../components/molecules/FormCard';
import { cancelPlanOrder, convertPlanOrder, fetchPlanOrder } from '../../store/planOrderSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { formatPrice, maskPhone, maskPostalCode, maskTaxId, type Lang } from '../../utils/format';

const today = () => new Date().toISOString().slice(0, 10);

export const PlanOrderDetailPage = () => {
  const { uuid = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language?.startsWith('en') ? 'en' : 'pt';
  const { current: order, loading, error } = useAppSelector((state) => state.planOrder);

  const schema = yup.object({ paymentDate: yup.string().required(t('planOrders.dueDateRequired')) });
  const { register, handleSubmit, formState: { errors } } = useForm<{ paymentDate: string }>({
    resolver: yupResolver(schema),
    defaultValues: { paymentDate: today() },
  });

  useEffect(() => { dispatch(fetchPlanOrder(uuid)); }, [dispatch, uuid]);

  const confirmed = (key: string) => Boolean(order) && window.confirm(t(key, { name: order?.name }));

  const convert = async ({ paymentDate }: { paymentDate: string }) => {
    if (!confirmed('planOrders.convertConfirm')) return;
    const result = await dispatch(convertPlanOrder({ uuid, paymentDate }));
    if (convertPlanOrder.fulfilled.match(result)) navigate(PATHS.PLAN_ORDERS);
  };

  const cancel = async () => {
    if (!confirmed('planOrders.cancelConfirm')) return;
    const result = await dispatch(cancelPlanOrder(uuid));
    if (cancelPlanOrder.fulfilled.match(result)) navigate(PATHS.PLAN_ORDERS);
  };

  return (
    <div className="business-plan-form-page">
      <Breadcrumb items={[{ label: t('planOrders.breadcrumb'), to: PATHS.PLAN_ORDERS }, { label: order?.name ?? '...' }]} />

      {error && <div className="dashboard-error-state" role="alert"><span><AlertCircle size={18} /> {error}</span></div>}

      {!order ? (
        loading && <div className="table-loading-state"><RefreshCw size={24} className="spin-icon" /><p>{t('common.loading')}</p></div>
      ) : (
        <form noValidate onSubmit={handleSubmit(convert)}>
          <FormCard
            header={<><h2 className="section-title m-0">{order.name}</h2><span>{t(`planOrders.statuses.${order.status}`)}</span></>}
            footer={
              <>
                <div className="flex flex-wrap gap-[10px]">
                  {order.status === 'pending' && (
                    <>
                      <Button type="submit" disabled={loading}>{t('planOrders.convert')}</Button>
                      <Button variant="outline" disabled={loading} onClick={cancel}>{t('planOrders.cancel')}</Button>
                    </>
                  )}
                </div>
                <Button variant="outline" onClick={() => navigate(PATHS.PLAN_ORDERS)}>{t('common.close')}</Button>
              </>
            }
          >
            <p className="mb-2">{maskTaxId(order.taxId)} · {order.email} · {maskPhone(order.phone)}</p>
            <p className="mb-2">{order.addressLine1}{order.addressLine2 ? ` — ${order.addressLine2}` : ''}, {order.locality}/{order.administrativeArea} · {maskPostalCode(order.postalCode)}</p>
            <p className="mb-2"><strong>{order.planName}</strong> — {formatPrice(order.priceInCents, lang)}</p>
            {order.status === 'pending' && (
              <TextField id="paymentDate" type="date" lang={lang === 'en' ? 'en-US' : 'pt-BR'} min={today()} label={t('planOrders.firstDueDate')} className="mt-4 max-w-60" error={errors.paymentDate?.message} {...register('paymentDate')} />
            )}
          </FormCard>
        </form>
      )}
    </div>
  );
};
