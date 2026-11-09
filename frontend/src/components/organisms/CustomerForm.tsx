import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { Activity, AlertCircle, CalendarDays, FileText, Heart, MapPin, Save, User, X } from 'lucide-react';
import { Button } from '../atoms/Button';
import { SelectField } from '../atoms/SelectField';
import { TextField } from '../atoms/TextField';
import { FormCard } from '../molecules/FormCard';
import { FilterableMultiSelect } from '../common/FilterableMultiSelect';
import { useAddressOptions } from '../../hooks/useAddressOptions';
import { useAppSelector } from '../../store/hooks';
import { displayPostalCode, maskPhone } from '../../utils/format';
import { toSubmit, type CustomerFormSubmit, type CustomerFormValues } from '../../utils/customerForm';
import type { Customer } from '../../types/customer';

const COUNTRIES = [
  { code: 'BR', flag: '🇧🇷', labelKey: 'tenants.brazil' },
  { code: 'US', flag: '🇺🇸', labelKey: 'tenants.unitedStates' },
];

interface Props {
  customer: Customer | null;
  defaults: CustomerFormValues;
  saving: boolean;
  error: string | null;
  cancelTo: string;
  onSubmit: (submit: CustomerFormSubmit) => void;
}

const SectionTitle = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <h3 className="m-0 mb-5 flex items-center gap-2 border-b border-slate-100 pb-2 text-[1.1rem] text-[var(--accent-primary)]">
    {icon}<span>{children}</span>
  </h3>
);

