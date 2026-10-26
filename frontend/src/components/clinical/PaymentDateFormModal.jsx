import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, AlertCircle, ArrowLeft, ChevronRight } from 'lucide-react';

export const PaymentDateFormModal = ({
  isOpen,
  onClose,
  onSave,
  itemToEdit = null,
  customersList = [],
  clinicalPlansList = [],
  presentation = 'modal',
}) => {
  const [customerId, setCustomerId] = useState('');
  const [clinicalPlanId, setClinicalPlanId] = useState('');
  const [firstDueDate, setFirstDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (itemToEdit) {
        setCustomerId(itemToEdit.customerId ? String(itemToEdit.customerId) : '');
        setClinicalPlanId(itemToEdit.clinicalPlanId ? String(itemToEdit.clinicalPlanId) : '');
        setFirstDueDate(itemToEdit.firstDueDate || '');
      } else {
        setCustomerId(customersList.length > 0 ? String(customersList[0].id) : '');
        setClinicalPlanId(clinicalPlansList.length > 0 ? String(clinicalPlansList[0].id) : '');
        setFirstDueDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, itemToEdit, customersList, clinicalPlansList]);

  useEffect(() => {
    if (customerId && customersList.length > 0 && !itemToEdit) {
      const selectedCustomer = customersList.find((c) => String(c.id) === String(customerId));
      if (selectedCustomer && selectedCustomer.clinicalPlanId) {
        setClinicalPlanId(String(selectedCustomer.clinicalPlanId));
      }
    }
  }, [customerId, customersList, itemToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!firstDueDate) {
      setError('A data de vencimento é obrigatória.');
      return;
    }

    const payload = {
      ...itemToEdit,
      customerId: customerId ? parseInt(customerId, 10) : null,
      clinicalPlanId: clinicalPlanId ? parseInt(clinicalPlanId, 10) : null,
      firstDueDate,
    };

    try {
      setSaving(true);
      await onSave(payload, itemToEdit?.id);
      onClose(true);
    } catch (err) {
      console.error('Error saving payment date:', err);
      setError('Erro ao salvar data de pagamento. Verifique os dados fornecidos.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isPage = presentation === 'page';

  return (
    <div
      style={isPage ? {
        width: '100%',
        maxWidth: '1000px',
        margin: '0 auto',
        paddingBottom: '60px',
        boxSizing: 'border-box',
      } : {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      {isPage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-body)', marginBottom: '16px' }}>
          <button type="button" onClick={() => onClose(false)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: '600', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={16} />
            <span>Datas de Pagamento</span>
          </button>
          <ChevronRight size={14} style={{ color: 'var(--text-body)' }} />
          <span style={{ color: 'var(--text-heading)', fontWeight: '500' }}>{itemToEdit ? 'Editar Data de Pagamento' : 'Nova Data de Pagamento'}</span>
        </div>
      )}
      <div
        style={{
          background: isPage ? '#FFFFFF' : 'var(--bg-alt)',
          border: isPage ? '1px solid var(--border-color)' : '1px solid var(--border-color)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: isPage ? '100%' : '540px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isPage ? '0 2px 8px rgba(0,0,0,0.03)' : '0 20px 50px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: isPage ? '1px solid #F1F5F9' : '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isPage ? '#FFFFFF' : 'var(--bg-primary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Calendar size={20} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: isPage ? 'var(--text-heading)' : 'var(--text-heading)', margin: 0 }}>
              {itemToEdit ? 'Editar Data de Pagamento' : 'Nova Data de Pagamento'}
            </h2>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                padding: '0.8rem 1rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.88rem',
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label style={{ display: 'block', color: isPage ? 'var(--text-heading)' : '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: '500' }}>
              Cliente *
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              style={{
                width: '100%',
                background: isPage ? '#FFFFFF' : 'var(--bg-primary)',
                border: isPage ? '1px solid var(--border-color)' : '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.65rem 0.85rem',
                color: isPage ? 'var(--text-heading)' : 'var(--text-heading)',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            >
              <option value="">Selecione um cliente...</option>
              {customersList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.email ? `(${c.email})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', color: isPage ? 'var(--text-heading)' : '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: '500' }}>
              Plano Clínico
            </label>
            <div
              style={{
                width: '100%',
                background: isPage ? '#F1F5F9' : 'var(--bg-primary)',
                border: isPage ? '1px solid var(--border-color)' : '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.65rem 0.85rem',
                color: isPage ? '#475569' : '#94a3b8',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
                minHeight: '40px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {clinicalPlanId 
                ? clinicalPlansList.find(p => String(p.id) === String(clinicalPlanId))?.name || 'Plano desconhecido'
                : 'Selecione um cliente para ver o plano'}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: isPage ? 'var(--text-heading)' : '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: '500' }}>
              Primeira Data de Vencimento *
            </label>
            <input
              type="date"
              value={firstDueDate}
              onChange={(e) => setFirstDueDate(e.target.value)}
              required
              style={{
                width: '100%',
                background: isPage ? '#FFFFFF' : 'var(--bg-primary)',
                border: isPage ? '1px solid var(--border-color)' : '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.65rem 0.85rem',
                color: isPage ? 'var(--text-heading)' : 'var(--text-heading)',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Footer Actions */}
          <div
            style={{
              marginTop: '0.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => onClose(false)}
              style={{
                background: 'transparent',
                border: isPage ? '1px solid var(--border-color)' : '1px solid var(--border-color)',
                color: isPage ? '#475569' : '#cbd5e1',
                padding: '0.6rem 1.25rem',
                borderRadius: '50px',
                fontSize: '0.88rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: 'var(--accent-primary)',
                color: isPage ? '#FFFFFF' : 'var(--bg-primary)',
                border: 'none',
                padding: '0.6rem 1.5rem',
                borderRadius: '50px',
                fontSize: '0.88rem',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Save size={16} />
              <span>{saving ? 'Salvando...' : 'Salvar Registro'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
