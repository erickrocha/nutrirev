import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Apple, Edit2, Eye, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { Pagination } from '../../components/molecules/Pagination';
import { SearchBox } from '../../components/molecules/SearchBox';
import { Button } from '../../components/atoms/Button';
import { CsvImportModal } from '../../components/common/CsvImportModal';
import { IngredientDetailsModal } from '../../components/organisms/IngredientDetailsModal';
import { MACRO_FIELDS, ingredientCsvColumns } from '../../config/ingredientFields';
import { deleteIngredient, searchIngredientPage } from '../../store/ingredientCatalogSlice';
import { fetchTenants } from '../../store/tenantSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { PATHS, editPath, newPath } from '../../router/routeConfig';
import { ROLES } from '../../utils/enums';
import type { Ingredient } from '../../types/ingredient';

const PAGE_SIZES = [10, 20, 50];
const SEARCH_DELAY_MS = 300;
const TEMPLATE_ROW = { kcal: 110, protein: 8, carbs: 20, fat: 1, fiber: 5, taco_id: 1, moisture: 70.1, calcium: 5.2, iron: 0.26, sodium: 1.2, vitamin_c: 0 };

export const IngredientListPage = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'pt';
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const tenantsList = useAppSelector((state) => state.tenant.tenantsList);
  const { items, total, loading, saving, error } = useAppSelector((state) => state.ingredientCatalog);
  const isSysAdmin = user?.role === ROLES.SYS_ADMIN;

  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [importOpen, setImportOpen] = useState(false);
  const [viewing, setViewing] = useState<Ingredient | null>(null);
  const [deleting, setDeleting] = useState<Ingredient | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const load = () => { dispatch(searchIngredientPage({ q: query, lang, page, pageSize })); };
  useEffect(() => { dispatch(searchIngredientPage({ q: query, lang, page, pageSize })); }, [dispatch, query, lang, page, pageSize]);
  useEffect(() => { setPage((current) => Math.min(current, totalPages)); }, [totalPages]);
  useEffect(() => { if (isSysAdmin && tenantsList.length === 0) dispatch(fetchTenants()); }, [dispatch, isSysAdmin, tenantsList.length]);

  const csvColumns = useMemo(() => ingredientCsvColumns(t), [t]);
  const displayName = (item: Ingredient) => (lang === 'en' && item.nameEn ? item.nameEn : item.name);
  // Catálogo global (TACO, sem clínica): só leitura para as clínicas.
  const canEdit = (item: Ingredient) => isSysAdmin || Boolean(item.tenantId);

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await dispatch(deleteIngredient(deleting.id));
    setDeleteFailed(!deleteIngredient.fulfilled.match(result));
    if (deleteIngredient.fulfilled.match(result)) { setDeleting(null); load(); }
  };

  const message = error === null ? null : error || (deleteFailed ? t('ingredients.deleteError') : t('ingredients.loadError'));
  const importButton = <Button variant="outline" onClick={() => setImportOpen(true)}><Upload size={16} />{t('csvImport.button')}</Button>;

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: t('ingredients.title') }]} />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">{t('ingredients.title')}</h2>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('ingredients.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{t('common.refresh')}</Button>
          {importButton}
          <Button to={newPath(PATHS.INGREDIENTS)}><Plus size={18} />{t('ingredients.add')}</Button>
        </div>
      </header>

      <SearchBox value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder={t('common.searchByName')} />
      {message !== null && <ErrorAlert message={message} onRetry={load} />}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)] bg-white">
        {loading && items.length === 0 ? (
          <p role="status" className="flex items-center justify-center gap-2 p-10 text-[var(--text-body)]"><RefreshCw size={22} className="animate-spin" />{t('entities.loadingRecords')}</p>
        ) : total === 0 && !loading ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center text-[var(--text-body)]">
            <Apple size={36} />
            <p className="m-0">{t('ingredients.empty')}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button to={newPath(PATHS.INGREDIENTS)}><Plus size={16} />{t('entities.registerFirst')}</Button>
              {importButton}
            </div>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-slate-50 text-[.8rem] text-[var(--text-body)]">
                <th className="px-4 py-3">{t('common.id')}</th>
                <th className="px-4 py-3">{t('common.name')}</th>
                {MACRO_FIELDS.map((field) => <th key={field} className="px-3 py-3">{t(`ingredients.${field}`)}</th>)}
                {isSysAdmin && <th className="px-4 py-3">{t('csvImport.targetTenant')}</th>}
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  <td className="w-16 px-4 py-3 font-semibold text-slate-500">#{item.id}</td>
                  <td className="px-4 py-3"><span className="flex items-center gap-[10px] font-medium"><Apple size={16} className="shrink-0 text-[var(--accent-primary)]" />{displayName(item)}</span></td>
                  {MACRO_FIELDS.map((field) => <td key={field} className="px-3 py-3">{Number(item[field] || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>)}
                  {isSysAdmin && <td className="px-4 py-3">{tenantsList.find((tenant) => tenant.id === item.tenantId)?.name || item.tenantId || '—'}</td>}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setViewing(item)} title={t('ingredients.viewDetails')}><Eye size={15} />{t('common.view')}</Button>
                      {canEdit(item) && (
                        <>
                          <Button variant="outline" to={editPath(PATHS.INGREDIENTS, item.id)} title={t('common.edit')}><Edit2 size={15} />{t('common.edit')}</Button>
                          <Button variant="outline" onClick={() => { setDeleteFailed(false); setDeleting(item); }} aria-label={t('common.delete')} title={t('common.delete')}><Trash2 size={15} /></Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 0 && (
        <Pagination
          page={page} totalPages={totalPages} total={total} label={t('ingredients.entityName')} pageSize={pageSize} pageSizeOptions={PAGE_SIZES}
          onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }}
        />
      )}

      {viewing && (
        <IngredientDetailsModal
          ingredient={viewing} displayName={displayName(viewing)} onClose={() => setViewing(null)}
          editTo={canEdit(viewing) ? editPath(PATHS.INGREDIENTS, viewing.id) : undefined}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={t('ingredients.deleteTitle')} message={t('ingredients.deleteMessage', { name: displayName(deleting) })}
          confirmLabel={t('common.delete')} busy={saving} onConfirm={confirmDelete} onCancel={() => setDeleting(null)}
        />
      )}
      <CsvImportModal
        isOpen={importOpen} onClose={() => setImportOpen(false)} onSuccess={load} target="ingredient"
        title={t('csvImport.title', { entity: t('ingredients.entityName') })} columns={csvColumns}
        templateRow={{ name: t('ingredients.example'), ...TEMPLATE_ROW }} maxNameLength={255}
      />
    </div>
  );
};
