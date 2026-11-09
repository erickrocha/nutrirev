import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Building, Calendar, CalendarDays, CheckCheck, Copy, CreditCard, Loader2, Mail, MapPin, Phone, Save, Sparkles, X } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { SectionCard } from '../../components/molecules/SectionCard';
import { Button } from '../../components/atoms/Button';
import { TextField } from '../../components/atoms/TextField';
import { PlanChoiceCard } from '../../components/organisms/PlanChoiceCard';
import { loadTenantPlan } from '../../store/tenantPlanSlice';
import { addTenantPlan, fetchTenants } from '../../store/tenantSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { formatAddress } from '../../utils/address';
import { todayIso } from '../../utils/date';
import type { BusinessPlan } from '../../types/businessPlan';
import type { Tenant, TenantPlan } from '../../types/tenant';

interface Values { businessPlanId: string; paymentDate: string; active: boolean }

interface FormProps {
  tenant: Tenant;
  plans: BusinessPlan[];
  activePlan: TenantPlan | null;
  lang: 'pt' | 'en';
}

// Monta com os planos já carregados: o plano ativo (ou o primeiro) já vem selecionado.
const PlanForm = ({ tenant, plans, activePlan, lang }: FormProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const loading = useAppSelector((state) => state.tenant.loading);
  const [error, setError] = useState<string | null>(null);

  const defaults: Values = activePlan?.businessPlanId
    ? { businessPlanId: String(activePlan.businessPlanId), paymentDate: activePlan.paymentDate || todayIso(), active: activePlan.active ?? true }
    : { businessPlanId: plans[0] ? String(plans[0].id) : '', paymentDate: todayIso(), active: true };
  const { register, watch, setValue, handleSubmit } = useForm<Values>({ defaultValues: defaults });
  const selected = watch('businessPlanId');
  const active = watch('active');

  const save = async (values: Values) => {
    if (!values.businessPlanId) { setError(t('tenants.planRequired')); return; }
    setError(null);
    const result = await dispatch(addTenantPlan({
      id: tenant.id,
      planData: { tenantId: tenant.id, businessPlanId: Number.parseInt(values.businessPlanId, 10), paymentDate: values.paymentDate, active: values.active },
    }));
    if (addTenantPlan.fulfilled.match(result)) navigate(PATHS.TENANTS);
    else setError((result.payload as string) || t('tenants.saveError'));
  };

  return (
    <form noValidate onSubmit={handleSubmit(save)} className="flex flex-col gap-6">
      {error && <ErrorAlert message={error} />}

      <SectionCard title={t('tenants.selectPlan')} icon={<Sparkles size={18} />}>
        <p className="mx-0 mb-4 mt-0 text-[.85rem] text-[var(--text-body)]">{t('tenants.selectPlanSubtitle')}</p>
        {plans.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-[var(--text-body)]"><CreditCard size={36} /><p className="m-0">{t('businessPlans.empty')}</p></div>
        ) : (
          <div role="radiogroup" aria-label={t('tenants.selectPlan')} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <PlanChoiceCard key={plan.id} plan={plan} lang={lang} selected={selected === String(plan.id)} onSelect={(id) => { setValue('businessPlanId', String(id)); setError(null); }} />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title={t('tenants.paymentDate')} icon={<CalendarDays size={18} />}>
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
          <TextField id="plan-payment-date" type="date" label={`${t('tenants.paymentDate')} *`} {...register('paymentDate')} />
          <label className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-color)] p-4">
            <span>
              <strong className="block text-[var(--text-heading)]">{active ? t('tenants.planActive') : t('tenants.planInactive')}</strong>
              <small className="text-[var(--text-body)]">{t('tenants.activeToggleHelp')}</small>
            </span>
            <input type="checkbox" role="switch" aria-label={t('tenants.planActive')} className="h-5 w-5" {...register('active')} />
          </label>
        </div>
      </SectionCard>

      <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4">
        <Button variant="outline" to={PATHS.TENANTS}><X size={16} />{t('common.cancel')}</Button>
        <Button type="submit" disabled={loading}>{loading ? <><Loader2 size={16} className="animate-spin" />{t('tenants.saving')}</> : <><Save size={16} />{t('tenants.savePlan')}</>}</Button>
      </div>
    </form>
  );
};

