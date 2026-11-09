import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { Building, Loader2, MapPin, Save, X } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { SectionCard } from '../../components/molecules/SectionCard';
import { Button } from '../../components/atoms/Button';
import { TextField } from '../../components/atoms/TextField';
import { FilterableMultiSelect } from '../../components/common/FilterableMultiSelect';
import { clearTenantError, createTenant, fetchTenants, updateTenant } from '../../store/tenantSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useAddressOptions } from '../../hooks/useAddressOptions';
import { PATHS } from '../../router/routeConfig';
import { maskPhone, maskPostalCode, maskTaxId } from '../../utils/format';
import { isValidTaxId } from '../../utils/taxId';
import { emptyTenantForm, tenantToForm, toTenantPayload, type TenantFormValues } from '../../utils/tenantForm';

const COUNTRIES = [
  { code: 'BR', flag: '🇧🇷', labelKey: 'tenants.brazil' },
  { code: 'US', flag: '🇺🇸', labelKey: 'tenants.unitedStates' },
];

interface FormProps {
  defaults: TenantFormValues;
  editing: boolean;
  onSubmit: (values: TenantFormValues) => void;
}

// O formulário só monta com os dados prontos: assim os valores iniciais nunca sobrescrevem o que o usuário digitou.
const TenantForm = ({ defaults, editing, onSubmit }: FormProps) => {
  const { t } = useTranslation();
  const { loading, error } = useAppSelector((state) => state.tenant);

  const schema = useMemo(() => yup.object({
    name: yup.string().trim().required(t('tenants.nameRequired')),
    taxId: yup.string().test('tax-id', t('tenants.taxIdInvalid'), (value) => !value?.trim() || isValidTaxId(value)),
  }), [t]);
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<TenantFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: defaults,
  });
  const countryCode = watch('countryCode');
  const province = watch('administrativeArea');
  const { provinces, cities, loadingProvinces, loadingCities } = useAddressOptions(countryCode, province);

  const masked = (name: 'taxId' | 'phone' | 'postalCode', mask: (value: unknown) => string) =>
    register(name, { onChange: (event) => { event.target.value = mask(event.target.value); } });

  const chooseCountry = (code: string) => {
    setValue('countryCode', code);
    setValue('administrativeArea', '');
    setValue('locality', '');
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {error !== null && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{error || t('tenants.saveError')}</div>}

      <SectionCard title={t('tenants.clinicDetails')} icon={<Building size={18} />}>
        <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-[minmax(180px,1fr)_minmax(240px,2fr)]">
          <TextField id="tenant-tax" label={t('tenants.taxId')} inputMode="numeric" autoComplete="off" placeholder="00.000.000/0000-00" error={errors.taxId?.message} {...masked('taxId', maskTaxId)} />
          <TextField id="tenant-name" label={t('tenants.clinicName')} error={errors.name?.message} {...register('name')} />
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextField id="tenant-email" type="email" label={t('common.email')} {...register('email')} />
          <TextField id="tenant-phone" type="tel" inputMode="tel" label={t('tenants.phone')} placeholder="(00) 00000-0000" {...masked('phone', maskPhone)} />
        </div>
      </SectionCard>

      <SectionCard title={t('tenants.location')} icon={<MapPin size={18} />}>
        <div role="radiogroup" aria-label={t('address.countryCode')} className="mb-5 flex flex-wrap gap-3">
          {COUNTRIES.map((country) => (
            <label key={country.code} className={`flex min-w-[180px] cursor-pointer items-center gap-[10px] rounded-xl border px-4 py-3 hover:border-[var(--accent-primary)] ${countryCode === country.code ? 'border-[var(--accent-primary)] bg-blue-50' : 'border-[var(--border-color)] bg-white'}`}>
              <input type="radio" name="countryCode" value={country.code} checked={countryCode === country.code} onChange={() => chooseCountry(country.code)} />
              <span aria-hidden="true" className="text-2xl leading-none">{country.flag}</span>
              <span className="font-semibold text-[var(--text-heading)]">{t(country.labelKey)}</span>
            </label>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <TextField id="tenant-address1" label={t('address.addressLine1')} {...register('addressLine1')} />
          <TextField id="tenant-address2" label={t('address.addressLine2')} {...register('addressLine2')} />
          <TextField id="tenant-postal" label={t('address.postalCode')} inputMode="numeric" placeholder="00000-000" {...masked('postalCode', maskPostalCode)} />
          <Controller name="administrativeArea" control={control} render={({ field }) => (
            <FilterableMultiSelect
              label={t('address.administrativeArea')} icon={MapPin} iconColor="var(--accent-primary)" isSingleSelect
              options={provinces.map((item) => ({ id: item.acronym, name: `${item.acronym} - ${item.name}` }))}
              selectedIds={field.value ? [field.value] : []} onChange={(ids) => { field.onChange(ids[0] || ''); setValue('locality', ''); }}
              placeholder={loadingProvinces ? t('tenants.loadingProvinces') : t('address.selectProvince')} emptyMessage={t('customerForm.noStateFound')} disabled={loadingProvinces}
            />
          )} />
          <Controller name="locality" control={control} render={({ field }) => (
            <FilterableMultiSelect
              label={t('address.locality')} icon={MapPin} iconColor="var(--accent-primary)" isSingleSelect
              options={cities.map((item) => ({ id: item.name, name: item.name }))}
              selectedIds={field.value ? [field.value] : []} onChange={(ids) => field.onChange(ids[0] || '')}
              placeholder={loadingCities ? t('tenants.loadingCities') : t('address.selectCity')} emptyMessage={t('customerForm.noCityFound')} disabled={!province || loadingCities}
            />
          )} />
        </div>
      </SectionCard>

      <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4">
        <Button variant="outline" to={PATHS.TENANTS}><X size={16} />{t('common.cancel')}</Button>
        <Button type="submit" disabled={loading}><Save size={18} />{loading ? t('tenants.saving') : editing ? t('common.saveChanges') : t('tenants.createTenant')}</Button>
      </div>
    </form>
  );
};

export const TenantFormPage = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const tenantId = id ? Number(id) : undefined;
  const editing = tenantId !== undefined;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { tenantsList, loading, error } = useAppSelector((state) => state.tenant);
  const [loaded, setLoaded] = useState(false);

  const load = () => { dispatch(fetchTenants()).then(() => setLoaded(true)); };
  useEffect(() => {
    dispatch(clearTenantError());
    dispatch(fetchTenants()).then(() => setLoaded(true));
  }, [dispatch]);

  const current = editing ? tenantsList.find((tenant) => tenant.id === tenantId) : undefined;
  const languageCountry = i18n.resolvedLanguage?.startsWith('en') ? 'US' : 'BR';

  const save = async (values: TenantFormValues) => {
    const tenantData = toTenantPayload(values);
    const saved = editing
      ? updateTenant.fulfilled.match(await dispatch(updateTenant({ id: tenantId, tenantData })))
      : createTenant.fulfilled.match(await dispatch(createTenant(tenantData)));
    if (saved) navigate(PATHS.TENANTS);
  };

  const title = editing ? t('tenants.editTenant') : t('tenants.registerNewTenant');
  const notFound = editing && loaded && !loading && !current;
  const loadFailed = loaded && !loading && error !== null && tenantsList.length === 0;
  const ready = loaded && !loading && !loadFailed && !notFound;

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-14">
      <Breadcrumb items={[{ label: t('tenants.title'), to: PATHS.TENANTS }, { label: title }]} />
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-[var(--border-color)] pb-4">
        <h2 className="m-0 text-[1.6rem] font-medium text-[var(--text-heading)]">{title}</h2>
        <p className="m-0 text-[.9rem] text-[var(--text-body)]">{editing ? t('tenants.editSubtitle') : t('tenants.registerSubtitle')}</p>
      </header>

      {!loaded && <p role="status" className="flex items-center gap-2 text-[var(--text-body)]"><Loader2 size={18} className="animate-spin" />{t('common.loading')}</p>}
      {loadFailed && <ErrorAlert message={error || t('tenants.errorLoadingTenants')} onRetry={load} />}
      {notFound && <ErrorAlert message={t('tenants.noTenantsFound')} onRetry={load} />}
      {ready && <TenantForm key={current?.id ?? 'new'} editing={editing} defaults={current ? tenantToForm(current, languageCountry) : emptyTenantForm(languageCountry)} onSubmit={save} />}
    </div>
  );
};
