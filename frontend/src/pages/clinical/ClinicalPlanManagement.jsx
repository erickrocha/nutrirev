import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, RefreshCw, Search, FileText, DollarSign, Calendar } from 'lucide-react';
import { fetchClinicalEntities, saveClinicalEntity } from '../../store/clinicalSlice';
import { clinicalPlanService } from '../../services/api';
import { ClinicalPlanFormModal } from '../../components/clinical/ClinicalPlanFormModal';
import { centsToDisplay } from '../../utils/currency';

export const ClinicalPlanManagement = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const clinicalState = useSelector((state) => state.clinical);


  const key = 'clinical_plan';
  const items = clinicalState.entities[key] || [];
  const loading = clinicalState.loading[key] || false;

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const loadData = useCallback(() => {
    dispatch(fetchClinicalEntities({ key, service: clinicalPlanService }));
  }, [dispatch, key]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    const result = await dispatch(
      saveClinicalEntity({ key, service: clinicalPlanService, id: editingId, payload })
    );
    if (saveClinicalEntity.fulfilled.match(result)) {
      loadData();
    } else {
      throw new Error(result.payload?.error || 'Erro ao salvar plano clínico.');
    }
  };

  const displayedItems = items.filter((item) =>
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isModalOpen) {
    return (
      <ClinicalPlanFormModal
        isOpen
        presentation="page"
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        itemToEdit={editingItem}
      />
    );
  }

  return (
    <div className="user-management-container">
      {/* Top Header */}
      <div className="management-header">
        <div>
          <h2 className="section-title">{t('clinical.clinicalPlan.title', 'Planos Clínicos')}</h2>
          <p className="section-subtitle">
            {t('clinical.clinicalPlan.subtitle', 'Gerencie os planos comerciais e periódos de renovação da clínica')}
          </p>
        </div>

        <div className="header-action-buttons">
          <button
            type="button"
            className="btn-action-outline"
            onClick={loadData}
            title={t('common.refreshList', 'Atualizar Lista')}
          >
            <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
            <span>{t('common.refresh', 'Atualizar')}</span>
          </button>

          <button
            type="button"
            className="btn-action-primary"
            onClick={handleOpenAddModal}
          >
            <Plus size={18} />
            <span>Novo Plano Clínico</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="filter-bar" style={{ marginBottom: '20px', width: '100%', boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
        <div className="search-input-wrapper" style={{ flex: 1, position: 'relative', width: '100%', boxSizing: 'border-box' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
          <input
            type="text"
            placeholder={t('common.searchByName', 'Pesquisar por nome...')}
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
        {loading && items.length === 0 ? (
          <div className="table-loading-state">
            <RefreshCw size={24} className="spin-icon" />
            <p>{t('entities.loadingRecords', 'Carregando registros...')}</p>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="table-empty-state">
            <FileText size={36} />
            <p>Nenhum plano clínico encontrado.</p>
            <button type="button" className="btn-action-primary" onClick={handleOpenAddModal}>
              <Plus size={16} />
              <span>Cadastrar Primeiro Plano</span>
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th>{t('common.id', 'ID')}</th>
                  <th>Nome do Plano</th>
                  <th>Preço (R$)</th>
                  <th>Renovação (Dias)</th>
                  <th style={{ textAlign: 'right' }}>{t('common.actions', 'Ações')}</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.map((item) => {
                  const priceStr = centsToDisplay(item.priceInCents);
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '600', color: 'var(--text-muted, #64748B)', width: '80px' }}>
                        #{item.id}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FileText size={16} style={{ color: 'var(--accent-primary)' }} />
                          <span style={{ fontWeight: '500' }}>{item.name}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <DollarSign size={14} style={{ color: '#10b981' }} />
                          <span>{priceStr ? `R$ ${priceStr}` : '—'}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} style={{ color: '#3b82f6' }} />
                          <span>{item.renewPeriodDays ? `${item.renewPeriodDays} dias` : '—'}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-table-edit"
                          onClick={() => handleOpenEditModal(item)}
                          title={t('entities.editRecord', 'Editar Registro')}
                        >
                          <Edit2 size={16} />
                          <span>{t('common.edit', 'Editar')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
