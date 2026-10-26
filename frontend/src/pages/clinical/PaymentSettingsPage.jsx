import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Building, CreditCard, QrCode, RefreshCw, Repeat, AlertCircle, CheckCircle2 } from 'lucide-react';
import { paymentSettingsService } from '../../services/api';
import { fetchTenants, setActiveTenant } from '../../store/tenantSlice';
import { ROLES } from '../../utils/enums';

/**
 * The clinic's acquirer and the methods it offers.
 *
 * The platform operator provisions the connections — credentials live in the
 * deployment's secret store and never travel through a request — and this screen
 * chooses among them. One acquirer is live at a time.
 *
 * The operator has no clinic of its own, so it picks the one it is supporting
 * and works on that clinic's settings exactly as its staff would.
 */
export const PaymentSettingsPage = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { activeTenant, tenantsList, loading: tenantsLoading } = useSelector((state) => state.tenant);
  const isSysAdmin = user?.role === ROLES.SYS_ADMIN;
  const tenantId = isSysAdmin ? activeTenant?.id : undefined;

  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [methods, setMethods] = useState({ credit: true, pix: false, recurring: false });

  const applyConnection = (row) => {
    setSelectedId(row.id);
    setMethods({
      credit: row.creditEnabled,
      pix: row.pixEnabled,
      recurring: row.recurringEnabled,
    });
  };

  const load = useCallback(async () => {
    // The operator has to name a clinic first; asking without one is a 400.
    if (isSysAdmin && !tenantId) {
      setConnections([]);
      setSelectedId(null);
      setLoading(tenantsLoading);
      return;
    }
    try {
      setLoading(true);
      setOutcome(null);
      const rows = await paymentSettingsService.getConnections(tenantId);
      const list = Array.isArray(rows) ? rows : [];
      setConnections(list);
      const active = list.find((row) => row.active) || list[0];
      if (active) applyConnection(active);
      else setSelectedId(null);
    } catch {
      setOutcome({ type: 'error', message: t('paymentSettings.loadError') });
    } finally {
      setLoading(false);
    }
  }, [isSysAdmin, t, tenantId, tenantsLoading]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isSysAdmin && tenantsList.length === 0) dispatch(fetchTenants());
  }, [dispatch, isSysAdmin, tenantsList.length]);

  useEffect(() => {
    if (!isSysAdmin || activeTenant || tenantsList.length === 0) return;
    dispatch(setActiveTenant(tenantsList[0]));
  }, [activeTenant, dispatch, isSysAdmin, tenantsList]);

  const selected = connections.find((row) => row.id === selectedId) || null;

  // Mirrors the server's rules so a toggle the acquirer cannot honour is never
  // offered, rather than being offered and then refused.
  const canPix = Boolean(selected?.supportsPix);
  const canRecurring = Boolean(selected?.supportsRecurring);
  const effective = {
    credit: methods.credit,
    pix: methods.pix && canPix,
    recurring: methods.recurring && canRecurring && methods.credit,
  };
  const nothingEnabled = !effective.credit && !effective.pix;

  const handleSave = async () => {
    if (!selected || nothingEnabled) return;
    setSaving(true);
    setOutcome(null);
    try {
      await paymentSettingsService.select({
        tenantId,
        merchantId: selected.id,
        creditEnabled: effective.credit,
        pixEnabled: effective.pix,
        recurringEnabled: effective.recurring,
      });
      setOutcome({ type: 'success', message: t('paymentSettings.saved') });
      await load();
    } catch (err) {
      setOutcome({
        type: 'error',
        message: err.response?.data?.message || t('paymentSettings.saveError'),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="user-management-container">
        <RefreshCw size={20} className="spin-icon" />
      </div>
    );
  }

  return (
    <div className="user-management-container">
      <div className="management-header">
        <div>
          <h2 className="section-title">{t('paymentSettings.title')}</h2>
          <p className="section-subtitle">{t('paymentSettings.subtitle')}</p>
        </div>
        {isSysAdmin && (
          <label className="tenant-scope-picker">
            <Building size={17} />
            <select
              className="table-filter-select"
              aria-label={t('paymentSettings.supportingClinic')}
              value={activeTenant?.id || ''}
              onChange={(event) => {
                const tenant = tenantsList.find((item) => item.id === Number(event.target.value));
                if (tenant) dispatch(setActiveTenant(tenant));
              }}
            >
              {tenantsList.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {outcome && (
        <div className={`payment-outcome-alert ${outcome.type}`}>
          {outcome.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{outcome.message}</span>
        </div>
      )}

      {isSysAdmin && !tenantId ? (
        <div className="payment-outcome-alert uncertain">
          <AlertCircle size={20} />
          <span>{t('paymentSettings.chooseClinic')}</span>
        </div>
      ) : connections.length === 0 ? (
        <div className="payment-outcome-alert uncertain">
          <AlertCircle size={20} />
          <span>{t('paymentSettings.noConnections')}</span>
        </div>
      ) : (
        <>
          <h3 className="settings-group-title">{t('paymentSettings.acquirer')}</h3>
          <div className="acquirer-choice-grid">
            {connections.map((row) => (
              <button
                key={row.id}
                type="button"
                className={`acquirer-card ${selectedId === row.id ? 'is-selected' : ''}`}
                onClick={() => applyConnection(row)}
                disabled={saving}
              >
                <span className="acquirer-name">{row.provider}</span>
                <span className="acquirer-meta">{row.merchantReference}</span>
                <span className="acquirer-meta">{row.environment}</span>
                {row.active && (
                  <span className="acquirer-live">{t('paymentSettings.live')}</span>
                )}
              </button>
            ))}
          </div>

          <h3 className="settings-group-title">{t('paymentSettings.methods')}</h3>
          <div className="method-toggle-list">
            <MethodToggle
              icon={<CreditCard size={18} />}
              label={t('paymentSettings.credit')}
              hint={t('paymentSettings.creditHint')}
              checked={effective.credit}
              disabled={saving}
              onChange={(value) => setMethods((m) => ({ ...m, credit: value }))}
            />
            <MethodToggle
              icon={<QrCode size={18} />}
              label={t('paymentSettings.pix')}
              hint={canPix ? t('paymentSettings.pixHint') : t('paymentSettings.pixUnsupported')}
              checked={effective.pix}
              disabled={saving || !canPix}
              onChange={(value) => setMethods((m) => ({ ...m, pix: value }))}
            />
            <MethodToggle
              icon={<Repeat size={18} />}
              label={t('paymentSettings.recurring')}
              hint={
                !canRecurring
                  ? t('paymentSettings.recurringUnsupported')
                  : t('paymentSettings.recurringHint')
              }
              checked={effective.recurring}
              disabled={saving || !canRecurring || !methods.credit}
              onChange={(value) => setMethods((m) => ({ ...m, recurring: value }))}
            />
          </div>

          {nothingEnabled && (
            <span className="field-error-msg">{t('paymentSettings.needOneMethod')}</span>
          )}

          <div className="modal-actions-luxury">
            <button
              type="button"
              className="btn-luxury-primary"
              onClick={handleSave}
              disabled={saving || nothingEnabled || !selected}
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const MethodToggle = ({ icon, label, hint, checked, disabled, onChange }) => (
  <label className={`method-toggle-row ${disabled ? 'is-disabled' : ''}`}>
    <span className="method-toggle-icon">{icon}</span>
    <span className="method-toggle-text">
      <strong>{label}</strong>
      <small>{hint}</small>
    </span>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
  </label>
);
