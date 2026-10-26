import React, { useState, useEffect } from 'react';
import { X, Save, Star, AlertCircle, ArrowLeft, ChevronRight, Utensils } from 'lucide-react';
import { FilterableMultiSelect } from '../common/FilterableMultiSelect';

export const MealPointTierFormModal = ({
  isOpen,
  onClose,
  onSave,
  itemToEdit = null,
  dailyMealsList = [],
  presentation = 'modal',
}) => {
  const [dailyMealId, setDailyMealId] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [points, setPoints] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (itemToEdit) {
        setDailyMealId(itemToEdit.dailyMealId ? String(itemToEdit.dailyMealId) : '');
        setDeadlineTime(
          itemToEdit.deadlineTime
            ? itemToEdit.deadlineTime.length === 8
              ? itemToEdit.deadlineTime.substring(0, 5)
              : itemToEdit.deadlineTime
            : ''
        );
        setPoints(itemToEdit.points !== undefined ? String(itemToEdit.points) : '');
      } else {
        setDailyMealId(dailyMealsList.length > 0 ? String(dailyMealsList[0].id) : '');
        setDeadlineTime('12:00:00');
        setPoints('10');
      }
    }
  }, [isOpen, itemToEdit, dailyMealsList]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!dailyMealId) {
      setError('Por favor, selecione a Refeição Diária.');
      return;
    }
    if (!deadlineTime) {
      setError('O horário limite é obrigatório.');
      return;
    }
    if (!points || isNaN(parseInt(points, 10))) {
      setError('Os pontos são obrigatórios e devem ser um número válido.');
      return;
    }

    let normalizedTime = deadlineTime.trim();
    if (normalizedTime.length === 5) {
      normalizedTime = `${normalizedTime}:00`;
    }

    const payload = {
      ...itemToEdit,
      dailyMealId: dailyMealId ? parseInt(dailyMealId, 10) : null,
      deadlineTime: normalizedTime,
      points: parseInt(points, 10),
    };

    try {
      setSaving(true);
      await onSave(payload, itemToEdit?.id);
      onClose(true);
    } catch (err) {
      console.error('Error saving meal point tier:', err);
      setError('Erro ao salvar os pontos da refeição. Verifique os dados fornecidos.');
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
            <span>Níveis de Pontos</span>
          </button>
          <ChevronRight size={14} style={{ color: 'var(--text-body)' }} />
          <span style={{ color: 'var(--text-heading)', fontWeight: '500' }}>{itemToEdit ? 'Editar Nível' : 'Novo Nível'}</span>
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
            <Star size={20} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: isPage ? 'var(--text-heading)' : 'var(--text-heading)', margin: 0 }}>
              {itemToEdit ? 'Editar Nível de Pontos' : 'Novo Nível de Pontos'}
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
              Refeição Diária *
            </label>
            <div style={{ marginBottom: '8px' }}>
              <FilterableMultiSelect
                label=""
                icon={Utensils}
                iconColor="var(--accent-primary)"
                options={dailyMealsList}
                selectedIds={dailyMealId ? [parseInt(dailyMealId, 10)] : []}
                onChange={(ids) => setDailyMealId(ids.length > 0 ? String(ids[0]) : '')}
                placeholder="Selecione uma refeição..."
                isSingleSelect={true}
                disabled={saving}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: isPage ? 'var(--text-heading)' : '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: '500' }}>
              Horário Limite *
            </label>
            <input
              type="time"
              step="1"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
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
          
          <div>
            <label style={{ display: 'block', color: isPage ? 'var(--text-heading)' : '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: '500' }}>
              Pontos *
            </label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              required
              min="0"
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
