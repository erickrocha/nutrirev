import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertCircle, CalendarDays, FileText, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { businessPlanService } from '../../services';
import { PATHS } from '../../router/routeConfig';

const formatCurrency = (cents, language) => new Intl.NumberFormat(
  language?.startsWith('en') ? 'en-US' : 'pt-BR',
  { style: 'currency', currency: 'BRL' },
).format((Number(cents) || 0) / 100);

const formatDate = (value, language) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat(language?.startsWith('en') ? 'en-US' : 'pt-BR')
    .format(new Date(`${value}T12:00:00`));
};

export const BusinessPlanManagement = () => {
  const { t, i18n } = useTranslation();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const planData = await businessPlanService.getPlans();
      setPlans(Array.isArray(planData) ? planData : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t('businessPlans.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (plan) => {
    if (!window.confirm(t('businessPlans.deleteConfirm', { name: plan.name }))) return;
    try {
      await businessPlanService.deletePlan(plan.id);
      await load();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t('businessPlans.deleteError'));
    }
  };

  return (
    <div className="business-plan-management-page">
      <header className="management-header">
        <div><h2 className="section-title">{t('businessPlans.title')}</h2><p className="section-subtitle">{t('businessPlans.subtitle')}</p></div>
        <div className="header-action-buttons">
          <button type="button" className="btn-action-outline" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? 'spin-icon' : ''} /> {t('common.refresh')}</button>
          <Link className="btn-action-primary" to={PATHS.BUSINESS_PLAN_NEW}><Plus size={17} /> {t('businessPlans.newPlan')}</Link>
        </div>
      </header>

      {error && <div className="dashboard-error-state" role="alert"><span><AlertCircle size={18} /> {error}</span><button type="button" className="btn-action-outline" onClick={load}>{t('common.retry')}</button></div>}

      <section className="table-card">
        {loading ? (
          <div className="table-loading-state"><RefreshCw size={24} className="spin-icon" /><p>{t('common.loading')}</p></div>
        ) : plans.length === 0 ? (
          <div className="table-empty-state"><FileText size={34} /><p>{t('businessPlans.empty')}</p><Link className="btn-action-primary" to={PATHS.BUSINESS_PLAN_NEW}><Plus size={16} /> {t('businessPlans.newPlan')}</Link></div>
        ) : (
          <div className="responsive-table-wrap">
            <table className="management-table">
              <thead><tr>
                <th>{t('businessPlans.plan')}</th><th>{t('businessPlans.price')}</th>
                <th>{t('businessPlans.users')}</th><th>{t('businessPlans.aiQuota')}</th><th>{t('businessPlans.period')}</th><th>{t('businessPlans.paymentDate')}</th>
                <th>{t('common.actions', 'Actions')}</th>
              </tr></thead>
              <tbody>{plans.map((plan) => (
                <tr key={plan.id}>
                  <td><strong>{plan.name}</strong><small className="table-secondary-text">UUID: {plan.uuid}</small></td>
                  <td>
                    {formatCurrency(plan.priceInCents, i18n.language)}
                    {Array.isArray(plan.tiers) && plan.tiers.length > 0 && (
                      <small className="table-secondary-text">
                        {`+ ${t('businessPlans.tiered')} (${t('businessPlans.tiersCount', { count: plan.tiers.length })})`}
                      </small>
                    )}
                  </td>
                  <td>{plan.availableUsers}</td>
                  <td><strong>{plan.dailyAiQuota ?? 4}</strong> <small className="table-secondary-text">{t('businessPlans.dailyAiQuota')}</small></td>
                  <td>{t('businessPlans.days', { count: plan.periodDays })}</td>
                  <td><span className="date-cell"><CalendarDays size={14} /> {formatDate(plan.paymentDate, i18n.language)}</span></td>
                  <td><div className="table-row-actions">
                    <Link className="icon-action-button" to={PATHS.BUSINESS_PLAN_EDIT.replace(':id', plan.id)} title={t('common.edit')}><Pencil size={16} /></Link>
                    <button type="button" className="icon-action-button danger" onClick={() => handleDelete(plan)} title={t('common.delete')}><Trash2 size={16} /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
