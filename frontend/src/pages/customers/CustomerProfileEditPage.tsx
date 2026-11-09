import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { Activity, AlertCircle, Camera, Check, FileText, Loader2, Lock, MapPin, Save, Sparkles, User } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { SectionCard } from '../../components/molecules/SectionCard';
import { Button } from '../../components/atoms/Button';
import { SelectField } from '../../components/atoms/SelectField';
import { TextField } from '../../components/atoms/TextField';
import { FilterableMultiSelect } from '../../components/common/FilterableMultiSelect';
import {
  clearCustomerFormError, loadMyProfile, saveCustomerForm, uploadProfilePhoto,
} from '../../store/customerFormSlice';
import { useAddressOptions } from '../../hooks/useAddressOptions';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { DEFAULT_PATH_BY_ROLE } from '../../router/routeConfig';
import { ROLES } from '../../utils/enums';
import { displayPostalCode, maskPhone } from '../../utils/format';
import { buildDefaults, toSubmit, type CustomerFormValues } from '../../utils/customerForm';
import type { Customer, CustomerPayload } from '../../types/customer';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const ASSOCIATIONS = [
  ['restrictionIds', 'dietaryRestrictions', 'dietaryRestrictions', 'selectRestrictions'],
  ['bowelFunctionIds', 'bowelFunctions', 'bowelFunctions', 'selectBowelFunctions'],
  ['conditionIds', 'preExistingConditions', 'preExistingConditions', 'selectConditions'],
  ['dailyMealIds', 'dailyMeals', 'dailyMeals', 'selectDailyMeals'],
] as const;