export const TenantPlanPage = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'pt';
  const { id } = useParams();
  const tenantId = Number(id);
  const dispatch = useAppDispatch();
  const { tenantsList, loading: tenantsLoading } = useAppSelector((state) => state.tenant);
  const { businessPlans, activePlan, loading } = useAppSelector((state) => state.tenantPlan);
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    dispatch(fetchTenants());
    dispatch(loadTenantPlan(tenantId)).then(() => setLoaded(true));
  }, [dispatch, tenantId]);

  const tenant = useMemo(() => tenantsList.find((item) => item.id === tenantId), [tenantsList, tenantId]);
  const activeDetails = businessPlans.find((plan) => plan.id === activePlan?.businessPlanId);
  const address = tenant ? formatAddress(tenant) : '';

  const copyUuid = () => {
    if (!tenant?.uuid) return;
    navigator.clipboard?.writeText(tenant.uuid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ready = loaded && !loading && Boolean(tenant);
  const notFound = loaded && !loading && !tenantsLoading && !tenant;

  return (
    <div className="mx-auto w-full max-w-[1100px] pb-14">
      <Breadcrumb items={[{ label: t('tenants.title'), to: PATHS.TENANTS }, { label: tenant?.name ?? t('tenants.managePlan') }]} />

      {!loaded && <p role="status" className="flex items-center gap-2 text-[var(--text-body)]"><Loader2 size={18} className="animate-spin" />{t('tenants.loadingTenants')}</p>}
      {notFound && <ErrorAlert message={t('tenants.noTenantsFound')} />}

      {ready && tenant && (
        <>
          <section className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[var(--border-color)] bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-[var(--accent-primary)]"><Building size={28} /></span>
              <div className="flex flex-col gap-1">
                <h2 className="m-0 flex items-center gap-2 text-[1.4rem] text-[var(--text-heading)]">{tenant.name}<span className="rounded-full bg-slate-100 px-2 py-[2px] text-[.75rem] font-medium text-slate-600">#{tenant.id}</span></h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[.8rem] text-[var(--text-body)]">
                  {tenant.uuid && (
                    <button type="button" onClick={copyUuid} className="flex items-center gap-1 hover:text-[var(--accent-primary)]">
                      UUID: {tenant.uuid}{copied ? <CheckCheck size={12} className="text-green-700" /> : <Copy size={12} />}
                    </button>
                  )}
                  {tenant.email && <span className="flex items-center gap-1"><Mail size={13} />{tenant.email}</span>}
                  {tenant.phone && <span className="flex items-center gap-1"><Phone size={13} />{tenant.phone}</span>}
                  {address && <span className="flex items-center gap-1"><MapPin size={13} />{address}</span>}
                </div>
              </div>
            </div>
            <div className={`rounded-xl border p-3 text-[.85rem] ${activePlan ? 'border-emerald-200 bg-emerald-50' : 'border-[var(--border-color)] bg-slate-50'}`}>
              <span className="flex items-center gap-1 text-[.72rem] font-semibold uppercase text-[var(--text-body)]"><CreditCard size={13} />{t('tenants.currentActivePlan')}</span>
              <strong className="block text-[var(--text-heading)]">{activeDetails?.name || (activePlan ? `Plan #${activePlan.businessPlanId}` : t('tenants.noActivePlan'))}</strong>
              {activePlan && <span className="flex items-center gap-1 text-[.78rem]"><Calendar size={12} />{activePlan.paymentDate || '—'}</span>}
            </div>
          </section>

          <PlanForm key={`${tenant.id}-${activePlan?.businessPlanId ?? 'none'}`} tenant={tenant} plans={businessPlans} activePlan={activePlan} lang={lang} />
        </>
      )}
    </div>
  );
};
