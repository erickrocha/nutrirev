import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  Phone,
  MapPin,
  User as UserIcon,
  Cake,
  CheckCircle2,
  Gem,
  Star,
  FileText,
  AlertCircle,
  Sparkles,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import { fetchMealPlansPaginated } from '../../store/mealPlanSlice';
import { mealPlanCategoryLabel } from '../mealplans/mealPlanCategories';
import {
  customerService,
  dashboardService,
  dailyMealService,
  customerDailyMealService,
  paymentService,
} from '../../services/api';
import { enumLabel } from '../../utils/enums';
import { PATHS } from '../../router/routeConfig';

const getGreeting = (t) => {
  const hour = new Date().getHours();
  if (hour < 12) return t('home.goodMorning');
  if (hour < 18) return t('home.goodAfternoon');
  return t('home.goodEvening');
};

const getDaysUntilDue = (dueDateStr) => {
  if (!dueDateStr) return null;
  const parts = dueDateStr.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  const due = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const today = new Date();
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffTime = due.getTime() - todayNorm.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

const InfoBadge = ({ icon: Icon, label }) => (
  <span className="customer-info-badge">
    <Icon size={14} />
    {label}
  </span>
);

export const CustomerHomePage = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { mealPlans, loading: mealPlanLoading, error: mealPlanError } = useSelector((state) => state.mealPlan);

  const [customer, setCustomer] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(true);
  const [customerError, setCustomerError] = useState('');

  const [charges, setCharges] = useState([]);
  const [assignedMeals, setAssignedMeals] = useState([]);
  const [dailyMealsLoading, setDailyMealsLoading] = useState(true);
  const [dailyMealsError, setDailyMealsError] = useState('');

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const loadDailyMeals = useCallback(async (customerId) => {
    setDailyMealsLoading(true);
    setDailyMealsError('');
    try {
      const [all, links] = await Promise.all([
        dailyMealService.getAll(),
        customerDailyMealService.getByCustomerId(customerId),
      ]);
      const assignedIds = new Set((links || []).map((l) => l.dailyMealId || l.daily_meal_id));
      setAssignedMeals((all || []).filter((m) => assignedIds.has(m.id)));
    } catch (err) {
      console.error('Error loading daily meals:', err);
      setDailyMealsError(t('home.errorLoadingDailyMeals'));
    } finally {
      setDailyMealsLoading(false);
    }
  }, [t]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const [nutrition, points] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getPoints(),
      ]);
      setSummary({
        caloriesConsumed: nutrition?.calories_consumed || 0,
        mealsLogged: nutrition?.meals_logged || 0,
        totalPoints: points?.total_points || 0,
      });
    } catch (err) {
      console.error('Error loading dashboard summary:', err);
      setSummaryError(t('home.errorLoadingProgress'));
    } finally {
      setSummaryLoading(false);
    }
  }, [t]);

  const loadCharges = useCallback(async () => {
    try {
      const data = await paymentService.getMyCharges();
      setCharges(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Could not load billing charges for home banner:', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setCustomerLoading(true);
      setCustomerError('');
      try {
        const custData = await customerService.getMe();
        setCustomer(custData);
        if (custData?.id) {
          dispatch(fetchMealPlansPaginated({ patient_id: custData.id, page: 1, size: 5 }));
          loadDailyMeals(custData.id);
        }
      } catch (err) {
        console.error('Error loading customer profile:', err);
        setCustomerError(t('home.errorLoadingProfile'));
      } finally {
        setCustomerLoading(false);
      }
    };
    load();
    loadSummary();
    loadCharges();
  }, [dispatch, loadDailyMeals, loadSummary, loadCharges, t]);

  const latestPlan = mealPlans && mealPlans.length > 0 ? mealPlans[0] : null;
  const consumed = summary?.caloriesConsumed || 0;
  const budget = latestPlan?.totalMacros?.kcal || 0;
  const progress = budget > 0 ? Math.min(1, consumed / budget) : 0;

  const nextUnpaid = (charges || [])
    .filter((c) => c.status === 'open' || c.status === 'overdue')
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))[0];

  const nextDueDays = nextUnpaid ? getDaysUntilDue(nextUnpaid.dueDate) : null;
  const isOverdue = nextUnpaid ? (nextUnpaid.status === 'overdue' || (nextDueDays !== null && nextDueDays < 0)) : false;
  const isDueSoon = nextUnpaid && !isOverdue && (nextDueDays !== null && nextDueDays <= 7);
  const showBillingBanner = isOverdue || isDueSoon;

  const photoSource = customer?.photoBase64 || customer?.photoUrl || customer?.photo || null;
  const locationParts = [customer?.city, customer?.province].filter(Boolean);
  const location = locationParts.join(', ');

  if (customerLoading) {
    return (
      <div className="customer-loading-state" style={{ marginTop: '4rem' }}>
        <Sparkles size={36} />
        <p>{t('home.loadingHome')}</p>
      </div>
    );
  }

  return (
    <div className="customer-home-page">
      {/* Billing Attention Banner */}
      {showBillingBanner && (
        <Link to={PATHS.PAYMENTS} className={`customer-billing-alert-banner ${isOverdue ? 'overdue' : 'due-soon'}`}>
          <div className="banner-left">
            <CreditCard size={18} />
            <span>
              {isOverdue ? t('payments.bannerOverdue') : t('payments.bannerDueSoon')}
            </span>
          </div>
          <div className="banner-right">
            <span className="banner-btn-label">{isOverdue ? t('payments.payNow') : t('payments.viewDetails')}</span>
            <ChevronRight size={16} />
          </div>
        </Link>
      )}

      {customerError && (
        <div className="customer-error-banner">
          <AlertCircle size={18} />
          <span>{customerError}</span>
        </div>
      )}

      {customer && (
        <div className="customer-greeting-card">
          <div className="greeting-row">
            <div className="greeting-avatar">
              {photoSource ? (
                <img src={photoSource} alt={customer.name} />
              ) : (
                <span>{customer.name ? customer.name[0].toUpperCase() : 'P'}</span>
              )}
            </div>
            <div className="greeting-text">
              <h2>{getGreeting(t)}, {(customer.name || '').split(' ')[0]}!</h2>
              <p>{customer.email}</p>
            </div>
            <span className="customer-badge-pill">
              <CheckCircle2 size={12} /> {t('common.active')}
            </span>
          </div>

          <div className="greeting-divider" />

          <div className="greeting-badges">
            {customer.phone && <InfoBadge icon={Phone} label={customer.phone} />}
            {location && <InfoBadge icon={MapPin} label={location} />}
            {customer.gender && <InfoBadge icon={UserIcon} label={customer.gender} />}
            {customer.dateOfBirth && <InfoBadge icon={Cake} label={customer.dateOfBirth} />}
          </div>
        </div>
      )}

      {summaryError ? (
        <div className="customer-error-banner">
          <AlertCircle size={18} />
          <span>{summaryError}</span>
        </div>
      ) : (
        <div className="customer-progress-card">
          <div className="progress-header">
            <span>{t('home.todayProgress')}</span>
            <span className="progress-points">
              <Gem size={16} /> {summaryLoading ? '—' : summary?.totalPoints || 0} pts
            </span>
          </div>
          <p className="progress-value">
            {summaryLoading
              ? t('common.loading')
              : budget > 0
              ? `${Math.round(consumed)} / ${Math.round(budget)} kcal`
              : t('home.kcalConsumed', { consumed: Math.round(consumed) })}
          </p>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="progress-footnote">
            {summaryLoading ? '' : t('home.mealsLogged', { count: summary?.mealsLogged || 0 })}
          </p>
        </div>
      )}

      <div>
        <h3 className="customer-section-title">{t('home.mealPlan')}</h3>
        {mealPlanLoading ? (
          <div className="customer-loading-state">{t('common.loading')}</div>
        ) : mealPlanError ? (
          <div className="customer-error-banner">
            <AlertCircle size={18} />
            <span>{mealPlanError}</span>
          </div>
        ) : !latestPlan ? (
          <div className="customer-empty-state">
            <FileText size={32} />
            <p>{t('home.noMealPlanYet')}</p>
          </div>
        ) : (
          <Link to="/meal-plan" className="customer-meal-plan-preview-card">
            <div className="preview-header">
              <h4>{latestPlan.name}</h4>
              {latestPlan.isFavorite && <Star size={16} fill="var(--accent-primary)" color="var(--accent-primary)" />}
            </div>
            <p className="preview-meta">
              {mealPlanCategoryLabel(t, latestPlan.category)} · {enumLabel(t, 'mealPlanGenerationStatus', latestPlan.generationStatus || 'Draft')}
            </p>
            <p className="preview-count">
              {t('home.mealsCount', { count: (latestPlan.meals || []).length })}
            </p>
          </Link>
        )}
      </div>

      <div>
        <h3 className="customer-section-title">{t('home.dailyMeals')}</h3>
        {dailyMealsLoading ? (
          <div className="customer-loading-state">{t('common.loading')}</div>
        ) : dailyMealsError ? (
          <div className="customer-error-banner">
            <AlertCircle size={18} />
            <span>{dailyMealsError}</span>
          </div>
        ) : assignedMeals.length === 0 ? (
          <p>{t('home.noDailyMealsAssigned')}</p>
        ) : (
          <div className="customer-badge-row">
            {assignedMeals.map((meal) => (
              <span key={meal.id} className="customer-badge-pill">{meal.name}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
