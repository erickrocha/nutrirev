import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { Logo } from '../../components/brand/Logo';
import { LanguageToggle } from '../../components/common/LanguageSwitcher';
import { PlanSummary } from '../../components/organisms/PlanSummary';
import { PlanOrderForm, type PlanOrderFormValues } from '../../components/organisms/PlanOrderForm';
import { createPlanOrder, fetchProvinces, fetchPublicPlan } from '../../store/planOrderSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { Lang } from '../../utils/format';

export const OrderPage = () => {
  const { planUuid = '' } = useParams();
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language?.startsWith('en') ? 'en' : 'pt';
  const dispatch = useAppDispatch();
  const { publicPlan: plan, provinces, createdOrderUuid, loading, error } = useAppSelector((state) => state.planOrder);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [planLoaded, setPlanLoaded] = useState(false);

  useEffect(() => {
    document.title = `NutriRev — ${t('order.title')}`;
    dispatch(fetchProvinces());
    dispatch(fetchPublicPlan(planUuid)).finally(() => setPlanLoaded(true));
  }, [dispatch, planUuid, t]);

  const submit = async ({ accepted: _accepted, ...values }: PlanOrderFormValues) => {
    setSubmitError('');
    const result = await dispatch(createPlanOrder({ ...values, planUuid, language: lang }));
    if (createPlanOrder.fulfilled.match(result)) {
      setSubmittedEmail(values.email);
    } else {
      setSubmitError((result.payload as { status?: number } | undefined)?.status === 400 ? t('order.invalid') : t('order.failed'));
    }
  };

  const planNotFound = planLoaded && !plan && !loading && Boolean(error);

  return (
    <div className="landing-page lp-order-page">
      <header className="lp-header">
        <div className="container lp-header-inner">
          <Link to="/" className="lp-brand" aria-label={t('site.nav.home')}><Logo /></Link>
          <LanguageToggle className="lp-lang" />
        </div>
      </header>

      <main className="container relative pb-[72px] pt-10">
        {planNotFound && <p role="alert">{t('order.planNotFound')} <Link to="/">{t('order.back')}</Link></p>}

        {createdOrderUuid && (
          <section className="lp-card mx-auto my-6 flex max-w-[560px] flex-col items-center gap-3 text-center" role="status">
            <CheckCircle2 size={36} aria-hidden="true" className="text-[var(--accent-primary)]" />
            <h1>{t('order.doneTitle')}</h1>
            <p>{t('order.doneText', { email: submittedEmail })}</p>
            <p><small>{t('order.orderNumber')}: {createdOrderUuid}</small></p>
            <Link to="/" className="lp-btn lp-btn-primary">{t('order.back')}</Link>
          </section>
        )}

        {plan && !createdOrderUuid && (
          <>
            <h1 className="mb-6">{t('order.title')}</h1>
            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
              <PlanSummary plan={plan} lang={lang} />
              <PlanOrderForm provinces={provinces} submitting={loading} error={submitError} onSubmit={submit} />
            </div>
          </>
        )}
      </main>
    </div>
  );
};
