import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { Apple, Flame, Layers, Loader2, Pill, Save, Sparkles, X } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { FormCard } from '../../components/molecules/FormCard';
import { Button } from '../../components/atoms/Button';
import { SelectField } from '../../components/atoms/SelectField';
import { TextField } from '../../components/atoms/TextField';
import {
  MACRO_FIELDS, OPTIONAL_FIELDS, TAB_FIELDS, type IngredientTab,
} from '../../config/ingredientFields';
import { clearCurrentIngredient, clearIngredientError, loadIngredient, saveIngredient } from '../../store/ingredientCatalogSlice';
import { fetchTenants } from '../../store/tenantSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { ROLES } from '../../utils/enums';
import { emptyIngredientForm, ingredientToForm, toIngredientPayload, type IngredientFormValues } from '../../utils/ingredientForm';

const TABS: Array<{ id: IngredientTab; labelKey: string; icon: typeof Flame }> = [
  { id: 'macros', labelKey: 'ingredients.tabMacros', icon: Flame },
  { id: 'minerals', labelKey: 'ingredients.tabMinerals', icon: Sparkles },
  { id: 'vitamins', labelKey: 'ingredients.tabVitamins', icon: Pill },
  { id: 'lipids', labelKey: 'ingredients.tabLipidsOther', icon: Layers },
];

