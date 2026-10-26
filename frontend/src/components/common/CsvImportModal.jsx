import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Upload,
  X,
} from 'lucide-react';
import { fetchTenants } from '../../store/tenantSlice';
import { ROLES } from '../../utils/enums';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 10_000;
const PAGE_SIZE = 20;

const emptyFileState = {
  name: '',
  size: 0,
  headers: [],
  rows: [],
  parsingErrors: [],
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 KB';
  return `${(bytes / 1024).toFixed(bytes < 1024 * 1024 ? 1 : 0)} KB`;
};

const errorKey = (rowIndex, column) => `${rowIndex}:${column || '*'}`;

const canonicalHeader = (raw) => {
  const clean = String(raw || '').trim().replace(/^\uFEFF/, '').toLowerCase();
  switch (clean) {
    case 'name':
    case 'nome':
    case 'descrição dos alimentos':
    case 'descricao dos alimentos':
    case 'descrição':
    case 'descricao':
    case 'alimento_nome':
      return 'name';
    case 'kcal':
    case 'energia (kcal)':
    case 'energia_kcal':
    case 'calorias':
      return 'kcal';
    case 'protein':
    case 'proteína':
    case 'proteina':
    case 'proteína (g)':
    case 'proteina (g)':
      return 'protein';
    case 'carbs':
    case 'carboidrato':
    case 'carboidratos':
    case 'carbo-idrato':
    case 'carbo-idrato (g)':
    case 'carboidrato (g)':
      return 'carbs';
    case 'fat':
    case 'lipídeos':
    case 'lipideos':
    case 'lipídeos (g)':
    case 'lipideos (g)':
    case 'gordura':
      return 'fat';
    case 'fiber':
    case 'fibra':
    case 'fibras':
    case 'fibra alimentar':
    case 'fibra alimentar (g)':
      return 'fiber';
    case 'taco_id':
    case 'tacoid':
    case 'tacoid':
    case 'número do alimento':
    case 'numero do alimento':
    case 'número do':
    case 'numero do':
    case 'alimento':
      return 'taco_id';
    case 'moisture':
    case 'umidade':
    case 'umidade (%)':
      return 'moisture';
    case 'kj':
    case 'energia (kj)':
    case 'energia_kj':
      return 'kj';
    case 'cholesterol':
    case 'colesterol':
    case 'colesterol (mg)':
      return 'cholesterol';
    case 'ash':
    case 'cinzas':
    case 'cinzas (g)':
      return 'ash';
    case 'calcium':
    case 'cálcio':
    case 'calcio':
    case 'cálcio (mg)':
    case 'calcio (mg)':
      return 'calcium';
    case 'magnesium':
    case 'magnésio':
    case 'magnesio':
    case 'magnésio (mg)':
    case 'magnesio (mg)':
      return 'magnesium';
    case 'manganese':
    case 'manganês':
    case 'manganes':
    case 'manganês (mg)':
    case 'manganes (mg)':
      return 'manganese';
    case 'phosphorus':
    case 'fósforo':
    case 'fosforo':
    case 'fósforo (mg)':
    case 'fosforo (mg)':
      return 'phosphorus';
    case 'iron':
    case 'ferro':
    case 'ferro (mg)':
      return 'iron';
    case 'sodium':
    case 'sódio':
    case 'sodio':
    case 'sódio (mg)':
    case 'sodio (mg)':
      return 'sodium';
    case 'potassium':
    case 'potássio':
    case 'potassio':
    case 'potássio (mg)':
    case 'potassio (mg)':
      return 'potassium';
    case 'copper':
    case 'cobre':
    case 'cobre (mg)':
      return 'copper';
    case 'zinc':
    case 'zinco':
    case 'zinco (mg)':
      return 'zinc';
    case 'retinol':
    case 'retinol (mcg)':
      return 'retinol';
    case 're':
    case 're (mcg)':
      return 're';
    case 'rae':
    case 'rae (mcg)':
    case 'rae ':
      return 'rae';
    case 'thiamine':
    case 'tiamina':
    case 'tiamina (mg)':
      return 'thiamine';
    case 'riboflavin':
    case 'riboflavina':
    case 'riboflavina (mg)':
      return 'riboflavin';
    case 'pyridoxine':
    case 'piridoxina':
    case 'piridoxina (mg)':
      return 'pyridoxine';
    case 'niacin':
    case 'niacina':
    case 'niacina (mg)':
      return 'niacin';
    case 'vitamin_c':
    case 'vitaminc':
    case 'vitamina c':
    case 'vitamina_c':
    case 'vitamina c (mg)':
    case 'c':
      return 'vitamin_c';
    case 'saturated_fat':
    case 'saturatedfat':
    case 'saturados':
    case 'saturados (g)':
      return 'saturated_fat';
    case 'monounsaturated_fat':
    case 'monounsaturatedfat':
    case 'monoinsaturados':
    case 'monoinsaturados (g)':
      return 'monounsaturated_fat';
    case 'polyunsaturated_fat':
    case 'polyunsaturatedfat':
    case 'poliinsaturados':
    case 'poli-insaturados':
    case 'poli-insaturados (g)':
      return 'polyunsaturated_fat';
    default:
      return clean;
  }
};

