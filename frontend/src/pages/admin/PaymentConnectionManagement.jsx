import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Ban, CreditCard, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { paymentConnectionAdminService } from '../../services';
import { fetchTenants } from '../../store/tenantSlice';
import { ROLES } from '../../utils/enums';

const PROVIDERS = ['rede', 'asaas'];
const ENVIRONMENTS = ['sandbox', 'production'];

const EMPTY_FORM = {
  tenantId: '',
  provider: PROVIDERS[0],
  environment: ENVIRONMENTS[0],
  merchantReference: '',
  credentialsSecretRef: '',
};

/**
 * Every acquirer connection, across every clinic.
 *
 * The operator provisions and corrects; the clinic still chooses which one goes
 * live, on its own screen. Two rules from the server are mirrored here so the
 * reason is visible before the request rather than after it: the acquirer of an
 * existing connection cannot change, and a live connection has to be retired
 * before it moves between environments.
 */
export const PaymentConnectionManagement = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { tenantsList } = useSelector((state) => state.tenant);

  const isSysAdmin = user?.role === ROLES.SYS_ADMIN;

  const [connections, setConnections] = useState([]);
  const [tenantFilter, setTenantFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(null); // null | 'new' | connection row
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await paymentConnectionAdminService.list(tenantFilter || undefined);
      setConnections(Array.isArray(rows) ? rows : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t('paymentConnections.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t, tenantFilter]);

  useEffect(() => {
    if (isSysAdmin) load();
  }, [isSysAdmin, load]);

  useEffect(() => {
    if (isSysAdmin) dispatch(fetchTenants());
  }, [dispatch, isSysAdmin]);

  const tenantName = useMemo(() => {
    const byId = new Map((tenantsList || []).map((tenant) => [String(tenant.id), tenant.name]));
    return (id) => byId.get(String(id)) || `#${id}`;
  }, [tenantsList]);

  if (!isSysAdmin) {
    return (
      <div className="access-denied-box">
        <AlertCircle size={48} />
        <h3>{t('tenants.restrictedAccess')}</h3>
        <p>{t('tenants.sysAdminOnly')}</p>
      </div>
    );
  }

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, tenantId: tenantFilter || '' });
    setFormError('');
    setEditing('new');
  };

  const openEdit = (row) => {
    setForm({
      tenantId: String(row.tenantId),
      provider: row.provider,
      environment: row.environment,
      merchantReference: row.merchantReference || '',
      credentialsSecretRef: row.credentialsSecretRef || '',
    });
    setFormError('');
    setEditing(row);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editing === 'new') {
        await paymentConnectionAdminService.provision({
          tenantId: parseInt(form.tenantId, 10),
          provider: form.provider,
          environment: form.environment,
          merchantReference: form.merchantReference.trim(),
          credentialsSecretRef: form.credentialsSecretRef.trim(),
        });
      } else {
        await paymentConnectionAdminService.update(editing.id, {
          merchantReference: form.merchantReference.trim(),
          credentialsSecretRef: form.credentialsSecretRef.trim(),
          environment: form.environment,
        });
      }
      setEditing(null);
      await load();
    } catch (requestError) {
      setFormError(requestError?.response?.data?.message || t('paymentConnections.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async (row) => {
    if (!window.confirm(t('paymentConnections.disableConfirm', { reference: row.merchantReference }))) return;
    setError('');
    try {
      await paymentConnectionAdminService.disable(row.id);
      await load();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t('paymentConnections.disableError'));
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(t('paymentConnections.deleteConfirm', { reference: row.merchantReference }))) return;
    setError('');
    try {
      await paymentConnectionAdminService.remove(row.id);
      await load();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t('paymentConnections.deleteError'));
    }
  };

  const isNew = editing === 'new';
  // The server refuses this move; saying so here explains why the field is stuck.
  const environmentLocked = !isNew && editing?.active;

  return (
    <div className="business-plan-management-page">
      <header className="management-header">
        <div>
          <h2 className="section-title">{t('paymentConnections.title')}</h2>
          <p className="section-subtitle">{t('paymentConnections.subtitle')}</p>
        </div>
        <div className="header-action-buttons">
          <select
            className="table-filter-select"
            value={tenantFilter}
            onChange={(event) => setTenantFilter(event.target.value)}
            aria-label={t('paymentConnections.filterByTenant')}
          >
            <option value="">{t('paymentConnections.allTenants')}</option>
            {(tenantsList || []).map((tenant) => (
              <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
            ))}
          </select>
          <button type="button" className="btn-action-outline" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin-icon' : ''} /> {t('common.refresh')}
          </button>
          <button type="button" className="btn-action-primary" onClick={openCreate}>
            <Plus size={17} /> {t('paymentConnections.newConnection')}
          </button>
        </div>
      </header>

      {error && (
        <div className="dashboard-error-state" role="alert">
          <span><AlertCircle size={18} /> {error}</span>
          <button type="button" className="btn-action-outline" onClick={load}>{t('common.retry')}</button>
        </div>
      )}

      <section className="table-card">
        {loading ? (
          <div className="table-loading-state"><RefreshCw size={24} className="spin-icon" /><p>{t('common.loading')}</p></div>
        ) : connections.length === 0 ? (
          <div className="table-empty-state">
            <CreditCard size={34} />
            <p>{t('paymentConnections.empty')}</p>
            <button type="button" className="btn-action-primary" onClick={openCreate}>
              <Plus size={16} /> {t('paymentConnections.newConnection')}
            </button>
          </div>
        ) : (
          <div className="responsive-table-wrap">
            <table className="management-table">
              <thead>
                <tr>
                  <th>{t('paymentConnections.tenant')}</th>
                  <th>{t('paymentConnections.provider')}</th>
                  <th>{t('paymentConnections.environment')}</th>
                  <th>{t('paymentConnections.merchantReference')}</th>
                  <th>{t('paymentConnections.credentialsSecretRef')}</th>
                  <th>{t('paymentConnections.methods')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {connections.map((row) => (
                  <tr key={row.id}>
                    <td>{tenantName(row.tenantId)}</td>
                    <td><strong>{row.provider}</strong></td>
                    <td>{row.environment}</td>
                    <td>{row.merchantReference}</td>
                    <td><small className="table-secondary-text">{row.credentialsSecretRef || '—'}</small></td>
                    <td>{describeMethods(t, row)}</td>
                    <td>
                      <span className={`plan-status-badge ${row.active ? 'active' : 'inactive'}`}>
                        {row.active ? t('paymentConnections.live') : t('common.inactive')}
                      </span>
                    </td>
                    <td>
                      <div className="table-row-actions">
                        <button type="button" className="icon-action-button" onClick={() => openEdit(row)} title={t('common.edit')}>
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-action-button"
                          onClick={() => handleDisable(row)}
                          disabled={!row.active}
                          title={t('paymentConnections.disable')}
                        >
                          <Ban size={16} />
                        </button>
                        <button type="button" className="icon-action-button danger" onClick={() => handleDelete(row)} title={t('common.delete')}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <div className="modal-overlay" onClick={() => !saving && setEditing(null)}>
          <div className="modal-box" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{isNew ? t('paymentConnections.newConnection') : t('paymentConnections.editConnection')}</h3>
              <button type="button" className="btn-close" onClick={() => setEditing(null)} disabled={saving}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="connection-tenant">{t('paymentConnections.tenant')} *</label>
                <select
                  id="connection-tenant"
                  value={form.tenantId}
                  onChange={(event) => setForm((prev) => ({ ...prev, tenantId: event.target.value }))}
                  disabled={!isNew || saving}
                  required
                >
                  <option value="" disabled>{t('paymentConnections.chooseTenant')}</option>
                  {(tenantsList || []).map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="connection-provider">{t('paymentConnections.provider')} *</label>
                <select
                  id="connection-provider"
                  value={form.provider}
                  onChange={(event) => setForm((prev) => ({ ...prev, provider: event.target.value }))}
                  disabled={!isNew || saving}
                  required
                >
                  {PROVIDERS.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
                </select>
                {!isNew && <small className="form-field-hint">{t('paymentConnections.providerLocked')}</small>}
              </div>

              <div className="form-group">
                <label htmlFor="connection-environment">{t('paymentConnections.environment')} *</label>
                <select
                  id="connection-environment"
                  value={form.environment}
                  onChange={(event) => setForm((prev) => ({ ...prev, environment: event.target.value }))}
                  disabled={environmentLocked || saving}
                  required
                >
                  {ENVIRONMENTS.map((environment) => <option key={environment} value={environment}>{environment}</option>)}
                </select>
                {environmentLocked && <small className="form-field-hint">{t('paymentConnections.environmentLocked')}</small>}
              </div>

              <div className="form-group">
                <label htmlFor="connection-reference">{t('paymentConnections.merchantReference')} *</label>
                <input
                  id="connection-reference"
                  type="text"
                  value={form.merchantReference}
                  onChange={(event) => setForm((prev) => ({ ...prev, merchantReference: event.target.value }))}
                  disabled={saving}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="connection-secret">{t('paymentConnections.credentialsSecretRef')} *</label>
                <input
                  id="connection-secret"
                  type="text"
                  value={form.credentialsSecretRef}
                  onChange={(event) => setForm((prev) => ({ ...prev, credentialsSecretRef: event.target.value }))}
                  pattern="[A-Za-z0-9/_-]+"
                  title={t('paymentConnections.secretRefHint')}
                  disabled={saving}
                  required
                />
                <small className="form-field-hint">{t('paymentConnections.secretRefHint')}</small>
              </div>

              {formError && <span className="field-error-msg">{formError}</span>}

              <div className="modal-actions-luxury">
                <button type="button" className="btn-luxury-secondary" onClick={() => setEditing(null)} disabled={saving}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-luxury-primary" disabled={saving}>
                  {saving ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const describeMethods = (t, row) => {
  const enabled = [
    row.creditEnabled && t('paymentSettings.credit'),
    row.pixEnabled && t('paymentSettings.pix'),
    row.recurringEnabled && t('paymentSettings.recurring'),
  ].filter(Boolean);
  return enabled.length > 0 ? enabled.join(' · ') : '—';
};