export const CustomerForm = ({ customer, defaults, saving, error, cancelTo, onSubmit }: Props) => {
  const { t, i18n } = useTranslation();
  const catalogs = useAppSelector((state) => state.customerForm.catalogs);

  const schema = useMemo(() => {
    const required = t('customerForm.requiredFields');
    return yup.object({
      name: yup.string().trim().required(required),
      email: yup.string().trim().email(t('order.errors.email')).required(required),
      phone: yup.string().required(required),
      dateOfBirth: yup.string().required(required),
    });
  }, [t]);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CustomerFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: defaults,
  });

  const countryCode = watch('countryCode');
  const province = watch('province');

  const { provinces, cities, loadingProvinces, loadingCities } = useAddressOptions(countryCode, province);

  const chooseCountry = (code: string) => {
    setValue('countryCode', code);
    setValue('province', '');
    setValue('city', '');
    setValue('postalCode', displayPostalCode(watch('postalCode'), code));
  };

  const isBrazil = countryCode.trim().toUpperCase() === 'BR';
  const lang = i18n.language?.startsWith('en') ? 'en-US' : 'pt-BR';

  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(toSubmit(values)))}>
      <FormCard
        header={<h2 className="m-0 text-[1.1rem]">{customer ? t('customerForm.editPatientFile') : t('customerForm.registerNewPatient')}</h2>}
        footer={
          <>
            <Button variant="outline" to={cancelTo}><X size={16} />{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving}>
              <Save size={18} />{saving ? t('common.saving') : customer ? t('common.saveChanges') : t('customerForm.registerCustomer')}
            </Button>
          </>
        }
      >
        {error && <div role="alert" className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{error}</div>}

        <section className="mb-8 flex flex-col gap-4">
          <SectionTitle icon={<User size={18} />}>{t('customerForm.section1Title')}</SectionTitle>
          <TextField id="customer-name" label={t('customerForm.fullName')} placeholder={t('customerForm.fullNamePlaceholder')} error={errors.name?.message} {...register('name')} />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextField id="customer-email" type="email" label={t('customerForm.emailLabel')} placeholder={t('customerForm.emailPlaceholder')} error={errors.email?.message} {...register('email')} />
            <TextField
              id="customer-phone" type="tel" inputMode="tel" label={t('customerForm.phoneLabel')} placeholder={t('customerForm.phonePlaceholder')} error={errors.phone?.message}
              {...register('phone', { onChange: (event) => { event.target.value = maskPhone(event.target.value); } })}
            />
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextField id="customer-birth" type="date" lang={lang} label={t('customerForm.dateOfBirth')} error={errors.dateOfBirth?.message} {...register('dateOfBirth')} />
            <SelectField id="customer-gender" label={t('customerForm.gender')} {...register('gender')}>
              <option value="Feminino">{t('customerForm.female')}</option>
              <option value="Masculino">{t('customerForm.male')}</option>
              <option value="Outro">{t('customerForm.other')}</option>
            </SelectField>
          </div>

          <div role="radiogroup" aria-label={t('address.countryCode')} className="flex flex-wrap gap-3">
            {COUNTRIES.map((country) => (
              <label
                key={country.code}
                className={`flex min-w-[180px] cursor-pointer items-center gap-[10px] rounded-xl border px-4 py-3 hover:border-[var(--accent-primary)] ${countryCode === country.code ? 'border-[var(--accent-primary)] bg-blue-50' : 'border-[var(--border-color)] bg-white'}`}
              >
                <input type="radio" name="countryCode" value={country.code} checked={countryCode === country.code} onChange={() => chooseCountry(country.code)} />
                <span aria-hidden="true" className="text-2xl leading-none">{country.flag}</span>
                <span className="font-semibold text-[var(--text-heading)]">{t(country.labelKey)}</span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <TextField id="customer-address1" label={t('address.addressLine1')} {...register('addressLine1')} />
            <TextField id="customer-address2" label={t('address.addressLine2')} {...register('addressLine2')} />
            <TextField
              id="customer-postal" label={t('address.postalCode')} inputMode={isBrazil ? 'numeric' : undefined} placeholder={isBrazil ? '00000-000' : undefined}
              {...register('postalCode', { onChange: (event) => { event.target.value = displayPostalCode(event.target.value, watch('countryCode')); } })}
            />
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Controller name="province" control={control} render={({ field }) => (
              <FilterableMultiSelect
                label={t('customerForm.stateProvince')} icon={MapPin} iconColor="var(--accent-primary)" isSingleSelect
                options={provinces.map((item) => ({ id: item.acronym, name: `${item.acronym} - ${item.name}` }))}
                selectedIds={field.value ? [field.value] : []}
                onChange={(ids) => { field.onChange(ids[0] || ''); setValue('city', ''); }}
                placeholder={loadingProvinces ? t('tenants.loadingProvinces') : t('customerForm.selectState')}
                emptyMessage={t('customerForm.noStateFound')} disabled={loadingProvinces}
              />
            )} />
            <Controller name="city" control={control} render={({ field }) => (
              <FilterableMultiSelect
                label={t('customerForm.city')} icon={MapPin} iconColor="var(--accent-primary)" isSingleSelect
                options={cities.map((item) => ({ id: item.name, name: item.name }))}
                selectedIds={field.value ? [field.value] : []}
                onChange={(ids) => field.onChange(ids[0] || '')}
                placeholder={!province ? t('customerForm.selectStatFirst') : loadingCities ? t('customerForm.loadingCities') : t('customerForm.searchCity')}
                emptyMessage={t('customerForm.noCityFound')} disabled={!province || loadingCities}
              />
            )} />
          </div>
        </section>

        <section className="mb-8 flex flex-col gap-4">
          <SectionTitle icon={<FileText size={18} />}>{t('customerForm.section2Title')}</SectionTitle>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <SelectField id="customer-plan" label={t('customerForm.clinicalPlan')} {...register('clinicalPlanId')}>
              <option value="">{t('customerForm.selectPlan')}</option>
              {catalogs.clinicalPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </SelectField>
            <SelectField id="customer-meal" label={t('customerForm.prepareMeal')} {...register('prepareMealId')}>
              <option value="">{t('customerForm.selectMeal')}</option>
              {catalogs.prepareMeals.map((meal) => <option key={meal.id} value={meal.id}>{meal.name}</option>)}
            </SelectField>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <SectionTitle icon={<Activity size={18} />}>{t('customerForm.section3Title')}</SectionTitle>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {([
              ['restrictionIds', 'dietaryRestrictions', AlertCircle, '#E11D48', catalogs.dietaryRestrictions, 'selectRestrictions', 'noRestrictions'],
              ['bowelFunctionIds', 'bowelFunction', Activity, '#2563EB', catalogs.bowelFunctions, 'selectBowelFunctions', 'noBowelFunctions'],
              ['conditionIds', 'preExistingConditions', Heart, '#D97706', catalogs.preExistingConditions, 'selectConditions', 'noConditions'],
              ['dailyMealIds', 'dailyMeals', CalendarDays, '#059669', catalogs.dailyMeals, 'selectDailyMeals', 'noDailyMeals'],
            ] as const).map(([name, label, icon, color, options, placeholder, empty]) => (
              <Controller key={name} name={name} control={control} render={({ field }) => (
                <FilterableMultiSelect
                  label={t(`customerForm.${label}`)} icon={icon} iconColor={color} options={options}
                  selectedIds={field.value} onChange={field.onChange}
                  placeholder={t(`customerForm.${placeholder}`)} emptyMessage={t(`customerForm.${empty}`)}
                />
              )} />
            ))}
          </div>
        </section>
      </FormCard>
    </form>
  );
};
