import React, { useState, useEffect } from 'react';
import { X, Save, FileText, AlertCircle, ArrowLeft, ChevronRight } from 'lucide-react';
import { centsToDisplay, displayToCents } from '../../utils/currency';

export const ClinicalPlanFormModal = ({ isOpen, onClose, onSave, itemToEdit = null, presentation = 'modal' }) => {
  const [name, setName] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [renewPeriodDays, setRenewPeriodDays] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (itemToEdit) {
        setName(itemToEdit.name || '');
        setPriceDisplay(centsToDisplay(itemToEdit.priceInCents));
        setRenewPeriodDays(
          itemToEdit.renewPeriodDays !== null && itemToEdit.renewPeriodDays !== undefined
            ? String(itemToEdit.renewPeriodDays)
            : ''
        );
      } else {
        setName('');
        setPriceDisplay('');
        setRenewPeriodDays('');
      }
    }
  }, [isOpen, itemToEdit]);

  const handlePriceBlur = () => {
    if (!priceDisplay.trim()) return;
    const cents = displayToCents(priceDisplay);
    if (cents !== null) {
      setPriceDisplay(centsToDisplay(cents));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('O nome do plano clínico é obrigatório.');
      return;
    }

    const priceInCents = displayToCents(priceDisplay);
    const parsedRenewDays = renewPeriodDays.trim() !== '' ? parseInt(renewPeriodDays, 10) : null;

    const payload = {
      ...itemToEdit,
      name: name.trim(),
      priceInCents: priceInCents,
      renewPeriodDays: parsedRenewDays !== null && !isNaN(parsedRenewDays) ? parsedRenewDays : null,
    };

    try {
      setSaving(true);
      await onSave(payload, itemToEdit?.id);
      onClose(true);
    } catch (err) {
      console.error('Error saving clinical plan:', err);
      setError('Erro ao salvar plano clínico. Verifique os dados informados.');
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
            <span>Planos Clínicos</span>
          </button>
          <ChevronRight size={14} style={{ color: 'var(--text-body)' }} />
          <span style={{ color: 'var(--text-heading)', fontWeight: '500' }}>{itemToEdit ? 'Editar Plano Clínico' : 'Novo Plano Clínico'}</span>
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
            <FileText size={20} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: isPage ? 'var(--text-heading)' : 'var(--text-heading)', margin: 0 }}>
              {itemToEdit ? 'Editar Plano Clínico' : 'Novo Plano Clínico'}
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
              Nome do Plano *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Plano Trimestral Premium"
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', color: isPage ? 'var(--text-heading)' : '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: '500' }}>
                Preço (R$)
              </label>
              <input
                type="text"
                value={priceDisplay}
                onChange={(e) => setPriceDisplay(e.target.value)}
                onBlur={handlePriceBlur}
                placeholder="0.00"
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

            <div>
              <label style={{ display: 'block', color: isPage ? 'var(--text-heading)' : '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: '500' }}>
                Período de Rotação/Renovação (dias)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={renewPeriodDays}
                onChange={(e) => setRenewPeriodDays(e.target.value)}
                placeholder="Ex: 30"
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
