import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Cake, CheckCircle2, ChevronRight, CreditCard, FileText, Gem, MapPin, Phone, Star, User as UserIcon } from 'lucide-react';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { loadHome, loadSummary } from '../../store/customerAppSlice';
import { fetchMyCharges } from '../../store/paymentSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { daysUntil } from '../../utils/card';
import { enumLabel } from '../../utils/enums';
import { mealPlanCategoryLabel } from '../mealplans/mealPlanCategories';

const DUE_SOON_DAYS = 7;

const InfoBadge = ({ icon: Icon, label }: { icon: typeof Phone; label: string }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[.8rem] text-slate-700"><Icon size={14} />{label}</span>
);

export const CustomerHomePage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { customer, customerLoading, customerError, slots, slotsLoading, slotsError, summary, summaryLoading, summaryError } = useAppSelector((state) => state.customerApp);
  const { mealPlans, loading: planLoading, error: planError } = useAppSelector((state) => state.mealPlan);
  const charges = useAppSelector((state) => state.payment.charges);

  const load = () => { dispatch(loadHome()); dispatch(loadSummary()); dispatch(fetchMyCharges()); };
  useEffect(() => { dispatch(loadHome()); dispatch(loadSummary()); dispatch(fetchMyCharges()); }, [dispatch]);

  const greeting = () => {
    const hour = new Date().getHours();
    return t(hour < 12 ? 'home.goodMorning' : hour < 18 ? 'home.goodAfternoon' : 'home.goodEvening');
  };

  const latestPlan = mealPlans[0] ?? null;
  const consumed = summary?.caloriesConsumed || 0;
  const budget = latestPlan?.totalMacros?.kcal || 0;
  const progress = budget > 0 ? Math.min(1, consumed / budget) : 0;

  const nextUnpaid = charges.filter((c) => c.status === 'open' || c.status === 'overdue').sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))[0];
  const dueDays = nextUnpaid ? daysUntil(nextUnpaid.dueDate) : null;
  const overdue = nextUnpaid ? nextUnpaid.status === 'overdue' || (dueDays !== null && dueDays < 0) : false;
  const dueSoon = Boolean(nextUnpaid) && !overdue && dueDays !== null && dueDays <= DUE_SOON_DAYS;

  if (customerLoading) return <p role="status" className="mt-16 text-center text-[var(--text-body)]">{t('home.loadingHome')}</p>;

  const photo = customer?.photoBase64 || customer?.photoUrl || customer?.photo || null;
  const location = [customer?.city, customer?.province].filter(Boolean).join(', ');

  return (
    <div className="mx-auto flex w-full max-w-[800px] flex-col gap-5 pb-10">
      {(overdue || dueSoon) && (
        <Link to={PATHS.PAYMENTS} className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-white no-underline ${overdue ? 'bg-red-600' : 'bg-amber-500'}`}>
          <span className="flex items-center gap-2"><CreditCard size={18} />{overdue ? t('payments.bannerOverdue') : t('payments.bannerDueSoon')}</span>
          <span className="flex items-center gap-1 text-[.85rem] font-semibold">{overdue ? t('payments.payNow') : t('payments.viewDetails')}<ChevronRight size={16} /></span>
        </Link>
      )}

      {customerError && <ErrorAlert message={t('home.errorLoadingProfile')} onRetry={load} />}

      {customer && (
        <section className="rounded-2xl border border-[var(--border-color)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-[1.2rem] font-semibold text-[var(--accent-primary)]">
              {photo ? <img src={photo} alt={customer.name} className="h-full w-full object-cover" /> : (customer.name ? customer.name[0].toUpperCase() : 'P')}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="m-0 text-[1.2rem]">{greeting()}, {(customer.name || '').split(' ')[0]}!</h2>
              <p className="m-0 truncate text-[.85rem] text-[var(--text-body)]">{customer.email}</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-[2px] text-[.72rem] font-semibold text-emerald-700"><CheckCircle2 size={12} />{t('common.active')}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {customer.phone && <InfoBadge icon={Phone} label={customer.phone} />}
            {location && <InfoBadge icon={MapPin} label={location} />}
            {customer.gender && <InfoBadge icon={UserIcon} label={customer.gender} />}
            {customer.dateOfBirth && <InfoBadge icon={Cake} label={customer.dateOfBirth} />}
          </div>
        </section>
      )}

      {summaryError ? <ErrorAlert message={t('home.errorLoadingProgress')} onRetry={() => dispatch(loadSummary())} /> : (
        <section className="rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-blue-500 p-5 text-white shadow-md">
          <div className="flex items-center justify-between text-[.9rem]">
            <span>{t('home.todayProgress')}</span>
            <span className="flex items-center gap-1 font-semibold"><Gem size={16} />{summaryLoading ? '—' : summary?.totalPoints || 0} pts</span>
          </div>
          <p className="my-2 text-[1.5rem] font-bold">
            {summaryLoading ? t('common.loading') : budget > 0 ? `${Math.round(consumed)} / ${Math.round(budget)} kcal` : t('home.kcalConsumed', { consumed: Math.round(consumed) })}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-white/30"><div role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} className="h-full rounded-full bg-white" style={{ width: `${progress * 100}%` }} /></div>
          <p className="mb-0 mt-2 text-[.8rem] opacity-90">{summaryLoading ? '' : t('home.mealsLogged', { count: summary?.mealsLogged || 0 })}</p>
        </section>
      )}

      <section>
        <h3 className="mb-2 mt-0 text-[1.05rem]">{t('home.mealPlan')}</h3>
        {planLoading ? <p className="text-[var(--text-body)]">{t('common.loading')}</p>
          : planError !== null ? <ErrorAlert message={planError || t('home.errorLoadingProfile')} />
          : !latestPlan ? <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-white p-6 text-center text-[var(--text-body)]"><FileText size={32} /><p className="m-0">{t('home.noMealPlanYet')}</p></div>
          : (
            <Link to={PATHS.MY_MEAL_PLAN} className="block rounded-2xl border border-[var(--border-color)] bg-white p-4 text-inherit no-underline shadow-sm hover:border-[var(--accent-primary)]">
              <div className="flex items-center justify-between"><h4 className="m-0">{latestPlan.name}</h4>{latestPlan.isFavorite && <Star size={16} fill="currentColor" className="text-[var(--accent-primary)]" />}</div>
              <p className="my-1 text-[.82rem] text-[var(--text-body)]">{mealPlanCategoryLabel(t, latestPlan.category)} · {enumLabel(t, 'mealPlanGenerationStatus', latestPlan.generationStatus || 'Draft')}</p>
              <p className="m-0 text-[.82rem] text-[var(--text-body)]">{t('home.mealsCount', { count: (latestPlan.meals ?? []).length })}</p>
            </Link>
          )}
      </section>

      <section>
        <h3 className="mb-2 mt-0 text-[1.05rem]">{t('home.dailyMeals')}</h3>
        {slotsLoading ? <p className="text-[var(--text-body)]">{t('common.loading')}</p>
          : slotsError ? <ErrorAlert message={t('home.errorLoadingDailyMeals')} />
          : slots.length === 0 ? <p className="m-0 text-[var(--text-body)]">{t('home.noDailyMealsAssigned')}</p>
          : <div className="flex flex-wrap gap-2">{slots.map((slot) => <span key={slot.id} className="rounded-full bg-blue-50 px-3 py-1 text-[.82rem] font-medium text-[var(--accent-primary)]">{slot.name}</span>)}</div>}
      </section>
    </div>
  );
};
