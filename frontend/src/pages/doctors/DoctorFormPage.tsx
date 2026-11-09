import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { Loader2, MapPin, Save, Stethoscope, User, X } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { SectionCard } from '../../components/molecules/SectionCard';
import { Button } from '../../components/atoms/Button';
import { TextField } from '../../components/atoms/TextField';
import { FilterableMultiSelect } from '../../components/common/FilterableMultiSelect';
import { clearDoctorError, fetchDoctors, saveDoctor } from '../../store/doctorSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useAddressOptions } from '../../hooks/useAddressOptions';
import { PATHS } from '../../router/routeConfig';
import { maskPhone } from '../../utils/format';
import { doctorToForm, emptyDoctorForm, toDoctorPayload, type DoctorFormValues } from '../../utils/doctorForm';

interface FormProps {
  defaults: DoctorFormValues;
  editing: boolean;
  countryCode: string;
  onSubmit: (values: DoctorFormValues) => void;
}

// O formulário só monta com os dados prontos: assim os valores iniciais nunca sobrescrevem o que o usuário digitou.
const DoctorForm = ({ defaults, editing, countryCode, onSubmit }: FormProps) => {
  const { t } = useTranslation();
  const { saving, error } = useAppSelector((state) => state.doctor);
  const schema = useMemo(() => yup.object({
    name: yup.string().trim().required(t('doctors.nameRequired')),
    email: yup.string().trim().email(t('order.errors.email')),
  }), [t]);
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<DoctorFormValues>({ resolver: yupResolver(schema) as never, defaultValues: defaults });
  const province = watch('province');
  // Os estados vêm do país da clínica ativa.
  const { provinces, cities, loadingProvinces, loadingCities } = useAddressOptions(countryCode, province);

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {error !== null && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{error || t('common.errorSaving')}</div>}

      <SectionCard title={t('doctors.doctorDetails')} icon={<User size={18} />}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextField id="doctor-name" label={`${t('doctors.fullName')} *`} placeholder={t('doctors.namePlaceholder')} className="md:col-span-2" error={errors.name?.message} {...register('name')} />
          <TextField id="doctor-document" label={t('doctors.documentCRM')} placeholder="CRM/SP 123456" {...register('document')} />
          <TextField id="doctor-birth" type="date" label={t('doctors.dateOfBirth')} {...register('dateOfBirth')} />
          <TextField id="doctor-email" type="email" label={t('common.email')} placeholder="dr.carlos@clinica.com" error={errors.email?.message} {...register('email')} />
          <TextField id="doctor-phone" type="tel" inputMode="tel" label={t('doctors.phone')} placeholder="(11) 99999-9999" {...register('phone', { onChange: (event) => { event.target.value = maskPhone(event.target.value); } })} />
        </div>
      </SectionCard>

      <SectionCard title={t('doctors.province')} icon={<MapPin size={18} />}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller name="province" control={control} render={({ field }) => (
            <FilterableMultiSelect
              label={t('doctors.province')} icon={MapPin} iconColor="var(--accent-primary)" isSingleSelect
              options={provinces.map((item) => ({ id: item.acronym, name: `${item.acronym} - ${item.name}` }))}
              selectedIds={field.value ? [field.value] : []} onChange={(ids) => { field.onChange(ids[0] || ''); setValue('city', ''); }}
              placeholder={t('doctors.selectProvince')} emptyMessage={t('doctors.noProvinceFound')} disabled={loadingProvinces}
            />
          )} />
          <Controller name="city" control={control} render={({ field }) => (
            <FilterableMultiSelect
              label={t('doctors.city')} icon={MapPin} iconColor="var(--accent-primary)" isSingleSelect
              options={cities.map((item) => ({ id: item.name, name: item.name }))}
              selectedIds={field.value ? [field.value] : []} onChange={(ids) => field.onChange(ids[0] || '')}
              placeholder={!province ? t('doctors.selectProvinceFirst') : loadingCities ? t('doctors.loadingCities') : t('doctors.searchCity')}
              emptyMessage={t('doctors.noCityFound')} disabled={!province || loadingCities}
            />
          )} />
        </div>
      </SectionCard>

      <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4">
        <Button variant="outline" to={PATHS.DOCTORS}><X size={16} />{t('common.cancel')}</Button>
        <Button type="submit" disabled={saving}><Save size={18} />{saving ? t('common.saving') : editing ? t('common.saveChanges') : t('doctors.addDoctor')}</Button>
      </div>
    </form>
  );
};

export const DoctorFormPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const doctorId = id ? Number(id) : undefined;
  const editing = doctorId !== undefined;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { doctors, loading, error } = useAppSelector((state) => state.doctor);
  const activeTenant = useAppSelector((state) => state.tenant.activeTenant);
  const [loaded, setLoaded] = useState(false);

  const load = () => { dispatch(fetchDoctors()).then(() => setLoaded(true)); };
  useEffect(() => {
    dispatch(clearDoctorError());
    dispatch(fetchDoctors()).then(() => setLoaded(true));
  }, [dispatch]);

  const current = editing ? doctors.find((doctor) => doctor.id === doctorId) : undefined;
  const save = async (values: DoctorFormValues) => {
    const result = await dispatch(saveDoctor({ id: doctorId, payload: toDoctorPayload(values) }));
    if (saveDoctor.fulfilled.match(result)) navigate(PATHS.DOCTORS);
  };

  const title = editing ? t('doctors.editTitle') : t('doctors.newTitle');
  const notFound = editing && loaded && !loading && !current;
  const loadFailed = loaded && !loading && error !== null && doctors.length === 0;
  const ready = loaded && !loading && !loadFailed && !notFound;

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-14">
      <Breadcrumb items={[{ label: t('doctors.title'), to: PATHS.DOCTORS }, { label: title }]} />
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-[var(--border-color)] pb-4">
        <h2 className="m-0 flex items-center gap-2 text-[1.6rem] font-medium text-[var(--text-heading)]"><Stethoscope size={24} />{title}</h2>
        <p className="m-0 text-[.9rem] text-[var(--text-body)]">{editing ? t('doctors.editSubtitle') : t('doctors.addSubtitle')}</p>
      </header>

      {!loaded && <p role="status" className="flex items-center gap-2 text-[var(--text-body)]"><Loader2 size={18} className="animate-spin" />{t('doctors.loadingDoctors')}</p>}
      {loadFailed && <ErrorAlert message={error || t('doctors.errorLoading')} onRetry={load} />}
      {notFound && <ErrorAlert message={t('doctors.noDoctorsFound')} onRetry={load} />}
      {ready && (
        <DoctorForm
          key={current?.id ?? 'new'} editing={editing} countryCode={(activeTenant?.countryCode || '').trim().toUpperCase()}
          defaults={current ? doctorToForm(current) : emptyDoctorForm()} onSubmit={save}
        />
      )}
    </div>
  );
};
