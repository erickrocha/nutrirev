import { maskPhone, maskPostalCode, maskTaxId, onlyDigits } from './format';
import type { Tenant, TenantPayload } from '../types/tenant';

export interface TenantFormValues {
  name: string;
  taxId: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  administrativeArea: string;
  locality: string;
  postalCode: string;
  countryCode: string;
}

export const emptyTenantForm = (countryCode: string): TenantFormValues => ({
  name: '', taxId: '', email: '', phone: '', addressLine1: '', addressLine2: '', administrativeArea: '', locality: '', postalCode: '', countryCode,
});

/** Edição: a máscara é só de exibição, então CNPJ/CPF, telefone e CEP são formatados ao carregar. */
export const tenantToForm = (tenant: Tenant, fallbackCountry: string): TenantFormValues => ({
  name: tenant.name || '',
  taxId: maskTaxId(tenant.taxId),
  email: tenant.email || '',
  phone: maskPhone(tenant.phone),
  addressLine1: tenant.addressLine1 || '',
  addressLine2: tenant.addressLine2 || '',
  administrativeArea: tenant.administrativeArea || tenant.province || '',
  locality: tenant.locality || tenant.city || '',
  postalCode: maskPostalCode(tenant.postalCode || tenant.zipcode),
  countryCode: (tenant.countryCode || fallbackCountry).toUpperCase(),
});

const DIGIT_FIELDS: Array<keyof TenantFormValues> = ['taxId', 'phone', 'postalCode'];

/** Só dígitos para CNPJ/CPF, telefone e CEP; os demais campos aparados; vazio vira null. */
export const toTenantPayload = (values: TenantFormValues): TenantPayload =>
  Object.fromEntries(
    (Object.keys(values) as Array<keyof TenantFormValues>).map((key) => [key, (DIGIT_FIELDS.includes(key) ? onlyDigits(values[key]) : values[key].trim()) || null]),
  ) as unknown as TenantPayload;
