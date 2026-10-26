import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Stethoscope,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  X,
  LayoutGrid,
  List,
  AlertTriangle,
} from 'lucide-react';
import { doctorService } from '../../services/api';
import { DoctorFormPage } from './DoctorFormPage';

const formatPhone = (val) => {
  if (!val) return 'N/A';
  const digits = val.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export const DoctorManagement = () => {
  const { t } = useTranslation();


  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayView, setDisplayView] = useState('cards');

  // Navigation view mode: 'list' | 'form'
  const [viewMode, setViewMode] = useState('list');
  const [editingDoctor, setEditingDoctor] = useState(null);

  // Delete modal state
  const [deletingDoctor, setDeletingDoctor] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await doctorService.getAll();
      setDoctors(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error loading doctors:', err);
      setError(err?.response?.data?.message || t('doctors.errorLoading', 'Erro ao carregar lista de médicos.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAddForm = () => {
    setEditingDoctor(null);
    setViewMode('form');
  };

  const handleOpenEditForm = (doctor) => {
    setEditingDoctor(doctor);
    setViewMode('form');
  };

  const handleConfirmDelete = async () => {
    if (!deletingDoctor) return;
    setIsDeleting(true);
    setError(null);
    try {
      await doctorService.delete(deletingDoctor.id);
      setDeletingDoctor(null);
      loadData();
    } catch (err) {
      console.error('Error deleting doctor:', err);
      setError(err?.response?.data?.message || t('doctors.errorDeleting', 'Erro ao excluir médico.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const displayedDoctors = doctors.filter((doc) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (doc.name || '').toLowerCase().includes(searchLower) ||
        (doc.document || '').toLowerCase().includes(searchLower) ||
        (doc.email || '').toLowerCase().includes(searchLower) ||
        (doc.phone || '').includes(searchTerm) ||
        (doc.city || '').toLowerCase().includes(searchLower)
      );
  });

  const doctorsWithDocument = displayedDoctors.filter((d) => d.document && d.document.trim().length > 0).length;

  // Render Full-Page Doctor Form
  if (viewMode === 'form') {
    return (
      <DoctorFormPage
        editingDoctor={editingDoctor}
        onBack={() => setViewMode('list')}
        onSaveSuccess={() => {
          setViewMode('list');
          loadData();
        }}
      />
    );
  }

  // Render Doctor List View
  return (
    <div className="user-management-container">
      {/* Header */}
      <div className="management-header">
        <div>
          <h2 className="section-title">{t('doctors.title', 'Corpo Médico')}</h2>
          <p className="section-subtitle">
            {t('doctors.subtitle', 'Gerencie os médicos e profissionais de saúde cadastrados')}
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
            onClick={handleOpenAddForm}
          >
            <Plus size={18} />
            <span>{t('doctors.addDoctor', 'Novo Médico')}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#B91C1C',
            fontSize: '0.88rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <X size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B91C1C' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="customer-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrapper gold">
            <Stethoscope size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{displayedDoctors.length}</span>
            <span className="kpi-label">{t('doctors.totalDoctors', 'Total de Médicos')}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper emerald">
            <FileText size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{doctorsWithDocument}</span>
            <span className="kpi-label">{t('doctors.withCRM', 'Com CRM / Registro')}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper indigo">
            <MapPin size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">
              {displayedDoctors.filter((d) => d.city || d.province).length}
            </span>
            <span className="kpi-label">{t('doctors.withLocation', 'Com Cidade / UF')}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar with View Mode Toggle */}
      <div
        className="filter-bar"
        style={{
          marginBottom: '24px',
          width: '100%',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '260px', boxSizing: 'border-box' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#888',
            }}
          />
          <input
            type="text"
            placeholder={t('doctors.searchPlaceholder', 'Buscar por nome, CRM, e-mail ou cidade...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px 10px 38px',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #E2E8F0)',
              backgroundColor: 'var(--bg-secondary, #FFF)',
              fontSize: '0.9rem',
            }}
          />
        </div>

        {/* View Switcher */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            background: '#F1F5F9',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}
        >
          <button
            type="button"
            onClick={() => setDisplayView('cards')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: displayView === 'cards' ? '#FFFFFF' : 'transparent',
              color: displayView === 'cards' ? 'var(--text-heading)' : '#64748B',
              boxShadow: displayView === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease',
            }}
            title={t('common.cardsView', 'Visualização em Cards')}
          >
            <LayoutGrid size={16} />
            <span>{t('common.cards', 'Cards')}</span>
          </button>
          <button
            type="button"
            onClick={() => setDisplayView('table')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: displayView === 'table' ? '#FFFFFF' : 'transparent',
              color: displayView === 'table' ? 'var(--text-heading)' : '#64748B',
              boxShadow: displayView === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease',
            }}
            title={t('common.tableView', 'Visualização em Tabela')}
          >
            <List size={16} />
            <span>{t('common.table', 'Tabela')}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Cards or Table */}
      {loading && doctors.length === 0 ? (
        <div className="table-card">
          <div className="table-loading-state">
            <RefreshCw size={24} className="spin-icon" />
            <p>{t('doctors.loadingDoctors', 'Carregando corpo médico...')}</p>
          </div>
        </div>
      ) : displayedDoctors.length === 0 ? (
        <div className="table-card">
          <div className="table-empty-state">
            <Stethoscope size={36} />
            <p>{t('doctors.noDoctorsFound', 'Nenhum médico encontrado.')}</p>
            <button type="button" className="btn-action-primary" onClick={handleOpenAddForm}>
              <Plus size={16} />
              <span>{t('doctors.addDoctor', 'Novo Médico')}</span>
            </button>
          </div>
        </div>
      ) : displayView === 'cards' ? (
        /* Doctor Cards Grid View */
        <div className="customer-cards-grid">
          {displayedDoctors.map((doc) => {
            const photoSrc = doc.photoBase64 || doc.photo_base64 || doc.photoUrl || null;
            const dob = doc.dateOfBirth || doc.date_of_birth || '';

            return (
              <div key={doc.id} className="customer-card">
                <div className="customer-card-header">
                  <div className="customer-card-avatar">
                    {photoSrc ? (
                      <img src={photoSrc} alt={doc.name} />
                    ) : (
                      <span>{(doc.name || 'D')[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div className="customer-card-title-group">
                    <h3 className="customer-card-name" title={doc.name}>
                      {doc.name}
                    </h3>
                    <span className="customer-card-id">ID #{doc.id}</span>
                  </div>

                  {doc.document ? (
                    <span className="customer-status-badge mobile-active" title={doc.document}>
                      <FileText size={12} /> {doc.document}
                    </span>
                  ) : (
                    <span className="customer-status-badge mobile-inactive">
                      {t('common.notAvailable', 'N/A')}
                    </span>
                  )}
                </div>

                <div className="customer-card-body">
                  <div className="info-row">
                    <Mail size={14} className="info-icon text-gold" />
                    <span className="info-text">{doc.email || t('common.notAvailable', 'N/A')}</span>
                  </div>
                  <div className="info-row">
                    <Phone size={14} className="info-icon" />
                    <span className="info-text">{formatPhone(doc.phone)}</span>
                  </div>
                  <div className="info-row">
                    <MapPin size={14} className="info-icon" />
                    <span className="info-text">
                      {doc.city ? `${doc.city}, ${doc.province || ''}` : doc.province || t('common.notAvailable', 'N/A')}
                    </span>
                  </div>

                  {dob && (
                    <div className="tags-row" style={{ marginTop: '8px' }}>
                      <span className="badge-tag dob-tag">
                        <Calendar size={12} /> {dob}
                      </span>
                    </div>
                  )}
                </div>

                <div className="customer-card-footer" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-card-edit"
                    onClick={() => handleOpenEditForm(doc)}
                    title={t('common.edit', 'Editar')}
                  >
                    <Edit2 size={15} />
                    <span>{t('common.edit', 'Editar')}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-card-edit"
                    onClick={() => setDeletingDoctor(doc)}
                    title={t('common.delete', 'Excluir')}
                    style={{ borderColor: '#FECACA', color: '#DC2626', backgroundColor: '#FEF2F2' }}
                  >
                    <Trash2 size={15} />
                    <span>{t('common.delete', 'Excluir')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Doctor Table View */
        <div className="table-card">
          <div className="table-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th>{t('doctors.doctor', 'Médico')}</th>
                  <th>{t('doctors.documentCRM', 'CRM / Documento')}</th>
                  <th>{t('doctors.contact', 'Contato')}</th>
                  <th>{t('doctors.location', 'Localização')}</th>
                  <th>{t('doctors.dateOfBirth', 'Data de Nasc.')}</th>
                  <th style={{ textAlign: 'right' }}>{t('common.actions', 'Ações')}</th>
                </tr>
              </thead>
              <tbody>
                {displayedDoctors.map((doc) => {
                  const photoSrc = doc.photoBase64 || doc.photo_base64 || doc.photoUrl || null;
                  const dob = doc.dateOfBirth || doc.date_of_birth || '';

                  return (
                    <tr key={doc.id}>
                      <td>
                        <div className="user-table-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              backgroundColor: '#F1F5F9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              fontWeight: '600',
                              color: 'var(--text-heading)',
                              fontSize: '0.9rem',
                            }}
                          >
                            {photoSrc ? (
                              <img src={photoSrc} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              (doc.name || 'D')[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <span className="user-table-name" style={{ fontWeight: '600', display: 'block' }}>
                              {doc.name}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: '#888' }}>ID #{doc.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: '500', color: 'var(--text-heading)', fontSize: '0.88rem' }}>
                          {doc.document || '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mail size={12} style={{ color: 'var(--accent-primary)' }} /> {doc.email || '—'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666' }}>
                            <Phone size={12} /> {formatPhone(doc.phone)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                          <MapPin size={12} style={{ color: '#888' }} />
                          {doc.city ? `${doc.city}, ${doc.province || ''}` : doc.province || '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-body)' }}>{dob || '—'}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(doc)}
                            title={t('common.edit', 'Editar')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              border: '1px solid var(--border-color)',
                              backgroundColor: '#FFFFFF',
                              color: '#475569',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <Edit2 size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingDoctor(doc)}
                            title={t('common.delete', 'Excluir')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              border: '1px solid #FECACA',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDoctor && (
        <div className="modal-backdrop" style={{ zIndex: 1060 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: '440px',
              borderRadius: '16px',
              padding: '28px',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h3
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: '1.3rem',
                color: 'var(--text-heading)',
                margin: '0 0 8px 0',
                fontWeight: '600',
              }}
            >
              {t('doctors.confirmDeleteTitle', 'Excluir Médico')}
            </h3>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              {t('doctors.confirmDeleteMsg', 'Tem certeza de que deseja excluir o médico')}{' '}
              <strong style={{ color: 'var(--text-heading)' }}>"{deletingDoctor.name}"</strong>? {t('doctors.cannotBeUndone', 'Esta ação não pode ser desfeita.')}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setDeletingDoctor(null)}
                disabled={isDeleting}
                style={{ flex: 1, padding: '10px 16px', borderRadius: '24px' }}
              >
                <span>{t('common.cancel', 'Cancelar')}</span>
              </button>

              <button
                type="button"
                className="btn-action-primary"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '24px',
                  backgroundColor: '#DC2626',
                  borderColor: '#DC2626',
                }}
              >
                <span>{isDeleting ? t('common.deleting', 'Excluindo...') : t('common.confirm', 'Confirmar Exclusão')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
