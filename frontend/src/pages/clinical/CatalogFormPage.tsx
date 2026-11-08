import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2, RefreshCw, Save, X } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { FormCard } from '../../components/molecules/FormCard';
import { Button } from '../../components/atoms/Button';
import { TextField } from '../../components/atoms/TextField';
import type { CatalogConfig } from '../../config/catalogs';
import { clearCatalogError, fetchCatalog, saveCatalogItem } from '../../store/catalogSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { CatalogItem } from '../../types/catalog';

interface Values { name: string }

const NO_ITEMS: CatalogItem[] = [];

export const CatalogFormPage = ({ catalog }: { catalog: CatalogConfig }) => {
  const { t } = useTranslation();
  const { id } = useParams();
  const itemId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { key, i18nKey, icon: Icon } = catalog;
  const items = useAppSelector((state) => state.catalog.items[key]);
  const loading = useAppSelector((state) => state.catalog.loading[key]) ?? false;
  const saving = useAppSelector((state) => state.catalog.saving);
  const error = useAppSelector((state) => state.catalog.error[key]) ?? null;
  const [loaded, setLoaded] = useState(false);

  const load = () => { dispatch(fetchCatalog(key)).then(() => setLoaded(true)); };
  useEffect(() => {
    dispatch(clearCatalogError(key));
    dispatch(fetchCatalog(key)).then(() => setLoaded(true));
  }, [dispatch, key]);

  const list = items ?? NO_ITEMS;
  const editing = itemId !== undefined;
  const current = editing ? list.find((item) => item.id === itemId) : undefined;
  const entityName = t(`clinical.${i18nKey}.entityName`);
  const title = t(`clinical.${i18nKey}.title`);
  const formTitle = editing ? t('entities.editEntity', { entity: entityName }) : t('entities.addEntity', { entity: entityName });

  const schema = yup.object({ name: yup.string().trim().required(t('csvImport.nameRequired')) });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({
    resolver: yupResolver(schema) as never,
    defaultValues: { name: '' },
  });
  useEffect(() => { if (current) reset({ name: current.name }); }, [current, reset]);

  const save = async ({ name }: Values) => {
    const result = await dispatch(saveCatalogItem({ key, id: itemId, name: name.trim() }));
    if (saveCatalogItem.fulfilled.match(result)) navigate(catalog.path);
  };

  const notFound = editing && loaded && !loading && !current;
  const loadFailed = loaded && !loading && Boolean(error) && items === undefined;

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-14">
      <Breadcrumb items={[{ label: title, to: catalog.path }, { label: formTitle }]} />
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-[var(--border-color)] pb-4">
        <h2 className="m-0 text-[1.6rem] font-medium text-[var(--text-heading)]">{formTitle}</h2>
        <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t(`clinical.${i18nKey}.subtitle`)}</p>
      </header>

      {!loaded && <p role="status" className="flex items-center gap-2 text-[var(--text-body)]"><Loader2 size={18} className="animate-spin" />{t('common.loading')}</p>}

      {(loadFailed || notFound) && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          <span className="flex items-center gap-2"><AlertCircle size={18} />{loadFailed ? error : t('entities.noRecordFound', { entity: entityName.toLowerCase() })}</span>
          <Button variant="outline" onClick={load}><RefreshCw size={16} />{t('common.retry')}</Button>
        </div>
      )}

      {loaded && !loadFailed && !notFound && (
        <form noValidate onSubmit={handleSubmit(save)}>
          <FormCard
            header={<h3 className="m-0 flex items-center gap-2 text-[1.1rem] text-[var(--accent-primary)]"><Icon size={18} />{formTitle}</h3>}
            footer={
              <>
                <Button variant="outline" to={catalog.path}><X size={16} />{t('common.cancel')}</Button>
                <Button type="submit" disabled={saving}>
                  <Save size={18} />{saving ? t('common.saving') : editing ? t('common.saveChanges') : t('common.register')}
                </Button>
              </>
            }
          >
            {error && <div role="alert" className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{error}</div>}
            <TextField
              id="catalog-name" label={t('entities.entityName', { entity: entityName })} autoFocus
              placeholder={t('entities.entityNamePlaceholder', { entity: entityName.toLowerCase() })}
              error={errors.name?.message} {...register('name')}
            />
          </FormCard>
        </form>
      )}
    </div>
  );
};
