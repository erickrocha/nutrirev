export interface Tenant {
  id: number;
  uuid?: string;
  name: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  administrativeArea?: string | null;
  locality?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  // A API já respondeu nos dois formatos; as telas aceitam ambos.
  province?: string | null;
  city?: string | null;
  zipcode?: string | null;
}

export interface TenantPayload {
  name: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  administrativeArea: string | null;
  locality: string | null;
  postalCode: string | null;
  countryCode: string | null;
}

export interface TenantPlan {
  businessPlanId?: number | null;
  paymentDate?: string | null;
  active?: boolean;
}

export interface TenantPlanPayload {
  tenantId: number;
  businessPlanId: number;
  paymentDate: string;
  active: boolean;
}