export const CustomerProfileEditPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { customer, associations, catalogs, loading, saving, uploadingPhoto, error } = useAppSelector((state) => state.customerForm);
  const isUserRole = user?.role === ROLES.USER;
  const [notice, setNotice] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = () => { dispatch(loadMyProfile()); };
  useEffect(() => {
    if (isUserRole) {
      dispatch(clearCustomerFormError());
      dispatch(loadMyProfile());
    }
  }, [dispatch, isUserRole]);
  useEffect(() => { setPhoto(customer ? customer.photoUrl || customer.photo || null : null); }, [customer]);

  const schema = useMemo(() => yup.object({ name: yup.string().trim().required(t('customerProfile.nameRequired')) }), [t]);
  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CustomerFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: buildDefaults(null, associations, 'BR', '', ''),
  });
  useEffect(() => {
    if (customer) reset(buildDefaults({ ...customer, email: customer.email || user?.email || '' } as Customer, associations, 'BR', '', ''));
  }, [customer, associations, user?.email, reset]);

  const countryCode = watch('countryCode');
  const province = watch('province');
  const { provinces, cities, loadingProvinces, loadingCities } = useAddressOptions(countryCode, province);

  if (user && !isUserRole) return <Navigate to={DEFAULT_PATH_BY_ROLE[user.role as keyof typeof DEFAULT_PATH_BY_ROLE] || DEFAULT_PATH_BY_ROLE.default} replace />;

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setNotice(null);
    if (!file.type.startsWith('image/')) { setLocalError(t('customerProfile.invalidImage')); return; }
    if (file.size > MAX_PHOTO_BYTES) { setLocalError(t('customerProfile.imageTooLarge')); return; }
    setLocalError(null);
    setPhoto(URL.createObjectURL(file));
    if (!customer?.id) return;
    const result = await dispatch(uploadProfilePhoto({ id: customer.id, file }));
    if (uploadProfilePhoto.fulfilled.match(result) && result.payload) { setPhoto(result.payload); setNotice(t('customerProfile.photoSuccess')); }
    else setLocalError(t('customerProfile.photoError'));
  };

  const save = async (values: CustomerFormValues) => {
    if (!customer?.id) { setLocalError(t('customerProfile.noCustomerToSave')); return; }
    setNotice(null);
    setLocalError(null);
    const { payload, associations: selected } = toSubmit(values);
    // O e-mail não muda aqui e a API espera o cadastro completo, com a foto atual.
    const merged = { ...customer, ...payload, email: customer.email, photo: photo || customer.photo } as unknown as CustomerPayload;
    const result = await dispatch(saveCustomerForm({ id: customer.id, payload: merged, associations: selected }));
    if (saveCustomerForm.fulfilled.match(result)) setNotice(t('customerProfile.saveSuccess'));
  };

  const loadFailed = !loading && Boolean(error) && !customer;
  const shownError = localError ?? (customer ? error : null);

  return (
    <div className="mx-auto w-full max-w-[1100px] pb-14">
      <Breadcrumb items={[{ label: t('customerProfile.title') }]} />
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">{t('customerProfile.title')} <span className="text-[.9rem] font-normal text-[var(--text-body)]">{t('customerProfile.subtitle')}</span></h1>
        <span className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[.8rem] font-semibold text-[var(--accent-primary)]"><Sparkles size={14} />NutriRev</span>
      </header>

      {loading && <p role="status" className="flex items-center justify-center gap-2 p-10 text-[var(--text-body)]"><Loader2 size={22} className="animate-spin" />{t('customerProfile.loadingProfile')}</p>}
      {loadFailed && <ErrorAlert message={t('customerProfile.errorLoading')} onRetry={load} />}

      {!loading && customer && (
        <form noValidate onSubmit={handleSubmit(save)} className="flex flex-col gap-5">
          {shownError && <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700"><AlertCircle size={20} />{shownError}</div>}
          {notice && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700"><Check size={20} />{notice}</div>}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-[260px_1fr]">
            <SectionCard title={t('customerProfile.profilePhoto')} icon={<Camera size={17} />}>
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <span className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-400">
                    {photo ? <img src={photo} alt={t('customerProfile.profilePhoto')} className="h-full w-full object-cover" /> : <User size={54} />}
                  </span>
                  <button type="button" onClick={() => fileInput.current?.click()} disabled={uploadingPhoto} title={t('customerProfile.changePhoto')} aria-label={t('customerProfile.changePhoto')} className="absolute bottom-0 right-0 rounded-full bg-[var(--accent-primary)] p-2 text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"><Camera size={15} /></button>
                  <input ref={fileInput} type="file" accept="image/*" hidden aria-label={t('customerProfile.changePhoto')} onChange={(event) => { pickPhoto(event.target.files?.[0]); event.target.value = ''; }} />
                </div>
                <p className="m-0 text-center text-[.78rem] text-[var(--text-body)]">{uploadingPhoto ? t('customerProfile.uploadingPhoto') : t('customerProfile.photoFormat')}</p>
              </div>
            </SectionCard>

            <SectionCard title={t('customerProfile.personalInfo')} icon={<User size={17} />}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField id="profile-name" label={t('customerProfile.fullName')} className="sm:col-span-2" error={errors.name?.message} {...register('name')} />
                <div className="flex flex-col gap-[7px]">
                  <TextField id="profile-email" type="email" label={t('customerProfile.corporateEmail')} readOnly disabled value={customer.email || user?.email || ''} />
                  <span className="flex items-center gap-1 text-[.72rem] text-[var(--text-body)]"><Lock size={12} />{t('customerProfile.emailCannotChange')}</span>
                </div>
                <TextField id="profile-phone" type="tel" inputMode="tel" label={t('customerProfile.phone')} placeholder="(00) 00000-0000" {...register('phone', { onChange: (event) => { event.target.value = maskPhone(event.target.value); } })} />
                <TextField id="profile-dob" type="date" label={t('customerProfile.dob')} {...register('dateOfBirth')} />
                <SelectField id="profile-gender" label={t('customerProfile.gender')} {...register('gender')}>
                  <option value="Feminino">{t('customerProfile.genderFemale')}</option>
                  <option value="Masculino">{t('customerProfile.genderMale')}</option>
                  <option value="Outro">{t('customerProfile.genderOther')}</option>
                </SelectField>
                <TextField id="profile-address1" label={t('address.addressLine1')} {...register('addressLine1')} />
                <TextField id="profile-address2" label={t('address.addressLine2')} {...register('addressLine2')} />
                <TextField id="profile-postal" label={t('address.postalCode')} inputMode="numeric" {...register('postalCode', { onChange: (event) => { event.target.value = displayPostalCode(event.target.value, watch('countryCode')); } })} />
                <TextField
                  id="profile-country" label={t('address.countryCode')} maxLength={2}
                  {...register('countryCode', { onChange: (event) => { event.target.value = event.target.value.toUpperCase(); setValue('province', ''); setValue('city', ''); } })}
                />
              </div>
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <SectionCard title={t('customerProfile.location')} icon={<MapPin size={17} />}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller name="province" control={control} render={({ field }) => (
                  <FilterableMultiSelect
                    label={t('customerProfile.state')} icon={MapPin} iconColor="var(--accent-primary)" isSingleSelect
                    options={provinces.map((item) => ({ id: item.acronym, name: `${item.name} (${item.acronym})` }))}
                    selectedIds={field.value ? [field.value] : []} onChange={(ids) => { field.onChange(ids[0] || ''); setValue('city', ''); }}
                    placeholder={t('customerProfile.selectState')} disabled={countryCode.trim().length !== 2 || loadingProvinces}
                  />
                )} />
                <Controller name="city" control={control} render={({ field }) => (
                  <FilterableMultiSelect
                    label={t('customerProfile.city')} icon={MapPin} iconColor="var(--accent-primary)" isSingleSelect
                    options={cities.map((item) => ({ id: item.name, name: item.name }))}
                    selectedIds={field.value ? [field.value] : []} onChange={(ids) => field.onChange(ids[0] || '')}
                    placeholder={loadingCities ? t('customerProfile.loadingCities') : t('customerProfile.selectCity')} disabled={!province || loadingCities}
                  />
                )} />
              </div>
            </SectionCard>

            <SectionCard title={t('customerProfile.careParameters')} icon={<FileText size={17} />}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField id="profile-plan" label={t('customerProfile.clinicalPlan')} {...register('clinicalPlanId')}>
                  <option value="">{t('customerProfile.noPlanSelected')}</option>
                  {catalogs.clinicalPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                </SelectField>
                <SelectField id="profile-meal" label={t('customerProfile.prepMeal')} {...register('prepareMealId')}>
                  <option value="">{t('customerProfile.noMealSelected')}</option>
                  {catalogs.prepareMeals.map((meal) => <option key={meal.id} value={meal.id}>{meal.name}</option>)}
                </SelectField>
              </div>
            </SectionCard>
          </div>

          <SectionCard title={t('customerProfile.clinicalConditions')} icon={<Activity size={17} />}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {ASSOCIATIONS.map(([name, catalog, label, placeholder]) => (
                <Controller key={name} name={name} control={control} render={({ field }) => (
                  <FilterableMultiSelect label={t(`customerProfile.${label}`)} options={catalogs[catalog]} selectedIds={field.value} onChange={field.onChange} placeholder={t(`customerProfile.${placeholder}`)} />
                )} />
              ))}
            </div>
          </SectionCard>

          <div className="flex justify-end border-t border-[var(--border-color)] pt-4">
            <Button type="submit" disabled={saving}><Save size={18} />{saving ? t('customerProfile.savingChanges') : t('customerProfile.saveProfile')}</Button>
          </div>
        </form>
      )}
    </div>
  );
};
