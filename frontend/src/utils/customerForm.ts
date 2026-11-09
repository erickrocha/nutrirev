import { displayPostalCode, maskPhone, onlyDigits, storedPostalCode } from './format';
import type { Customer, CustomerAssociations, CustomerPayload } from '../types/customer';

export interface CustomerFormValues extends CustomerAssociations {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  countryCode: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  province: string;
  city: string;
  clinicalPlanId: string;
  prepareMealId: string;
}

export interface CustomerFormSubmit {
  payload: CustomerPayload;
  associations: CustomerAssociations;
}

const toNumber = (value: string): number | null => (value ? Number.parseInt(value, 10) : null);

export const buildDefaults = (
  customer: Customer | null,
  associations: CustomerAssociations,
  defaultCountry: string,
  firstPlanId: string,
  firstMealId: string,
): CustomerFormValues => {
  const countryCode = (customer?.countryCode || defaultCountry).toUpperCase();
  return {
    name: customer?.name ?? '',
    email: customer?.email ?? '',
    phone: maskPhone(customer?.phone),
    dateOfBirth: customer?.dateOfBirth ?? '',
    gender: customer?.gender || 'Feminino',
    countryCode,
    addressLine1: customer?.addressLine1 ?? '',
    addressLine2: customer?.addressLine2 ?? '',
    postalCode: displayPostalCode(customer?.postalCode, countryCode),
    province: customer?.administrativeArea ?? '',
    city: customer?.locality ?? '',
    clinicalPlanId: customer ? String(customer.clinicalPlanId ?? '') : firstPlanId,
    prepareMealId: customer ? String(customer.prepareMealId ?? '') : firstMealId,
    ...associations,
  };
};

export const toSubmit = (values: CustomerFormValues): CustomerFormSubmit => ({
  payload: {
    name: values.name.trim(),
    email: values.email.trim(),
    phone: onlyDigits(values.phone),
    dateOfBirth: values.dateOfBirth,
    gender: values.gender,
    addressLine1: values.addressLine1.trim() || null,
    addressLine2: values.addressLine2.trim() || null,
    administrativeArea: values.province.trim() || null,
    locality: values.city.trim() || null,
    postalCode: storedPostalCode(values.postalCode, values.countryCode),
    countryCode: values.countryCode.trim().toUpperCase() || null,
    clinicalPlanId: toNumber(values.clinicalPlanId),
    prepareMealId: toNumber(values.prepareMealId),
  },
  associations: {
    restrictionIds: values.restrictionIds,
    bowelFunctionIds: values.bowelFunctionIds,
    conditionIds: values.conditionIds,
    dailyMealIds: values.dailyMealIds,
  },
});

