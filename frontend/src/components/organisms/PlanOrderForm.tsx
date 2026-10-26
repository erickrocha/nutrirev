import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { TextField } from '../atoms/TextField';
import { MapPin } from 'lucide-react';
import { FilterableMultiSelect } from '../common/FilterableMultiSelect';
import type { Province } from '../../types/planOrder';
import { FormCard } from '../molecules/FormCard';
import { maskPhone, maskPostalCode, maskTaxId, onlyDigits } from '../../utils/format';

export interface PlanOrderFormValues {
  taxId: string;
  name: string;
  email: string;
  phone: string;
  postalCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  website?: string;
  accepted: boolean;
}

const DEFAULTS: PlanOrderFormValues = {
  taxId: '', name: '', email: '', phone: '', postalCode: '', street: '', number: '',
  complement: '', neighborhood: '', city: '', state: '', website: '', accepted: false,
};

interface Props {
  provinces: Province[];
  submitting: boolean;
  error: string;
  onSubmit: (values: PlanOrderFormValues) => void;
}

export const PlanOrderForm = ({ provinces, submitting, error, onSubmit }: Props) => {
  const { t } = useTranslation();

  const schema = useMemo(() => {
    const required = t('order.errors.required');
    const text = (max: number) => yup.string().trim().max(max).required(required);
    return yup.object({
      taxId: yup.string().required(required).test('tax-id', t('order.errors.taxId'), (v) => [11, 14].includes(onlyDigits(v).length)),
      name: text(200),
      email: yup.string().trim().max(200).email(t('order.errors.email')).required(required),
      phone: yup.string().required(required).test('phone', t('order.errors.phone'), (v) => [10, 11].includes(onlyDigits(v).length)),
      postalCode: yup.string().required(required).test('cep', t('order.errors.postalCode'), (v) => onlyDigits(v).length === 8),
      street: text(200),
      number: text(20),
      complement: yup.string().max(100),
      neighborhood: yup.string().max(100),
      city: text(120),
      state: yup.string().required(required).matches(/^[A-Za-z]{2}$/, t('order.errors.state')),
      website: yup.string(),
      accepted: yup.boolean().oneOf([true], t('order.errors.accept')).required(),
    });
  }, [t]);

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<PlanOrderFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: DEFAULTS,
  });

  const masked = (name: 'taxId' | 'phone' | 'postalCode', mask: (v: unknown) => string) =>
    register(name, { onChange: (e) => { e.target.value = mask(e.target.value); } });
  const isCompany = onlyDigits(watch('taxId')).length > 11;

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <FormCard
        header={<h2 className="m-0 text-[1.1rem]">{t('order.yourData')}</h2>}
        footer={
          <>
            <div role="alert" className="text-[#B3261E]">{error}</div>
            <Button type="submit" variant="landing" disabled={submitting}>{submitting ? t('order.sending') : t('order.submit')}</Button>
          </>
        }
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[14px]">
          <TextField id="taxId" label={t('order.taxId')} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" error={errors.taxId?.message} {...masked('taxId', maskTaxId)} />
          <TextField id="name" label={isCompany ? t('order.companyName') : t('order.fullName')} autoComplete="name" error={errors.name?.message} {...register('name')} />
          <TextField id="email" type="email" label={t('order.email')} autoComplete="email" error={errors.email?.message} {...register('email')} />
          <TextField id="phone" type="tel" label={t('order.phone')} autoComplete="tel" placeholder="(00) 00000-0000" error={errors.phone?.message} {...masked('phone', maskPhone)} />
        </div>

        <h2 className="mb-[14px] mt-6 text-[1.1rem]">{t('order.address')}</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[14px]">
          <TextField id="postalCode" label={t('order.postalCode')} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" error={errors.postalCode?.message} {...masked('postalCode', maskPostalCode)} />
          <TextField id="street" label={t('order.street')} autoComplete="address-line1" error={errors.street?.message} {...register('street')} />
          <TextField id="number" label={t('order.number')} error={errors.number?.message} {...register('number')} />
          <TextField id="complement" label={t('order.complement')} error={errors.complement?.message} {...register('complement')} />
          <TextField id="neighborhood" label={t('order.neighborhood')} error={errors.neighborhood?.message} {...register('neighborhood')} />
          <TextField id="city" label={t('order.city')} autoComplete="address-level2" error={errors.city?.message} {...register('city')} />
          <Controller
            name="state"
            control={control}
            render={({ field }) => (
              <div>
                <FilterableMultiSelect
                  label={t('order.state')}
                  icon={MapPin}
                  iconColor="var(--accent-primary)"
                  options={provinces.map((province) => ({ id: province.acronym, name: `${province.acronym} - ${province.name}` }))}
                  selectedIds={field.value ? [field.value] : []}
                  onChange={(values) => field.onChange(values[0] ?? '')}
                  placeholder={t('order.selectState')}
                  isSingleSelect
                />
                {errors.state && <small role="alert" className="text-[.72rem] text-red-700">{errors.state.message}</small>}
              </div>
            )}
          />
        </div>

        {/* Campo-isca: invisível para pessoas; robôs costumam preencher. */}
        <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px]" {...register('website')} />

        <label className="mt-5 flex items-start gap-[10px] text-[.88rem]">
          <input type="checkbox" className="mt-1" {...register('accepted')} />
          <span>
            {t('order.acceptPrefix')} <a href="/termos-de-uso" target="_blank" rel="noreferrer">{t('site.footer.terms')}</a> {t('order.acceptAnd')}{' '}
            <a href="/politica-de-privacidade" target="_blank" rel="noreferrer">{t('site.footer.privacy')}</a>.
          </span>
        </label>
        {errors.accepted && <small role="alert" className="text-[.72rem] text-red-700">{errors.accepted.message}</small>}
      </FormCard>
    </form>
  );
};
