import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Apple,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  Flame,
  Layers,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { CsvImportModal } from '../../components/common/CsvImportModal';
import { ingredientService } from '../../services';
import { fetchTenants } from '../../store/tenantSlice';
import { ROLES } from '../../utils/enums';

const macroFields = ['kcal', 'protein', 'carbs', 'fat', 'fiber'];
const mineralFields = [
  'calcium',
  'magnesium',
  'manganese',
  'phosphorus',
  'iron',
  'sodium',
  'potassium',
  'copper',
  'zinc',
];
const vitaminFields = [
  'vitaminC',
  'thiamine',
  'riboflavin',
  'pyridoxine',
  'niacin',
  'retinol',
  're',
  'rae',
];
const lipidOtherFields = [
  'tacoId',
  'moisture',
  'kj',
  'cholesterol',
  'ash',
  'saturatedFat',
  'monounsaturatedFat',
  'polyunsaturatedFat',
];

const allTacoFields = [
  ...macroFields,
  ...mineralFields,
  ...vitaminFields,
  ...lipidOtherFields,
];

const emptyForm = {
  name: '',
  tenantId: '',
  ...Object.fromEntries(allTacoFields.map((field) => [field, ''])),
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const csvIngredientColumns = [
  { key: 'name', labelKey: 'common.name', type: 'text', required: true },
  { key: 'kcal', labelKey: 'ingredients.kcal', type: 'number', required: true },
  { key: 'protein', labelKey: 'ingredients.protein', type: 'number', required: true },
  { key: 'carbs', labelKey: 'ingredients.carbs', type: 'number', required: true },
  { key: 'fat', labelKey: 'ingredients.fat', type: 'number', required: true },
  { key: 'fiber', labelKey: 'ingredients.fiber', type: 'number', required: true },
  { key: 'taco_id', labelKey: 'ingredients.tacoId', type: 'number', required: false },
  { key: 'moisture', labelKey: 'ingredients.moisture', type: 'number', required: false },
  { key: 'kj', labelKey: 'ingredients.kj', type: 'number', required: false },
  { key: 'cholesterol', labelKey: 'ingredients.cholesterol', type: 'number', required: false },
  { key: 'ash', labelKey: 'ingredients.ash', type: 'number', required: false },
  { key: 'calcium', labelKey: 'ingredients.calcium', type: 'number', required: false },
  { key: 'magnesium', labelKey: 'ingredients.magnesium', type: 'number', required: false },
  { key: 'manganese', labelKey: 'ingredients.manganese', type: 'number', required: false },
  { key: 'phosphorus', labelKey: 'ingredients.phosphorus', type: 'number', required: false },
  { key: 'iron', labelKey: 'ingredients.iron', type: 'number', required: false },
  { key: 'sodium', labelKey: 'ingredients.sodium', type: 'number', required: false },
  { key: 'potassium', labelKey: 'ingredients.potassium', type: 'number', required: false },
  { key: 'copper', labelKey: 'ingredients.copper', type: 'number', required: false },
  { key: 'zinc', labelKey: 'ingredients.zinc', type: 'number', required: false },
  { key: 'retinol', labelKey: 'ingredients.retinol', type: 'number', required: false },
  { key: 're', labelKey: 'ingredients.re', type: 'number', required: false },
  { key: 'rae', labelKey: 'ingredients.rae', type: 'number', required: false },
  { key: 'thiamine', labelKey: 'ingredients.thiamine', type: 'number', required: false },
  { key: 'riboflavin', labelKey: 'ingredients.riboflavin', type: 'number', required: false },
  { key: 'pyridoxine', labelKey: 'ingredients.pyridoxine', type: 'number', required: false },
  { key: 'niacin', labelKey: 'ingredients.niacin', type: 'number', required: false },
  { key: 'vitamin_c', labelKey: 'ingredients.vitaminC', type: 'number', required: false },
  { key: 'saturated_fat', labelKey: 'ingredients.saturatedFat', type: 'number', required: false },
  { key: 'monounsaturated_fat', labelKey: 'ingredients.monounsaturatedFat', type: 'number', required: false },
  { key: 'polyunsaturated_fat', labelKey: 'ingredients.polyunsaturatedFat', type: 'number', required: false },
];

export const IngredientManagement = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { activeTenant, tenantsList } = useSelector((state) => state.tenant);
  const isSysAdmin = user?.role === ROLES.SYS_ADMIN;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('macros');
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await ingredientService.getAll();
      setItems(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t('ingredients.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (isSysAdmin && tenantsList.length === 0) dispatch(fetchTenants());
  }, [dispatch, isSysAdmin, tenantsList.length]);

  useEffect(() => {
    if (!viewingItem) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setViewingItem(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [viewingItem]);

  const displayedItems = useMemo(
    () =>
      items.filter((item) =>
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [items, searchTerm],
  );

  const totalPages = Math.max(1, Math.ceil(displayedItems.length / pageSize));
  const paginatedItems = useMemo(
    () => displayedItems.slice((page - 1) * pageSize, page * pageSize),
    [displayedItems, page, pageSize],
  );

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const openCreate = () => {
    setEditingItem(null);
    setActiveTab('macros');
    setForm({
      ...emptyForm,
      tenantId: isSysAdmin && activeTenant?.id ? String(activeTenant.id) : '',
    });
    setError('');
    setIsFormOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setActiveTab('macros');
    const loadedForm = {
      name: item.name || '',
      tenantId: item.tenantId ? String(item.tenantId) : '',
    };
    allTacoFields.forEach((field) => {
      loadedForm[field] = item[field] !== null && item[field] !== undefined ? String(item[field]) : '';
    });
    setForm(loadedForm);
    setError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setIsFormOpen(false);
    setEditingItem(null);
    setForm(emptyForm);
  };

  const saveIngredient = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      kcal: Number(form.kcal) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
      fiber: Number(form.fiber) || 0,
      ...(isSysAdmin && form.tenantId ? { tenantId: Number(form.tenantId) } : {}),
    };

    [...mineralFields, ...vitaminFields, ...lipidOtherFields].forEach((field) => {
      const raw = form[field];
      if (raw !== '' && raw !== null && raw !== undefined) {
        payload[field] = field === 'tacoId' ? parseInt(raw, 10) : Number(raw);
      } else {
        payload[field] = null;
      }
    });

    try {
      if (editingItem) await ingredientService.update(editingItem.id, payload);
      else await ingredientService.create(payload);
      setIsFormOpen(false);
      setEditingItem(null);
      setForm(emptyForm);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t('ingredients.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const deleteIngredient = async () => {
    if (!deletingItem) return;
    setSaving(true);
    setError('');
    try {
      await ingredientService.delete(deletingItem.id);
      setDeletingItem(null);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t('ingredients.deleteError'));
    } finally {
      setSaving(false);
    }
  };

  const importColumns = useMemo(
    () =>
      csvIngredientColumns.map((col) => ({
        key: col.key,
        label: t(col.labelKey),
        type: col.type,
        required: col.required,
      })),
    [t],
  );

  const formatNutrientValue = (val, suffix = '') => {
    if (val === null || val === undefined || val === '') return '—';
    const num = Number(val);
    if (!Number.isFinite(num)) return '—';
    return `${num.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${suffix}`.trim();
  };

  return (
    <div className="user-management-container">
      <div className="management-header">
        <div>
          <h2 className="section-title">{t('ingredients.title')}</h2>
          <p className="section-subtitle">{t('ingredients.subtitle')}</p>
        </div>
        <div className="header-action-buttons">
          <button type="button" className="btn-action-outline" onClick={loadData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin-icon' : ''} /> {t('common.refresh')}
          </button>
          <button type="button" className="btn-action-outline" onClick={() => setIsImportOpen(true)}>
            <Upload size={17} /> {t('csvImport.button')}
          </button>
          <button type="button" className="btn-action-primary" onClick={openCreate}>
            <Plus size={18} /> {t('ingredients.add')}
          </button>
        </div>
      </div>

      {error && <div className="page-error-alert">{error}</div>}

      <div className="filter-bar ingredient-filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            placeholder={t('common.searchByName')}
          />
        </div>
      </div>

      <div className="table-card">
        {loading && items.length === 0 ? (
          <div className="table-loading-state">
            <RefreshCw size={24} className="spin-icon" />
            <p>{t('entities.loadingRecords')}</p>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="table-empty-state">
            <Apple size={36} />
            <p>{t('ingredients.empty')}</p>
            <div className="empty-state-actions">
              <button type="button" className="btn-action-primary" onClick={openCreate}>
                <Plus size={16} /> {t('entities.registerFirst')}
              </button>
              <button type="button" className="btn-action-outline" onClick={() => setIsImportOpen(true)}>
                <Upload size={16} /> {t('csvImport.button')}
              </button>
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="custom-data-table ingredient-data-table">
              <thead>
                <tr>
                  <th className="th-id">{t('common.id')}</th>
                  <th className="th-name">{t('common.name')}</th>
                  {macroFields.map((field) => (
                    <th key={field} className="th-nutrient">
                      {t(`ingredients.${field}`)}
                    </th>
                  ))}
                  {isSysAdmin && <th className="th-tenant">{t('csvImport.targetTenant')}</th>}
                  <th className="th-actions" style={{ textAlign: 'right' }}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr key={item.id}>
                    <td className="td-id">#{item.id}</td>
                    <td className="td-name">
                      <span className="ingredient-name">
                        <Apple size={16} className="ingredient-icon" />
                        <span>{item.name}</span>
                      </span>
                    </td>
                    {macroFields.map((field) => (
                      <td key={field} className="td-nutrient">
                        {Number(item[field] || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                    ))}
                    {isSysAdmin && (
                      <td className="td-tenant">{tenantsList.find((tenant) => tenant.id === item.tenantId)?.name || item.tenantId || '—'}</td>
                    )}
                    <td className="td-actions">
                      <div className="ingredient-actions">
                        <button
                          type="button"
                          className="btn-table-info"
                          onClick={() => setViewingItem(item)}
                          title={t('ingredients.viewDetails')}
                        >
                          <Eye size={15} /> {t('common.view', 'View')}
                        </button>
                        <button
                          type="button"
                          className="btn-table-edit"
                          onClick={() => openEdit(item)}
                          title={t('common.edit')}
                        >
                          <Edit2 size={15} /> {t('common.edit')}
                        </button>
                        <button
                          type="button"
                          className="btn-table-delete"
                          onClick={() => setDeletingItem(item)}
                          title={t('common.delete')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {displayedItems.length > 0 && (
        <div className="catalog-pagination">
          <span>
            {displayedItems.length} {t('ingredients.entityName')} — {page} / {totalPages}
          </span>
          <div>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              aria-label={t('common.itemsPerPage')}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              aria-label={t('common.previous')}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              aria-label={t('common.next')}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isFormOpen && (
        <div className="modal-backdrop">
          <div className="modal-content ingredient-form-modal">
            <div className="modal-header">
              <h3 className="modal-title">{editingItem ? t('ingredients.edit') : t('ingredients.add')}</h3>
              <button type="button" className="btn-modal-close" onClick={closeForm} disabled={saving}>
                <X size={20} />
              </button>
            </div>
            {error && <div className="modal-error-alert">{error}</div>}

            <form className="modal-form" onSubmit={saveIngredient}>
              <div className="form-group ingredient-name-field">
                <label>{t('common.name')} *</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  maxLength={255}
                  required
                  autoFocus
                />
              </div>

              {isSysAdmin && (
                <div className="form-group">
                  <label>{t('csvImport.targetTenant')}</label>
                  <select
                    value={form.tenantId}
                    onChange={(event) => setForm({ ...form, tenantId: event.target.value })}
                    required
                  >
                    <option value="">{t('csvImport.selectTenant')}</option>
                    {tenantsList.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* TABS */}
              <div className="ingredient-tabs">
                <button
                  type="button"
                  className={`ingredient-tab-btn ${activeTab === 'macros' ? 'active' : ''}`}
                  onClick={() => setActiveTab('macros')}
                >
                  <Flame size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-top' }} />
                  {t('ingredients.tabMacros')}
                </button>
                <button
                  type="button"
                  className={`ingredient-tab-btn ${activeTab === 'minerals' ? 'active' : ''}`}
                  onClick={() => setActiveTab('minerals')}
                >
                  <Sparkles size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-top' }} />
                  {t('ingredients.tabMinerals')}
                </button>
                <button
                  type="button"
                  className={`ingredient-tab-btn ${activeTab === 'vitamins' ? 'active' : ''}`}
                  onClick={() => setActiveTab('vitamins')}
                >
                  <Pill size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-top' }} />
                  {t('ingredients.tabVitamins')}
                </button>
                <button
                  type="button"
                  className={`ingredient-tab-btn ${activeTab === 'lipids' ? 'active' : ''}`}
                  onClick={() => setActiveTab('lipids')}
                >
                  <Layers size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-top' }} />
                  {t('ingredients.tabLipidsOther')}
                </button>
              </div>

              {/* TAB CONTENT */}
              {activeTab === 'macros' && (
                <div className="ingredient-nutrient-grid">
                  {macroFields.map((field) => (
                    <div className="form-group" key={field}>
                      <label>{t(`ingredients.${field}`)} *</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={form[field]}
                        onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                        required
                      />
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'minerals' && (
                <div className="ingredient-nutrient-grid">
                  {mineralFields.map((field) => (
                    <div className="form-group" key={field}>
                      <label>{t(`ingredients.${field}`)}</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="—"
                        value={form[field]}
                        onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                      />
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'vitamins' && (
                <div className="ingredient-nutrient-grid">
                  {vitaminFields.map((field) => (
                    <div className="form-group" key={field}>
                      <label>{t(`ingredients.${field}`)}</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="—"
                        value={form[field]}
                        onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                      />
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'lipids' && (
                <div className="ingredient-nutrient-grid">
                  {lipidOtherFields.map((field) => (
                    <div className="form-group" key={field}>
                      <label>{t(`ingredients.${field}`)}</label>
                      <input
                        type="number"
                        min="0"
                        step={field === 'tacoId' ? '1' : 'any'}
                        placeholder="—"
                        value={form[field]}
                        onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn-modal-cancel" onClick={closeForm} disabled={saving}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-modal-submit" disabled={saving}>
                  {saving ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingItem && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewingItem(null);
          }}
        >
          <div className="modal-content ingredient-details-modal" role="dialog" aria-modal="true" aria-labelledby="ingredient-details-title">
            <div className="modal-header">
              <div>
                <h3 id="ingredient-details-title" className="modal-title">{viewingItem.name}</h3>
                <small style={{ color: 'var(--text-body)' }}>
                  {viewingItem.tacoId ? `TACO #${viewingItem.tacoId} — ` : ''}
                  {t('ingredients.per100g')}
                </small>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setViewingItem(null)}
                aria-label={t('common.close')}
              >
                <X size={20} />
              </button>
            </div>

            <div className="ingredient-details-content">
              <div className="ingredient-details-sections-grid">
                <div className="details-column">
                  {/* MACROS */}
                  <div className="details-section-group">
                    <h4>
                      <Flame size={16} /> {t('ingredients.tabMacros')}
                    </h4>
                    <div className="details-grid">
                      <div className="detail-stat-card">
                        <span>{t('ingredients.kcal')}</span>
                        <strong>{formatNutrientValue(viewingItem.kcal, 'kcal')}</strong>
                      </div>
                      <div className="detail-stat-card">
                        <span>{t('ingredients.protein')}</span>
                        <strong>{formatNutrientValue(viewingItem.protein, 'g')}</strong>
                      </div>
                      <div className="detail-stat-card">
                        <span>{t('ingredients.carbs')}</span>
                        <strong>{formatNutrientValue(viewingItem.carbs, 'g')}</strong>
                      </div>
                      <div className="detail-stat-card">
                        <span>{t('ingredients.fat')}</span>
                        <strong>{formatNutrientValue(viewingItem.fat, 'g')}</strong>
                      </div>
                      <div className="detail-stat-card">
                        <span>{t('ingredients.fiber')}</span>
                        <strong>{formatNutrientValue(viewingItem.fiber, 'g')}</strong>
                      </div>
                      <div className="detail-stat-card">
                        <span>{t('ingredients.kj')}</span>
                        <strong>{formatNutrientValue(viewingItem.kj, 'kJ')}</strong>
                      </div>
                    </div>
                  </div>

                  {/* LIPIDS & CENTESIMAL */}
                  <div className="details-section-group">
                    <h4>
                      <Layers size={16} /> {t('ingredients.tabLipidsOther')}
                    </h4>
                    <div className="details-grid">
                      <div className="detail-stat-card">
                        <span>{t('ingredients.moisture')}</span>
                        <strong>{formatNutrientValue(viewingItem.moisture, '%')}</strong>
                      </div>
                      <div className="detail-stat-card">
                        <span>{t('ingredients.ash')}</span>
                        <strong>{formatNutrientValue(viewingItem.ash, 'g')}</strong>
                      </div>
                      <div className="detail-stat-card">
                        <span>{t('ingredients.cholesterol')}</span>
                        <strong>{formatNutrientValue(viewingItem.cholesterol, 'mg')}</strong>
                      </div>
                      <div className="detail-stat-card">
                        <span>{t('ingredients.saturatedFat')}</span>
                        <strong>{formatNutrientValue(viewingItem.saturatedFat, 'g')}</strong>
                      </div>
                      <div className="detail-stat-card">
                        <span>{t('ingredients.monounsaturatedFat')}</span>
                        <strong>{formatNutrientValue(viewingItem.monounsaturatedFat, 'g')}</strong>
                      </div>
                      <div className="detail-stat-card">
                        <span>{t('ingredients.polyunsaturatedFat')}</span>
                        <strong>{formatNutrientValue(viewingItem.polyunsaturatedFat, 'g')}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="details-column">
                  {/* MINERALS */}
                  <div className="details-section-group">
                    <h4>
                      <Sparkles size={16} /> {t('ingredients.tabMinerals')}
                    </h4>
                    <div className="details-grid">
                      {mineralFields.map((field) => (
                        <div className="detail-stat-card" key={field}>
                          <span>{t(`ingredients.${field}`)}</span>
                          <strong>{formatNutrientValue(viewingItem[field], 'mg')}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* VITAMINS */}
                  <div className="details-section-group">
                    <h4>
                      <Pill size={16} /> {t('ingredients.tabVitamins')}
                    </h4>
                    <div className="details-grid">
                      {vitaminFields.map((field) => {
                        const unit = field.startsWith('re') || field === 'retinol' || field === 'rae' ? 'mcg' : 'mg';
                        return (
                          <div className="detail-stat-card" key={field}>
                            <span>{t(`ingredients.${field}`)}</span>
                            <strong>{formatNutrientValue(viewingItem[field], unit)}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setViewingItem(null)}
              >
                {t('common.close')}
              </button>
              <button
                type="button"
                className="btn-modal-submit"
                onClick={() => {
                  const item = viewingItem;
                  setViewingItem(null);
                  openEdit(item);
                }}
              >
                <Edit2 size={16} /> {t('common.edit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingItem && (
        <div className="modal-backdrop">
          <div className="modal-content confirm-delete-modal">
            <div className="modal-header">
              <h3 className="modal-title">{t('ingredients.deleteTitle')}</h3>
            </div>
            <p>{t('ingredients.deleteMessage', { name: deletingItem.name })}</p>
            <div className="modal-footer">
              <button type="button" className="btn-modal-cancel" onClick={() => setDeletingItem(null)} disabled={saving}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn-danger" onClick={deleteIngredient} disabled={saving}>
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={loadData}
        service={ingredientService}
        title={t('csvImport.title', { entity: t('ingredients.entityName') })}
        columns={importColumns}
        templateRow={{
          name: t('ingredients.example'),
          kcal: 110,
          protein: 8,
          carbs: 20,
          fat: 1,
          fiber: 5,
          taco_id: 1,
          moisture: 70.1,
          calcium: 5.2,
          iron: 0.26,
          sodium: 1.2,
          vitamin_c: 0,
        }}
        maxNameLength={255}
      />
    </div>
  );
};
