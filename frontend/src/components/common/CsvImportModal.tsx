import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Download, FileSpreadsheet, LoaderCircle, Upload, X } from 'lucide-react';
import { Button } from '../atoms/Button';
import { fetchTenants } from '../../store/tenantSlice';
import { clearCsvImportErrors, importCsv, resetCsvImport } from '../../store/csvImportSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { ROLES } from '../../utils/enums';
import {
  MAX_FILE_SIZE, MAX_ROWS, PAGE_SIZE, canonicalHeader, errorKey, formatBytes, validateRows,
  type CsvColumn, type CsvRow,
} from '../../utils/csvImport';

interface FileState {
  name: string;
  size: number;
  headers: string[];
  rows: CsvRow[];
  parsingErrors: string[];
}

const EMPTY_FILE: FileState = { name: '', size: 0, headers: [], rows: [], parsingErrors: [] };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Chave do catálogo (config/catalogs) ou "ingredient". */
  target: string;
  columns: CsvColumn[];
  templateRow: CsvRow;
  title: string;
  maxNameLength?: number;
}

export const CsvImportModal = ({ isOpen, onClose, onSuccess, target, columns, templateRow, title, maxNameLength = 500 }: Props) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAppSelector((state) => state.auth.user);
  const { activeTenant, tenantsList, loading: tenantsLoading } = useAppSelector((state) => state.tenant);
  const { importing, result, error: requestError, serverErrors } = useAppSelector((state) => state.csvImport);
  const isSysAdmin = user?.role === ROLES.SYS_ADMIN;

  const [fileState, setFileState] = useState<FileState>(EMPTY_FILE);
  const [page, setPage] = useState(1);
  const [tenantId, setTenantId] = useState('');
  const [dragging, setDragging] = useState(false);
  const [editTooLarge, setEditTooLarge] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    dispatch(resetCsvImport());
    setFileState(EMPTY_FILE);
    setPage(1);
    setDragging(false);
    setEditTooLarge(false);
    setTenantId(isSysAdmin && activeTenant?.id ? String(activeTenant.id) : '');
  }, [activeTenant?.id, dispatch, isOpen, isSysAdmin]);

  useEffect(() => {
    if (isOpen && isSysAdmin && tenantsList.length === 0) dispatch(fetchTenants());
  }, [dispatch, isOpen, isSysAdmin, tenantsList.length]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !importing) onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [importing, isOpen, onClose]);

  const requiredHeaders = useMemo(() => columns.filter((c) => c.required !== false).map((c) => c.key), [columns]);
  const knownHeaders = useMemo(() => columns.map((c) => c.key), [columns]);

  const headerErrors = useMemo(() => {
    if (fileState.headers.length === 0) return [];
    const errors: string[] = [];
    const seen = new Set<string>();
    fileState.headers.forEach((rawHeader) => {
      const canonical = canonicalHeader(rawHeader);
      if (seen.has(canonical)) errors.push(t('csvImport.duplicateHeader', { header: rawHeader }));
      seen.add(canonical);
      if (!knownHeaders.includes(canonical)) errors.push(t('csvImport.unknownHeader', { header: rawHeader }));
    });
    requiredHeaders.filter((required) => !seen.has(required)).forEach((required) => errors.push(t('csvImport.missingHeader', { header: required })));
    return errors;
  }, [fileState.headers, knownHeaders, requiredHeaders, t]);

  const validation = useMemo(() => validateRows(fileState.rows, columns, maxNameLength, t), [columns, fileState.rows, maxNameLength, t]);

  const cellErrors = useMemo(() => {
    const map = new Map<string, string>();
    const all = [...validation, ...serverErrors.map((error) => ({ ...error, column: error.column ?? '' }))];
    all.forEach((error) => {
      const rowIndex = error.row ? error.row - 2 : -1;
      if (rowIndex < 0) return;
      const key = errorKey(rowIndex, error.column);
      if (!map.has(key)) map.set(key, error.message);
    });
    return map;
  }, [serverErrors, validation]);

  const totalPages = Math.max(1, Math.ceil(fileState.rows.length / PAGE_SIZE));
  const visibleRows = fileState.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const canImport = fileState.rows.length > 0 && fileState.rows.length <= MAX_ROWS && fileState.size <= MAX_FILE_SIZE
    && headerErrors.length === 0 && fileState.parsingErrors.length === 0 && validation.length === 0 && (!isSysAdmin || Boolean(tenantId));

  const parseFile = (file?: File | null) => {
    dispatch(clearCsvImportErrors());
    setEditTooLarge(false);
    setPage(1);
    if (!file || (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv')) {
      setFileState({ ...EMPTY_FILE, parsingErrors: [t('csvImport.csvOnly')] });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileState({ ...EMPTY_FILE, name: file.name, size: file.size, parsingErrors: [t('csvImport.fileTooLarge')] });
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      delimiter: requiredHeaders.length === 1 ? ',' : '',
      skipEmptyLines: 'greedy',
      transformHeader: (header, index) => (index === 0 ? header.replace(/^﻿/, '') : header),
      complete: ({ data, errors, meta }) => {
        const rawHeaders = meta.fields ?? [];
        const mapping: Record<string, string> = {};
        rawHeaders.forEach((raw) => { mapping[canonicalHeader(raw)] = raw; });
        const rows = data.map((row) => Object.fromEntries(columns.map((col) => {
          const rawField = mapping[col.key];
          return [col.key, rawField !== undefined && row[rawField] !== undefined ? row[rawField] : (row[col.key] ?? '')];
        })));
        const parsingErrors = errors.map((error) => t('csvImport.parseError', { row: (error.row ?? 0) + 2, message: error.message }));
        if (data.length > MAX_ROWS) parsingErrors.push(t('csvImport.tooManyRows', { max: MAX_ROWS }));
        if (data.length === 0) parsingErrors.push(t('csvImport.noRows'));
        setFileState({ name: file.name, size: file.size, headers: rawHeaders, rows, parsingErrors });
      },
      error: (error: Error) => setFileState({ ...EMPTY_FILE, name: file.name, size: file.size, parsingErrors: [error.message] }),
    });
  };

  const updateCell = (rowIndex: number, column: string, value: string) => {
    setFileState((current) => ({ ...current, rows: current.rows.map((row, index) => (index === rowIndex ? { ...row, [column]: value } : row)) }));
    setEditTooLarge(false);
    dispatch(clearCsvImportErrors());
  };

  const handleImport = async () => {
    if (!canImport || importing) return;
    const csvText = Papa.unparse({ fields: knownHeaders, data: fileState.rows }, { newline: '\n' });
    if (new Blob([csvText]).size > MAX_FILE_SIZE) {
      setEditTooLarge(true);
      return;
    }
    const upload = new File([csvText], fileState.name || 'import.csv', { type: 'text/csv;charset=utf-8' });
    const outcome = await dispatch(importCsv({ target, file: upload, tenantId: isSysAdmin ? Number(tenantId) : undefined }));
    if (importCsv.fulfilled.match(outcome)) onSuccess?.();
    else if (serverErrors[0]) setPage(1);
  };

  const downloadTemplate = () => {
    const text = Papa.unparse({ fields: knownHeaders, data: [templateRow] }, { newline: '\n' });
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${knownHeaders.length > 1 ? 'ingredients' : 'catalog'}-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const alerts = [...fileState.parsingErrors, ...headerErrors];
  const requestMessage = editTooLarge ? t('csvImport.editedFileTooLarge') : requestError !== null ? requestError || t('csvImport.requestFailed') : '';
  const errorTotal = validation.length + serverErrors.length;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-0 sm:p-5"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !importing) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="csv-import-title" className="flex max-h-screen min-h-screen w-full flex-col overflow-y-auto bg-white p-6 sm:max-h-[calc(100vh-40px)] sm:min-h-0 sm:max-w-[1080px] sm:rounded-2xl">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 id="csv-import-title" className="m-0 text-[1.2rem] text-[var(--text-heading)]">{title}</h3>
            <p className="m-0 text-[.88rem] text-[var(--text-body)]">{t('csvImport.subtitle')}</p>
          </div>
          <button type="button" onClick={onClose} disabled={importing} aria-label={t('common.close')} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
            <X size={20} />
          </button>
        </header>

        {result ? (
          <div role="status" className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 size={48} className="text-emerald-600" />
            <h4 className="m-0 text-[1.1rem]">{t('csvImport.successTitle')}</h4>
            <p className="m-0 text-[var(--text-body)]">{t('csvImport.successMessage')}</p>
            <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-3">
              {([['total', result.total], ['created', result.created], ['updated', result.updated]] as const).map(([name, value]) => (
                <span key={name} className="flex flex-col rounded-xl border border-[var(--border-color)] p-3 text-[.85rem] text-[var(--text-body)]">
                  <strong className="text-[1.4rem] text-[var(--text-heading)]">{value}</strong>{t(`csvImport.${name}`)}
                </span>
              ))}
            </div>
            <Button onClick={onClose}>{t('common.close')}</Button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 md:flex-row">
              <div
                className={`grid flex-1 grid-cols-[auto_1fr] items-center gap-3 rounded-xl border-2 border-dashed p-4 sm:grid-cols-[auto_1fr_auto] ${dragging ? 'border-[var(--accent-primary)] bg-blue-50' : 'border-[var(--border-color)]'}`}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => { event.preventDefault(); setDragging(false); parseFile(event.dataTransfer.files?.[0]); }}
              >
                <FileSpreadsheet size={28} className="text-[var(--accent-primary)]" />
                <div className="flex min-w-0 flex-col">
                  <strong className="truncate">{fileState.name || t('csvImport.chooseFile')}</strong>
                  <span className="text-[.8rem] text-[var(--text-body)]">{fileState.name ? formatBytes(fileState.size) : t('csvImport.dropHint')}</span>
                </div>
                <Button variant="outline" className="col-span-2 justify-center sm:col-span-1" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                  <Upload size={16} />{t('csvImport.browse')}
                </Button>
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden aria-label={t('csvImport.chooseFile')} onChange={(event) => parseFile(event.target.files?.[0])} />
              </div>
              <Button variant="outline" className="justify-center" onClick={downloadTemplate}><Download size={16} />{t('csvImport.downloadTemplate')}</Button>
            </div>

            {isSysAdmin && (
              <label className="mb-4 flex flex-col gap-[7px] text-[.8rem] font-semibold text-[var(--text-heading)]">
                <span>{t('csvImport.targetTenant')}</span>
                <select
                  value={tenantId} onChange={(event) => setTenantId(event.target.value)} disabled={importing || tenantsLoading}
                  className="box-border w-full rounded-[9px] border border-[var(--border-color)] bg-white px-3 py-[11px] font-normal hover:border-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">{t('csvImport.selectTenant')}</option>
                  {tenantsList.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
                </select>
              </label>
            )}

            {(alerts.length > 0 || requestMessage) && (
              <div role="alert" className="mb-4 flex gap-3 rounded-lg border border-red-300 bg-red-50 p-3 text-[.88rem] text-red-700">
                <AlertCircle size={18} className="shrink-0" />
                <div>
                  {requestMessage && <strong>{requestMessage}</strong>}
                  {alerts.map((message, index) => <p key={`${message}-${index}`} className="m-0">{message}</p>)}
                </div>
              </div>
            )}

            {fileState.rows.length > 0 && (
              <section className="mb-4 flex flex-col gap-2">
                <div className="flex flex-wrap justify-between gap-2 text-[.85rem]">
                  <span>{t('csvImport.rowCount', { count: fileState.rows.length })}</span>
                  <span className={errorTotal ? 'font-semibold text-red-700' : 'font-semibold text-emerald-700'}>
                    {errorTotal ? t('csvImport.errorCount', { count: errorTotal }) : t('csvImport.ready')}
                  </span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
                  <table className="w-full border-collapse text-left text-[.85rem]">
                    <thead>
                      <tr className="bg-slate-50 text-[var(--text-body)]">
                        <th className="px-3 py-2">#</th>
                        {columns.map((column) => <th key={column.key} className="whitespace-nowrap px-3 py-2">{column.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((row, visibleIndex) => {
                        const rowIndex = (page - 1) * PAGE_SIZE + visibleIndex;
                        return (
                          <tr key={rowIndex} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-500">{rowIndex + 2}</td>
                            {columns.map((column) => {
                              const message = cellErrors.get(errorKey(rowIndex, column.key));
                              return (
                                <td key={column.key} className="px-2 py-1">
                                  <input
                                    type={column.type === 'number' ? 'number' : 'text'} min={column.type === 'number' ? 0 : undefined} step={column.type === 'number' ? 'any' : undefined}
                                    aria-label={`${column.label} ${rowIndex + 2}`} aria-invalid={Boolean(message)} title={message || ''}
                                    value={row[column.key] ?? ''} onChange={(event) => updateCell(rowIndex, column.key, event.target.value)} disabled={importing}
                                    className={`box-border w-full min-w-[110px] rounded-md border px-2 py-[6px] hover:border-[var(--accent-primary)] disabled:opacity-60 ${message ? 'border-red-400 bg-red-50' : 'border-[var(--border-color)]'}`}
                                  />
                                  {message && <small className="block text-[.72rem] text-red-700">{message}</small>}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-center gap-3 text-[.85rem]">
                  <button type="button" aria-label={t('common.previous')} onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1 || importing} className="rounded-md border border-[var(--border-color)] p-1 hover:border-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /></button>
                  <span>{t('csvImport.page', { page, total: totalPages })}</span>
                  <button type="button" aria-label={t('common.next')} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages || importing} className="rounded-md border border-[var(--border-color)] p-1 hover:border-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={16} /></button>
                </div>
              </section>
            )}

            <footer className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--border-color)] pt-4">
              <Button variant="outline" onClick={onClose} disabled={importing}>{t('common.cancel')}</Button>
              <Button onClick={handleImport} disabled={!canImport || importing}>
                {importing ? <><LoaderCircle size={17} className="animate-spin" />{t('csvImport.importing')}</> : <><Upload size={17} />{t('csvImport.import')}</>}
              </Button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
};
