import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, RefreshCw, X, Search, Tag, Upload, ArrowLeft, ChevronRight, Save } from 'lucide-react';
import { fetchClinicalEntities, saveClinicalEntity } from '../../store/clinicalSlice';
import { CsvImportModal } from './CsvImportModal';

export const SimpleEntityManagement = ({
  title,
  subtitle,
  entityName,
  service,
  icon: Icon = Tag,
  importEnabled = false,
  formPresentation = 'modal',
}) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const clinicalState = useSelector((state) => state.clinical);


  const key = entityName.toLowerCase().replace(/\s+/g, '_');
  const items = clinicalState.entities[key] || [];
  const loading = clinicalState.loading[key] || false;

  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const loadData = useCallback(() => {
    setError(null);
    dispatch(fetchClinicalEntities({ key, service }));
  }, [dispatch, key, service]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setNameInput('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setNameInput(item.name || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setNameInput('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    setSaving(true);
    setError(null);

    const payload = {
      name: nameInput.trim(),
    };

    try {
      const result = await dispatch(saveClinicalEntity({ key, service, id: editingItem?.id, payload }));
      if (saveClinicalEntity.fulfilled.match(result)) {
        handleCloseModal();
        loadData();
      } else {
        setError(result.payload?.error || t('common.errorSaving'));
      }
    } catch {
      setError(t('common.errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  const displayedItems = items.filter((item) =>
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isModalOpen && formPresentation === 'page') {
    const formTitle = editingItem
      ? t('entities.editEntity', { entity: entityName })
      : t('entities.addEntity', { entity: entityName });

    return (
      <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-body)', marginBottom: '16px' }}>
          <button type="button" onClick={handleCloseModal} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: '600', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={16} />
            <span>{title}</span>
          </button>
          <ChevronRight size={14} style={{ color: 'var(--text-body)' }} />
          <span style={{ color: 'var(--text-heading)', fontWeight: '500' }}>{formTitle}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px 16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontFamily: "'Jost', sans-serif", fontSize: '1.6rem', color: 'var(--text-heading)', margin: 0, fontWeight: '500' }}>{formTitle}</h2>
          <p style={{ margin: '0 0 0 auto', fontSize: '0.9rem', color: 'var(--text-body)', textAlign: 'right' }}>{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%', boxSizing: 'border-box' }}>
          <section style={{ width: '100%', boxSizing: 'border-box', marginBottom: '24px', padding: '24px 32px', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontFamily: "'Jost', sans-serif", fontSize: '1.1rem', color: 'var(--accent-primary)', margin: '0 0 20px', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon size={18} /> {formTitle}
            </h3>

            {error && <div style={{ padding: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #F87171', borderRadius: '10px', color: '#991B1B', fontSize: '0.85rem', marginBottom: '20px' }}>{error}</div>}

            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-heading)', fontSize: '0.85rem', fontWeight: '600' }}>{t('entities.entityName', { entity: entityName })}</label>
              <input
                type="text"
                placeholder={t('entities.entityNamePlaceholder', { entity: entityName.toLowerCase() })}
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                required
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#FFF', fontSize: '0.88rem' }}
              />
            </div>
          </section>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '24px', marginTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" onClick={handleCloseModal} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: '#FFFFFF', color: '#475569', fontFamily: "'Jost', sans-serif", fontSize: '0.88rem', fontWeight: '500', cursor: 'pointer' }}>
              <X size={16} /> {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '24px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))', color: '#FFFFFF', fontFamily: "'Jost', sans-serif", fontSize: '0.88rem', fontWeight: '600', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(29, 111, 209, 0.3)' }}>
              <Save size={18} /> {saving ? t('common.saving') : editingItem ? t('common.saveChanges') : t('common.register')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="user-management-container">
      {/* Top Header */}
      <div className="management-header">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="section-subtitle">{subtitle}</p>
        </div>

        <div className="header-action-buttons">
          <button
            type="button"
            className="btn-action-outline"
            onClick={() => setIsImportOpen(true)}
            hidden={!importEnabled}
          >
            <Upload size={17} />
            <span>{t('csvImport.button')}</span>
          </button>

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
            <span>{t('entities.addEntity', { entity: entityName })}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="filter-bar" style={{ marginBottom: '20px', width: '100%', boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
        <div className="search-input-wrapper" style={{ flex: 1, position: 'relative', width: '100%', boxSizing: 'border-box' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
          <input
            type="text"
            placeholder={t('common.searchByName')}
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
            <p>{t('entities.loadingRecords')}</p>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="table-empty-state">
            <Icon size={36} />
            <p>{t('entities.noRecordFound', { entity: entityName.toLowerCase() })}</p>
            <div className="empty-state-actions">
              <button type="button" className="btn-action-primary" onClick={handleOpenAddModal}>
                <Plus size={16} />
                <span>{t('entities.registerFirst')}</span>
              </button>
              {importEnabled && (
                <button type="button" className="btn-action-outline" onClick={() => setIsImportOpen(true)}>
                  <Upload size={16} />
                  <span>{t('csvImport.button')}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th>{t('common.id')}</th>
                  <th>{t('entities.recordName')}</th>
                  <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '600', color: 'var(--text-muted, #64748B)', width: '80px' }}>
                      #{item.id}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icon size={16} style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ fontWeight: '500' }}>{item.name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-table-edit"
                        onClick={() => handleOpenEditModal(item)}
                        title={t('entities.editRecord')}
                      >
                        <Edit2 size={16} />
                        <span>{t('common.edit')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingItem ? t('entities.editEntity', { entity: entityName }) : t('entities.addEntity', { entity: entityName })}
              </h3>
              <button type="button" className="btn-modal-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="modal-error-alert">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>{t('entities.entityName', { entity: entityName })}</label>
                <input
                  type="text"
                  placeholder={t('entities.entityNamePlaceholder', { entity: entityName.toLowerCase() })}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-modal-cancel" onClick={handleCloseModal}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-modal-submit" disabled={saving}>
                  {saving ? t('common.saving') : editingItem ? t('common.saveChanges') : t('common.register')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={loadData}
        service={service}
        title={t('csvImport.title', { entity: entityName })}
        columns={[{ key: 'name', label: t('entities.recordName'), type: 'text' }]}
        templateRow={{ name: t('csvImport.catalogExample') }}
      />
    </div>
  );
};