export const IngredientFormPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const ingredientId = id ? Number(id) : undefined;
  const editing = ingredientId !== undefined;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { activeTenant, tenantsList } = useAppSelector((state) => state.tenant);
  const { current, loading, saving, error } = useAppSelector((state) => state.ingredientCatalog);
  const isSysAdmin = user?.role === ROLES.SYS_ADMIN;
  const [tab, setTab] = useState<IngredientTab>('macros');

  const load = () => { if (editing) dispatch(loadIngredient(ingredientId)); };
  useEffect(() => {
    dispatch(clearIngredientError());
    dispatch(clearCurrentIngredient());
    if (ingredientId !== undefined) dispatch(loadIngredient(ingredientId));
  }, [dispatch, ingredientId]);
  useEffect(() => { if (isSysAdmin && tenantsList.length === 0) dispatch(fetchTenants()); }, [dispatch, isSysAdmin, tenantsList.length]);

  const schema = useMemo(() => {
    const required = t('ingredients.fieldRequired');
    const invalid = t('ingredients.numberInvalid');
    const nonNegative = (value?: string) => value === undefined || value.trim() === '' || (Number.isFinite(Number(value)) && Number(value) >= 0);
    const shape: Record<string, yup.AnySchema> = {
      name: yup.string().trim().max(255).required(required),
      tenantId: isSysAdmin ? yup.string().required(required) : yup.string(),
    };
    MACRO_FIELDS.forEach((field) => { shape[field] = yup.string().required(required).test('number', invalid, nonNegative); });
    OPTIONAL_FIELDS.forEach((field) => {
      shape[field] = yup.string().test('number', invalid, nonNegative)
        .test('integer', t('ingredients.tacoIdInvalid'), (value) => field !== 'tacoId' || !value?.trim() || Number.isInteger(Number(value)));
    });
    return yup.object(shape);
  }, [isSysAdmin, t]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<IngredientFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: emptyIngredientForm(),
  });
  useEffect(() => {
    if (editing && current) reset(ingredientToForm(current));
    else if (!editing) reset(emptyIngredientForm(isSysAdmin && activeTenant?.id ? String(activeTenant.id) : ''));
  }, [current, editing, isSysAdmin, activeTenant?.id, reset]);

  const save = async (values: IngredientFormValues) => {
    const result = await dispatch(saveIngredient({ id: ingredientId, payload: toIngredientPayload(values, isSysAdmin) }));
    if (saveIngredient.fulfilled.match(result)) navigate(PATHS.INGREDIENTS);
  };

  const formTitle = editing ? t('ingredients.edit') : t('ingredients.add');
  const waiting = editing && loading && !current;
  const loadFailed = editing && !loading && !current;
  // Mensagem vazia: a API não explicou; usa o texto padrão da tela.
  const errorText = error === null ? null : error || t(editing && !current ? 'ingredients.loadError' : 'ingredients.saveError');
  // Aviso de campos com erro numa aba que não está visível.
  const tabHasError = (id: IngredientTab) => TAB_FIELDS[id].some((field) => errors[field]);

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-14">
      <Breadcrumb items={[{ label: t('ingredients.title'), to: PATHS.INGREDIENTS }, { label: formTitle }]} />
      <header className="mb-6 border-b border-[var(--border-color)] pb-4">
        <h2 className="m-0 text-[1.6rem] font-medium text-[var(--text-heading)]">{formTitle}</h2>
      </header>

      {waiting && <p role="status" className="flex items-center gap-2 text-[var(--text-body)]"><Loader2 size={18} className="animate-spin" />{t('common.loading')}</p>}
      {loadFailed && <ErrorAlert message={errorText ?? t('ingredients.loadError')} onRetry={load} />}

      {!waiting && !loadFailed && (
        <form noValidate onSubmit={handleSubmit(save)}>
          <FormCard
            header={<h3 className="m-0 flex items-center gap-2 text-[1.1rem] text-[var(--accent-primary)]"><Apple size={18} />{formTitle}</h3>}
            footer={
              <>
                <Button variant="outline" to={PATHS.INGREDIENTS}><X size={16} />{t('common.cancel')}</Button>
                <Button type="submit" disabled={saving}><Save size={18} />{saving ? t('common.saving') : t('common.save')}</Button>
              </>
            }
          >
            {errorText && <div role="alert" className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{errorText}</div>}
            <div className="mb-5 flex flex-col gap-4">
              <TextField id="ingredient-name" label={`${t('common.name')} *`} maxLength={255} autoFocus error={errors.name?.message} {...register('name')} />
              {isSysAdmin && (
                <SelectField id="ingredient-tenant" label={t('csvImport.targetTenant')} error={errors.tenantId?.message} {...register('tenantId')}>
                  <option value="">{t('csvImport.selectTenant')}</option>
                  {tenantsList.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
                </SelectField>
              )}
            </div>

            <div role="tablist" className="mb-4 flex flex-wrap gap-2 border-b border-[var(--border-color)]">
              {TABS.map(({ id: tabId, labelKey, icon: Icon }) => (
                <button
                  key={tabId} type="button" role="tab" aria-selected={tab === tabId} onClick={() => setTab(tabId)}
                  className={`-mb-px flex items-center gap-1 border-b-2 px-3 py-2 text-[.85rem] font-semibold hover:text-[var(--accent-primary)] ${tab === tabId ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]' : 'border-transparent text-[var(--text-body)]'} ${tabHasError(tabId) ? 'text-red-700' : ''}`}
                >
                  <Icon size={14} />{t(labelKey)}{tabHasError(tabId) && <span aria-hidden="true"> •</span>}
                </button>
              ))}
            </div>

            {/* Todas as abas ficam montadas: a validação enxerga campos de abas escondidas. */}
            {TABS.map(({ id: tabId }) => (
              <div key={tabId} role="tabpanel" hidden={tab !== tabId} className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {TAB_FIELDS[tabId].map((field) => {
                  const isMacro = (MACRO_FIELDS as readonly string[]).includes(field);
                  return (
                    <TextField
                      key={field} id={`ingredient-${field}`} type="number" min={0} step={field === 'tacoId' ? 1 : 'any'}
                      label={`${t(`ingredients.${field}`)}${isMacro ? ' *' : ''}`} placeholder={isMacro ? undefined : '—'}
                      error={errors[field]?.message} {...register(field)}
                    />
                  );
                })}
              </div>
            ))}
          </FormCard>
        </form>
      )}
    </div>
  );
};
