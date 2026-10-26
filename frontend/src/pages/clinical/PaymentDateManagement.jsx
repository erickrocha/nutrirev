import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, RefreshCw, Search, Calendar, User, FileText, CheckCircle2, History, ChevronDown, ChevronRight, Receipt, AlertTriangle } from 'lucide-react';
import { paymentDateService, clinicalPlanService, paymentChargeService } from '../../services/api';
import { fetchAllCustomers } from '../../store/customerSlice';
import { PaymentDateFormModal } from '../../components/clinical/PaymentDateFormModal';

export const PaymentDateManagement = () => {
  const dispatch = useDispatch();
  const { allCustomers } = useSelector((state) => state.customer);
  const { t } = useTranslation();


  const [paymentDates, setPaymentDates] = useState([]);
  const [clinicalPlans, setClinicalPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [chargesByCustomer, setChargesByCustomer] = useState({});
  const [reversals, setReversals] = useState([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      dispatch(fetchAllCustomers());
      const [pdData, planData, reversalData] = await Promise.all([
        paymentDateService.getAll(),
        clinicalPlanService.getAll(),
        // Reversals must never take the page down with them: they are a warning
        // banner, not the reason anyone opened this screen.
        paymentChargeService.getReversals().catch(() => []),
      ]);
      setPaymentDates(Array.isArray(pdData) ? pdData : []);
      setClinicalPlans(Array.isArray(planData) ? planData : []);
      setReversals(Array.isArray(reversalData) ? reversalData : []);
    } catch (err) {
      console.error('Error loading payment dates data:', err);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Charges are fetched per customer only when a row is opened; the list can be
  // long and most rows are never expanded.
  const toggleCharges = async (item) => {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
    if (!item.customerId || chargesByCustomer[item.customerId]) return;
    try {
      const data = await paymentChargeService.getByCustomer(item.customerId);
      setChargesByCustomer((prev) => ({ ...prev, [item.customerId]: Array.isArray(data) ? data : [] }));
    } catch (err) {
      console.error('Error loading charges:', err);
      setChargesByCustomer((prev) => ({ ...prev, [item.customerId]: [] }));
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSaveModal = async (formData, editingId) => {
    const payload = {
      ...formData,
    };
    if (editingId) {
      await paymentDateService.update(editingId, payload);
    } else {
      await paymentDateService.create(payload);
    }
    loadData();
  };

  // Helper maps for names
  const customerMap = React.useMemo(() => {
    const map = {};
    (allCustomers || []).forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [allCustomers]);

  const planMap = React.useMemo(() => {
    const map = {};
    (clinicalPlans || []).forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, [clinicalPlans]);

  const displayedItems = paymentDates.filter((item) => {
      const cName = (customerMap[item.customerId] || '').toLowerCase();
      const pName = (planMap[item.clinicalPlanId] || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      return cName.includes(term) || pName.includes(term) || (item.firstDueDate || '').includes(term);
  });

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const chargeLabel = (status) => {
    const key = {
      open: 'chargeOpen',
      overdue: 'chargeOverdue',
      paid: 'chargePaid',
      cancelled: 'chargeCancelled',
    }[status];
    return key ? t(`paymentDates.${key}`) : status;
  };

  const chargeColor = (status) =>
    ({ paid: '#10b981', overdue: '#ef4444', cancelled: 'var(--text-body)' }[status] || '#f59e0b');

  const formatCents = (cents) =>
    (Number(cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });

  if (isModalOpen) {
    return (
      <PaymentDateFormModal
        isOpen
        presentation="page"
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        itemToEdit={editingItem}
        customersList={allCustomers}
        clinicalPlansList={clinicalPlans}
      />
    );
  }

  return (
    <div className="user-management-container">
      {/* Top Header */}
      <div className="management-header">
        <div>
          <h2 className="section-title">{t('paymentDates.title')}</h2>
          <p className="section-subtitle">
            {t('paymentDates.subtitle')}
          </p>
        </div>

        <div className="header-action-buttons">
          <button
            type="button"
            className="btn-action-outline"
            onClick={loadData}
            title={t('common.refreshList')}
          >
            <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
            <span>{t('common.refresh')}</span>
          </button>

          <button
            type="button"
            className="btn-action-primary"
            onClick={handleOpenAddModal}
          >
            <Plus size={18} />
            <span>{t('paymentDates.newPaymentDate')}</span>
          </button>
        </div>
      </div>

      {reversals.length > 0 && (
        <div className="reversal-alert-box">
          <div className="reversal-alert-header">
            <AlertTriangle size={18} />
            <strong>{t('paymentDates.reversalsTitle', { count: reversals.length })}</strong>
          </div>
          <p className="reversal-alert-hint">{t('paymentDates.reversalsHint')}</p>
          <ul className="reversal-list">
            {reversals.slice(0, 5).map((row) => (
              <li key={row.attemptId} className="reversal-row">
                <span className="reversal-customer">{row.customerName}</span>
                <span className="reversal-amount">
                  {`R$ ${(row.amountCents / 100).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
                </span>
                <span className="reversal-meta">
                  {t('paymentDates.reversalOn', {
                    date: new Date(row.reversedAt).toLocaleDateString('pt-BR'),
                  })}
                </span>
              </li>
            ))}
          </ul>
          {reversals.length > 5 && (
            <p className="reversal-alert-hint">
              {t('paymentDates.reversalsMore', { count: reversals.length - 5 })}
            </p>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="filter-bar" style={{ marginBottom: '20px', width: '100%', boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
        <div className="search-input-wrapper" style={{ flex: 1, position: 'relative', width: '100%', boxSizing: 'border-box' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
          <input
            type="text"
            placeholder={t('paymentDates.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px 10px 38px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #E2E8F0)',
              backgroundColor: 'var(--bg-secondary, #FFF)',
              fontSize: '0.9rem',
            }}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="table-card">
        {loading && paymentDates.length === 0 ? (
          <div className="table-loading-state">
            <RefreshCw size={24} className="spin-icon" />
            <p>{t('paymentDates.loadingRecords')}</p>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="table-empty-state">
            <Calendar size={36} />
            <p>{t('paymentDates.emptyStateTitle')}</p>
            <button type="button" className="btn-action-primary" onClick={handleOpenAddModal}>
              <Plus size={16} />
              <span>{t('paymentDates.emptyStateBtn')}</span>
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th>{t('common.id')}</th>
                  <th>{t('paymentDates.client')}</th>
                  <th>{t('paymentDates.clinicalPlan')}</th>
                  <th>{t('paymentDates.firstDueDate')}</th>
                  <th>{t('paymentDates.nextDueDate')}</th>
                  <th>{t('paymentDates.subscriptionStatus')}</th>
                  <th>{t('common.status')}</th>
                  <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.map((item) => (
                  <React.Fragment key={item.id}>
                  <tr>
                    <td style={{ fontWeight: '600', color: 'var(--text-muted, #64748B)', width: '70px' }}>
                      #{item.id}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ fontWeight: '500' }}>
                          {customerMap[item.customerId] || `${t('paymentDates.client')} #${item.customerId}`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} style={{ color: '#3b82f6' }} />
                        <span>{planMap[item.clinicalPlanId] || `${t('paymentDates.clinicalPlan')} #${item.clinicalPlanId}`}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                        <Calendar size={14} style={{ color: '#10b981' }} />
                        <span>{formatDateDisplay(item.firstDueDate)}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: '600', color: 'var(--text-muted, #64748B)' }}>
                        {formatDateDisplay(item.nextDueDate)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', fontWeight: '600' }}>
                        {item.status === 'active' && t('paymentDates.statusActive')}
                        {item.status === 'cancelled' && t('paymentDates.statusCancelled')}
                        {item.status === 'completed' && t('paymentDates.statusCompleted')}
                      </span>
                    </td>
                    <td>
                      {item.isActive ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          <CheckCircle2 size={12} />
                          {t('common.active')}
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            backgroundColor: 'rgba(148, 163, 184, 0.15)',
                            color: 'var(--text-body)',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                          }}
                        >
                          <History size={12} />
                          {t('paymentDates.history')}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-table-edit"
                        onClick={() => toggleCharges(item)}
                        title={t('paymentDates.charges')}
                        style={{ marginRight: '6px' }}
                      >
                        {expandedId === item.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <span>{t('paymentDates.charges')}</span>
                      </button>
                      <button
                        type="button"
                        className="btn-table-edit"
                        onClick={() => handleOpenEditModal(item)}
                        title={t('paymentDates.editRecord')}
                      >
                        <Edit2 size={16} />
                        <span>{t('common.edit')}</span>
                      </button>
                    </td>
                  </tr>
                  {expandedId === item.id && (
                    <tr>
                      <td colSpan={8} style={{ background: 'rgba(148, 163, 184, 0.06)', padding: '0.75rem 1.25rem' }}>
                        {(chargesByCustomer[item.customerId] || []).length === 0 ? (
                          <span style={{ color: 'var(--text-muted, #64748B)', fontSize: '0.85rem' }}>
                            {t('paymentDates.noCharges')}
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {chargesByCustomer[item.customerId].map((charge) => (
                              <div
                                key={charge.id}
                                style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}
                              >
                                <Receipt size={14} style={{ color: 'var(--accent-primary)' }} />
                                <span style={{ minWidth: '90px' }}>{formatDateDisplay(charge.dueDate)}</span>
                                <span style={{ minWidth: '90px', fontWeight: '600' }}>
                                  R$ {formatCents(charge.amountCents)}
                                </span>
                                <span style={{ color: chargeColor(charge.status), fontWeight: '600' }}>
                                  {chargeLabel(charge.status)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
