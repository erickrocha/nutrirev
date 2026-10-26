import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Layers, Plus, Save, Trash2 } from 'lucide-react';
import { businessPlanService } from '../../services';
import { centsToDisplay, displayToCents } from '../../utils/currency';
import { PATHS } from '../../router/routeConfig';

const emptyForm = {
  name: '',
  price: '',
  availableUsers: '1',
  periodDays: '30',
  dailyAiQuota: '4',
  paymentDate: '',
  tiers: [],
};

export const BusinessPlanFormPage = () => {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!editing) return;
      setLoading(true);
      setError('');
      try {
        const plan = await businessPlanService.getPlan(id);
        if (!mounted) return;
        if (plan) {
          setForm({
            name: plan.name || '',
            price: centsToDisplay(plan.priceInCents),
            availableUsers: String(plan.availableUsers),
            periodDays: String(plan.periodDays),
            dailyAiQuota: String(plan.dailyAiQuota ?? 4),
            paymentDate: plan.paymentDate || '',
            tiers: Array.isArray(plan.tiers)
              ? plan.tiers.map((tier) => ({
                id: tier.id ?? null,
                upToUsers: tier.upToUsers && tier.upToUsers > 0 ? String(tier.upToUsers) : '',
                pricePerUser: centsToDisplay(tier.pricePerUserInCents),
              }))
              : [],
          });
        }
      } catch (requestError) {
        if (!mounted) return;
        setError(requestError?.response?.data?.message || t('businessPlans.formLoadError'));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [editing, id, t]);

  const updateField = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const addTier = () => {
    setForm((current) => ({
      ...current,
      tiers: [
        ...current.tiers,
        { id: null, upToUsers: '', pricePerUser: '' },
      ],
    }));
  };

  const updateTier = (index, field, value) => {
    setForm((current) => {
      const updatedTiers = [...current.tiers];
      updatedTiers[index] = { ...updatedTiers[index], [field]: value };
      return { ...current, tiers: updatedTiers };
    });
    setError('');
  };

  const removeTier = (index) => {
    setForm((current) => ({
      ...current,
      tiers: current.tiers.filter((_, i) => i !== index),
    }));
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    const priceInCents = displayToCents(form.price);
    const availableUsers = Number(form.availableUsers);
    const periodDays = Number(form.periodDays);
    const dailyAiQuota = Number(form.dailyAiQuota);

    if (!form.name.trim() || priceInCents === null || priceInCents < 0
      || availableUsers <= 0 || periodDays <= 0
      || Number.isNaN(dailyAiQuota) || dailyAiQuota < 0 || !form.paymentDate) {
      setError(t('businessPlans.validationError'));
      return;
    }

    const mappedTiers = [];
    for (const tier of form.tiers) {
      const tierPriceInCents = displayToCents(tier.pricePerUser);
      if (tierPriceInCents === null || tierPriceInCents < 0) {
        setError(t('businessPlans.validationError'));
        return;
      }
      const rawUpToUsers = String(tier.upToUsers || '').trim();
      const upToUsersVal = rawUpToUsers === '' ? 0 : Number(rawUpToUsers);
      if (Number.isNaN(upToUsersVal) || upToUsersVal < 0) {
        setError(t('businessPlans.validationError'));
        return;
      }
      mappedTiers.push({
        id: tier.id || undefined,
        upToUsers: upToUsersVal,
        pricePerUserInCents: tierPriceInCents,
      });
    }

    const payload = {
      name: form.name.trim(),
      priceInCents,
      availableUsers,
      periodDays,
      dailyAiQuota,
      paymentDate: form.paymentDate,
      tiers: mappedTiers.length > 0 ? mappedTiers : null,
    };

    setSaving(true);
    setError('');
    try {
      if (editing) await businessPlanService.updatePlan(id, payload);
      else await businessPlanService.createPlan(payload);
      navigate(PATHS.BUSINESS_PLANS, { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t('businessPlans.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="table-loading-state"><p>{t('common.loading')}</p></div>;

  return (
    <div className="business-plan-form-page">
      <header className="management-header">
        <div><h2 className="section-title">{editing ? t('businessPlans.editTitle') : t('businessPlans.createTitle')}</h2><p className="section-subtitle">{t('businessPlans.formSubtitle')}</p></div>
        <button type="button" className="btn-action-outline" onClick={() => navigate(PATHS.BUSINESS_PLANS)}><ArrowLeft size={16} /> {t('common.back', 'Back')}</button>
      </header>

      {error && <div className="dashboard-error-state" role="alert"><span><AlertCircle size={18} /> {error}</span></div>}

      <form className="business-plan-form-card" onSubmit={submit}>
        <div className="business-plan-form-grid">
          <label className="form-field"><span>{t('businessPlans.name')} *</span><input value={form.name} onChange={updateField('name')} maxLength={200} required /></label>
          <label className="form-field"><span>{t('businessPlans.basePrice')} *</span><input type="number" min="0" step="0.01" value={form.price} onChange={updateField('price')} required /></label>
          <label className="form-field"><span>{t('businessPlans.availableUsers')} *</span><input type="number" min="1" step="1" value={form.availableUsers} onChange={updateField('availableUsers')} required /></label>
          <label className="form-field"><span>{t('businessPlans.dailyAiQuota')} *</span><input type="number" min="0" step="1" value={form.dailyAiQuota} onChange={updateField('dailyAiQuota')} required /><small>{t('businessPlans.dailyAiQuotaHelp')}</small></label>
          <label className="form-field"><span>{t('businessPlans.periodDays')} *</span><input type="number" min="1" step="1" value={form.periodDays} onChange={updateField('periodDays')} required /></label>
          <label className="form-field"><span>{t('businessPlans.paymentDate')} *</span><input type="date" value={form.paymentDate} onChange={updateField('paymentDate')} required /></label>
        </div>

        <section className="business-plan-tiers-section">
          <div className="tiers-header">
            <div>
              <h3><Layers size={17} /> {t('businessPlans.tiers')}</h3>
              <p>{t('businessPlans.tiersSubtitle')}</p>
            </div>
            <button type="button" className="btn-add-tier" onClick={addTier}>
              <Plus size={15} /> {t('businessPlans.addTier')}
            </button>
          </div>

          {form.tiers.length === 0 ? (
            <div className="tiers-empty-hint">
              {t('businessPlans.noTiers')}
            </div>
          ) : (
            form.tiers.map((tier, idx) => (
              <div key={idx} className="tier-row">
                <label className="form-field">
                  <span>{t('businessPlans.upToUsers')}</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder={t('businessPlans.unlimitedUsers')}
                    value={tier.upToUsers}
                    onChange={(e) => updateTier(idx, 'upToUsers', e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>{t('businessPlans.pricePerUserTier')} *</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tier.pricePerUser}
                    onChange={(e) => updateTier(idx, 'pricePerUser', e.target.value)}
                    required
                  />
                </label>
                <button
                  type="button"
                  className="btn-remove-tier"
                  onClick={() => removeTier(idx)}
                  title={t('businessPlans.removeTier')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </section>

        <div className="form-actions"><button type="button" className="btn-action-outline" onClick={() => navigate(PATHS.BUSINESS_PLANS)}>{t('common.cancel', 'Cancel')}</button><button type="submit" className="btn-action-primary" disabled={saving}><Save size={17} /> {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}</button></div>
      </form>
    </div>
  );
};
