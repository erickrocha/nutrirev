export interface CatalogOption {
  id: number;
  name: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  administrativeArea?: string | null;
  locality?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  clinicalPlanId?: number | null;
  prepareMealId?: number | null;
  mobileEnabled?: boolean;
  photoUrl?: string | null;
  // A API já respondeu nos dois formatos; as telas aceitam ambos.
  mobile_enabled?: boolean;
  photo?: string | null;
  city?: string | null;
  province?: string | null;
  zipcode?: string | null;
  clinical_plan_id?: number | null;
  prepare_meal_id?: number | null;
  dateOfbirth?: string | null;
  date_of_birth?: string | null;
}

/** Corpo enviado à API; telefone e CEP vão só com dígitos (a máscara é só de exibição). */
export interface CustomerPayload {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  addressLine1: string | null;
  addressLine2: string | null;
  administrativeArea: string | null;
  locality: string | null;
  postalCode: string | null;
  countryCode: string | null;
  clinicalPlanId: number | null;
  prepareMealId: number | null;
}

export interface CustomerAssociations {
  restrictionIds: number[];
  bowelFunctionIds: number[];
  conditionIds: number[];
  dailyMealIds: number[];
}

export interface CustomerFormCatalogs {
  clinicalPlans: CatalogOption[];
  prepareMeals: CatalogOption[];
  dietaryRestrictions: CatalogOption[];
  bowelFunctions: CatalogOption[];
  preExistingConditions: CatalogOption[];
  dailyMeals: CatalogOption[];
}

export interface AddressProvince {
  id: number;
  acronym: string;
  name: string;
}

export interface AddressCity {
  id?: number;
  name: string;
}
