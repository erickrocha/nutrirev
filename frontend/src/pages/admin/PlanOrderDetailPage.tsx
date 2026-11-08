import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Button } from '../../components/atoms/Button';
import { TextField } from '../../components/atoms/TextField';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
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
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<{ paymentDate: string }>({
    resolver: yupResolver(schema),
    defaultValues: { paymentDate: today() },
  });

  useEffect(() => { dispatch(fetchPlanOrder(uuid)); }, [dispatch, uuid]);

  const [pending, setPending] = useState<{ action: 'convert' | 'cancel'; paymentDate: string } | null>(null);

  const run = async () => {
    if (!pending) return;
    const result = pending.action === 'convert'
      ? await dispatch(convertPlanOrder({ uuid, paymentDate: pending.paymentDate }))
      : await dispatch(cancelPlanOrder(uuid));
    setPending(null);
    if (result.meta.requestStatus === 'fulfilled') navigate(PATHS.PLAN_ORDERS);
  };

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: t('planOrders.breadcrumb'), to: PATHS.PLAN_ORDERS }, { label: order?.name ?? '...' }]} />

      {error && <ErrorAlert message={error} onRetry={() => { dispatch(fetchPlanOrder(uuid)); }} />}

      {!order ? (
        loading && <p role="status" className="flex items-center justify-center gap-2 p-10 text-[var(--text-body)]"><RefreshCw size={22} className="animate-spin" />{t('common.loading')}</p>
      ) : (
        <form noValidate onSubmit={handleSubmit(({ paymentDate }) => setPending({ action: 'convert', paymentDate }))}>
          <FormCard
            header={<><h2 className="m-0 text-[1.3rem] font-medium text-[var(--text-heading)]">{order.name}</h2><span>{t(`planOrders.statuses.${order.status}`)}</span></>}
            footer={
              <>
                <Button variant="outline" onClick={() => navigate(PATHS.PLAN_ORDERS)}>{t('common.close')}</Button>
                <div className="flex flex-wrap gap-[10px]">
                  {order.status === 'pending' && (
                    <>
                      <Button variant="outline" disabled={loading} onClick={() => setPending({ action: 'cancel', paymentDate: getValues('paymentDate') })}>{t('planOrders.cancel')}</Button>
                      <Button type="submit" disabled={loading}>{t('planOrders.convert')}</Button>
                    </>
                  )}
                </div>
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

      {pending && order && (
        <ConfirmDialog
          title={t(pending.action === 'convert' ? 'planOrders.convert' : 'planOrders.cancel')}
          message={t(pending.action === 'convert' ? 'planOrders.convertConfirm' : 'planOrders.cancelConfirm', { name: order.name })}
          confirmLabel={t(pending.action === 'convert' ? 'planOrders.convert' : 'planOrders.cancel')}
          tone={pending.action === 'convert' ? 'primary' : 'danger'}
          busy={loading}
          onConfirm={run}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
};
