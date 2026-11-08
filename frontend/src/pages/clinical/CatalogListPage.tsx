import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Plus, RefreshCw, Upload } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { Button } from '../../components/atoms/Button';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { SearchBox } from '../../components/molecules/SearchBox';
import { CsvImportModal } from '../../components/common/CsvImportModal';
import { editPath, newPath, type CatalogConfig } from '../../config/catalogs';
import { fetchCatalog } from '../../store/catalogSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { CatalogItem } from '../../types/catalog';

const NO_ITEMS: CatalogItem[] = [];

export const CatalogListPage = ({ catalog }: { catalog: CatalogConfig }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { key, i18nKey, icon: Icon } = catalog;
  const items = useAppSelector((state) => state.catalog.items[key]) ?? NO_ITEMS;
  const loading = useAppSelector((state) => state.catalog.loading[key]) ?? false;
  const error = useAppSelector((state) => state.catalog.error[key]) ?? null;
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const load = () => { dispatch(fetchCatalog(key)); };
  useEffect(() => { dispatch(fetchCatalog(key)); }, [dispatch, key]);

  const title = t(`clinical.${i18nKey}.title`);
  const entityName = t(`clinical.${i18nKey}.entityName`);
  const visible = items.filter((item) => (item.name || '').toLowerCase().includes(search.toLowerCase()));
  const importButton = (
    <Button variant="outline" onClick={() => setImportOpen(true)}><Upload size={16} />{t('csvImport.button')}</Button>
  );

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: title }]} />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">{title}</h2>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t(`clinical.${i18nKey}.subtitle`)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {catalog.importEnabled && importButton}
          <Button variant="outline" onClick={load} disabled={loading} title={t('common.refreshList')}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{t('common.refresh')}
          </Button>
          <Button to={newPath(catalog)}><Plus size={18} />{t('entities.addEntity', { entity: entityName })}</Button>
        </div>
      </header>

      <SearchBox value={search} onChange={setSearch} placeholder={t('common.searchByName')} />

      {error && <ErrorAlert message={error} onRetry={load} />}

      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-white">
        {loading && items.length === 0 ? (
          <p role="status" className="flex items-center justify-center gap-2 p-10 text-[var(--text-body)]">
            <RefreshCw size={22} className="animate-spin" />{t('entities.loadingRecords')}
          </p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center text-[var(--text-body)]">
            <Icon size={36} />
            <p className="m-0">{t('entities.noRecordFound', { entity: entityName.toLowerCase() })}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button to={newPath(catalog)}><Plus size={16} />{t('entities.registerFirst')}</Button>
              {catalog.importEnabled && importButton}
            </div>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-slate-50 text-[.8rem] text-[var(--text-body)]">
                <th className="px-4 py-3">{t('common.id')}</th>
                <th className="px-4 py-3">{t('entities.recordName')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  <td className="w-20 px-4 py-3 font-semibold text-slate-500">#{item.id}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-[10px] font-medium"><Icon size={16} className="text-[var(--accent-primary)]" />{item.name}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" to={editPath(catalog, item.id)} title={t('entities.editRecord')}><Edit2 size={16} />{t('common.edit')}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {catalog.importEnabled && (
        <CsvImportModal
          isOpen={importOpen}
          onClose={() => setImportOpen(false)}
          onSuccess={load}
          target={catalog.key}
          title={t('csvImport.title', { entity: entityName })}
          columns={[{ key: 'name', label: t('entities.recordName'), type: 'text' }]}
          templateRow={{ name: t('csvImport.catalogExample') }}
        />
      )}
    </div>
  );
};