export const CsvImportModal = ({
  isOpen,
  onClose,
  onSuccess,
  service,
  columns,
  templateRow,
  title,
  maxNameLength = 500,
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const { user } = useSelector((state) => state.auth);
  const { activeTenant, tenantsList, loading: tenantsLoading } = useSelector((state) => state.tenant);
  const isSysAdmin = user?.role === ROLES.SYS_ADMIN;

  const [fileState, setFileState] = useState(emptyFileState);
  const [page, setPage] = useState(1);
  const [tenantId, setTenantId] = useState('');
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [serverErrors, setServerErrors] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setFileState(emptyFileState);
    setPage(1);
    setDragging(false);
    setImporting(false);
    setRequestError('');
    setServerErrors([]);
    setResult(null);
    setTenantId(isSysAdmin && activeTenant?.id ? String(activeTenant.id) : '');
  }, [activeTenant?.id, isOpen, isSysAdmin]);

  useEffect(() => {
    if (isOpen && isSysAdmin && tenantsList.length === 0) dispatch(fetchTenants());
  }, [dispatch, isOpen, isSysAdmin, tenantsList.length]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !importing) onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [importing, isOpen, onClose]);

  const requiredHeaders = useMemo(
    () => columns.filter((column) => column.required !== false).map((column) => column.key),
    [columns],
  );
  const knownHeaders = useMemo(() => columns.map((column) => column.key), [columns]);

  const headerErrors = useMemo(() => {
    if (fileState.headers.length === 0) return [];
    const errors = [];
    const seen = new Set();
    fileState.headers.forEach((rawHeader) => {
      const canonical = canonicalHeader(rawHeader);
      if (seen.has(canonical)) errors.push(t('csvImport.duplicateHeader', { header: rawHeader }));
      seen.add(canonical);
      if (!knownHeaders.includes(canonical)) errors.push(t('csvImport.unknownHeader', { header: rawHeader }));
    });
    requiredHeaders.forEach((required) => {
      if (!seen.has(required)) errors.push(t('csvImport.missingHeader', { header: required }));
    });
    return errors;
  }, [fileState.headers, knownHeaders, requiredHeaders, t]);

  const validation = useMemo(() => {
    const errors = [];
    const names = new Map();
    fileState.rows.forEach((row, rowIndex) => {
      const name = String(row.name ?? '').trim();
      if (!name) {
        errors.push({ rowIndex, row: rowIndex + 2, column: 'name', message: t('csvImport.nameRequired') });
      } else if ([...name].length > maxNameLength) {
        errors.push({ rowIndex, row: rowIndex + 2, column: 'name', message: t('csvImport.nameTooLong', { max: maxNameLength }) });
      } else {
        const normalized = name.toLocaleLowerCase();
        if (names.has(normalized)) {
          const firstIndex = names.get(normalized);
          errors.push({ rowIndex: firstIndex, row: firstIndex + 2, column: 'name', message: t('csvImport.duplicateName', { row: rowIndex + 2 }) });
          errors.push({ rowIndex, row: rowIndex + 2, column: 'name', message: t('csvImport.duplicateName', { row: firstIndex + 2 }) });
        } else {
          names.set(normalized, rowIndex);
        }
      }

      columns.filter((column) => column.type === 'number').forEach((column) => {
        const raw = String(row[column.key] ?? '').trim();
        const isOptional = column.required === false;
        if (!raw) {
          if (!isOptional) {
            errors.push({ rowIndex, row: rowIndex + 2, column: column.key, message: t('csvImport.invalidNumber') });
          }
          return;
        }
        if (raw.toLowerCase() === 'tr' || raw.toLowerCase() === 'traço' || raw.toLowerCase() === 'traços' || raw.toLowerCase() === 'na' || raw.toLowerCase() === 'n/a' || raw === '*') {
          return;
        }
        const numeric = Number(raw.replace(',', '.'));
        if (!Number.isFinite(numeric) || numeric < 0) {
          errors.push({ rowIndex, row: rowIndex + 2, column: column.key, message: t('csvImport.invalidNumber') });
        }
      });
    });
    return errors;
  }, [columns, fileState.rows, maxNameLength, t]);

  const allCellErrors = useMemo(() => {
    const map = new Map();
    [...validation, ...serverErrors].forEach((error) => {
      const rowIndex = error.rowIndex ?? (error.row ? error.row - 2 : -1);
      if (rowIndex < 0) return;
      const key = errorKey(rowIndex, error.column);
      if (!map.has(key)) map.set(key, error.message);
    });
    return map;
  }, [serverErrors, validation]);

  const totalPages = Math.max(1, Math.ceil(fileState.rows.length / PAGE_SIZE));
  const visibleRows = fileState.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const canImport = fileState.rows.length > 0
    && fileState.rows.length <= MAX_ROWS
    && fileState.size <= MAX_FILE_SIZE
    && headerErrors.length === 0
    && fileState.parsingErrors.length === 0
    && validation.length === 0
    && (!isSysAdmin || Boolean(tenantId));

  const parseFile = (file) => {
    setRequestError('');
    setServerErrors([]);
    setResult(null);
    setPage(1);
    if (!file || (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv')) {
      setFileState({ ...emptyFileState, parsingErrors: [t('csvImport.csvOnly')] });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileState({ ...emptyFileState, name: file.name, size: file.size, parsingErrors: [t('csvImport.fileTooLarge')] });
      return;
    }

    Papa.parse(file, {
      header: true,
      delimiter: requiredHeaders.length === 1 ? ',' : '',
      skipEmptyLines: 'greedy',
      transformHeader: (header, index) => index === 0 ? header.replace(/^\uFEFF/, '') : header,
      complete: ({ data, errors, meta }) => {
        const rawHeaders = meta.fields || [];
        const headerMapping = {};
        rawHeaders.forEach((raw) => {
          headerMapping[canonicalHeader(raw)] = raw;
        });

        const rows = data.map((row) => {
          const rowData = {};
          columns.forEach((col) => {
            const rawField = headerMapping[col.key];
            const val = rawField !== undefined && row[rawField] !== undefined
              ? row[rawField]
              : (row[col.key] ?? '');
            rowData[col.key] = val;
          });
          return rowData;
        });

        const parsingErrors = errors.map((error) => t('csvImport.parseError', { row: (error.row ?? 0) + 2, message: error.message }));
        if (data.length > MAX_ROWS) parsingErrors.push(t('csvImport.tooManyRows', { max: MAX_ROWS }));
        if (data.length === 0) parsingErrors.push(t('csvImport.noRows'));
        setFileState({
          name: file.name,
          size: file.size,
          headers: rawHeaders,
          rows,
          parsingErrors,
        });
      },
      error: (error) => {
        setFileState({ ...emptyFileState, name: file.name, size: file.size, parsingErrors: [error.message] });
      },
    });
  };

  const updateCell = (rowIndex, column, value) => {
    setFileState((current) => ({
      ...current,
      rows: current.rows.map((row, index) => index === rowIndex ? { ...row, [column]: value } : row),
    }));
    setServerErrors([]);
    setRequestError('');
  };

  const handleImport = async () => {
    if (!canImport || importing) return;
    setImporting(true);
    setRequestError('');
    setServerErrors([]);
    try {
      const allFields = columns.map((column) => column.key);
      const csvText = Papa.unparse({ fields: allFields, data: fileState.rows }, { newline: '\n' });
      if (new Blob([csvText]).size > MAX_FILE_SIZE) {
        setRequestError(t('csvImport.editedFileTooLarge'));
        return;
      }
      const uploadFile = new File([csvText], fileState.name || 'import.csv', { type: 'text/csv;charset=utf-8' });
      const response = await service.importCsv(uploadFile, isSysAdmin ? Number(tenantId) : undefined);
      setResult(response);
      onSuccess?.(response);
    } catch (error) {
      const payload = error?.response?.data;
      const mapped = Array.isArray(payload?.errors)
        ? payload.errors.map((item) => ({ ...item, rowIndex: item.row ? item.row - 2 : -1 }))
        : [];
      setServerErrors(mapped);
      setRequestError(payload?.message || t('csvImport.requestFailed'));
      if (mapped[0]?.rowIndex >= 0) setPage(Math.floor(mapped[0].rowIndex / PAGE_SIZE) + 1);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const allFields = columns.map((column) => column.key);
    const text = Papa.unparse({ fields: allFields, data: [templateRow] }, { newline: '\n' });
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${allFields.length > 1 ? 'ingredients' : 'catalog'}-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop csv-import-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !importing) onClose();
    }}>
      <div className="modal-content csv-import-modal" role="dialog" aria-modal="true" aria-labelledby="csv-import-title">
        <div className="modal-header">
          <div>
            <h3 id="csv-import-title" className="modal-title">{title}</h3>
            <p className="csv-import-subtitle">{t('csvImport.subtitle')}</p>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose} disabled={importing} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        {result ? (
          <div className="csv-import-result">
            <CheckCircle2 size={48} />
            <h4>{t('csvImport.successTitle')}</h4>
            <p>{t('csvImport.successMessage')}</p>
            <div className="csv-result-counts">
              <span><strong>{result.total}</strong>{t('csvImport.total')}</span>
              <span><strong>{result.created}</strong>{t('csvImport.created')}</span>
              <span><strong>{result.updated}</strong>{t('csvImport.updated')}</span>
            </div>
            <button type="button" className="btn-modal-submit" onClick={onClose}>{t('common.close')}</button>
          </div>
        ) : (
          <>
            <div className="csv-import-toolbar">
              <div
                className={`csv-drop-zone${dragging ? ' is-dragging' : ''}`}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  parseFile(event.dataTransfer.files?.[0]);
                }}
              >
                <FileSpreadsheet size={28} />
                <div>
                  <strong>{fileState.name || t('csvImport.chooseFile')}</strong>
                  <span>{fileState.name ? formatBytes(fileState.size) : t('csvImport.dropHint')}</span>
                </div>
                <button type="button" className="btn-action-outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                  <Upload size={16} /> {t('csvImport.browse')}
                </button>
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => parseFile(event.target.files?.[0])} />
              </div>
              <button type="button" className="btn-action-outline csv-template-button" onClick={downloadTemplate}>
                <Download size={16} /> {t('csvImport.downloadTemplate')}
              </button>
            </div>

            {isSysAdmin && (
              <label className="csv-tenant-field">
                <span>{t('csvImport.targetTenant')}</span>
                <select value={tenantId} onChange={(event) => setTenantId(event.target.value)} disabled={importing || tenantsLoading}>
                  <option value="">{t('csvImport.selectTenant')}</option>
                  {tenantsList.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
                </select>
              </label>
            )}

            {(headerErrors.length > 0 || fileState.parsingErrors.length > 0 || requestError) && (
              <div className="csv-import-alert">
                <AlertCircle size={18} />
                <div>
                  {requestError && <strong>{requestError}</strong>}
                  {[...fileState.parsingErrors, ...headerErrors].map((message, index) => <p key={`${message}-${index}`}>{message}</p>)}
                </div>
              </div>
            )}

            {fileState.rows.length > 0 && (
              <div className="csv-preview-section">
                <div className="csv-preview-summary">
                  <span>{t('csvImport.rowCount', { count: fileState.rows.length })}</span>
                  <span className={validation.length || serverErrors.length ? 'has-errors' : 'is-valid'}>
                    {validation.length + serverErrors.length
                      ? t('csvImport.errorCount', { count: validation.length + serverErrors.length })
                      : t('csvImport.ready')}
                  </span>
                </div>
                <div className="csv-preview-table-wrapper">
                  <table className="csv-preview-table">
                    <thead><tr><th>#</th>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
                    <tbody>
                      {visibleRows.map((row, visibleIndex) => {
                        const rowIndex = (page - 1) * PAGE_SIZE + visibleIndex;
                        return (
                          <tr key={rowIndex}>
                            <td>{rowIndex + 2}</td>
                            {columns.map((column) => {
                              const message = allCellErrors.get(errorKey(rowIndex, column.key));
                              return (
                                <td key={column.key}>
                                  <input
                                    type={column.type === 'number' ? 'number' : 'text'}
                                    min={column.type === 'number' ? 0 : undefined}
                                    step={column.type === 'number' ? 'any' : undefined}
                                    value={row[column.key] ?? ''}
                                    onChange={(event) => updateCell(rowIndex, column.key, event.target.value)}
                                    className={message ? 'has-error' : ''}
                                    title={message || ''}
                                    disabled={importing}
                                  />
                                  {message && <small>{message}</small>}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="csv-pagination">
                  <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1 || importing}><ChevronLeft size={16} /></button>
                  <span>{t('csvImport.page', { page, total: totalPages })}</span>
                  <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages || importing}><ChevronRight size={16} /></button>
                </div>
              </div>
            )}

            <div className="modal-footer csv-import-footer">
              <button type="button" className="btn-modal-cancel" onClick={onClose} disabled={importing}>{t('common.cancel')}</button>
              <button type="button" className="btn-modal-submit" onClick={handleImport} disabled={!canImport || importing}>
                {importing ? <><LoaderCircle size={17} className="spin-icon" /> {t('csvImport.importing')}</> : <><Upload size={17} /> {t('csvImport.import')}</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
