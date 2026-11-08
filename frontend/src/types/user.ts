export interface AppUser {
  id: number;
  name?: string | null;
  email: string;
  role?: string;
  enabled?: boolean;
  firstLogin?: boolean;
  tenantId?: number | null;
  // A API já respondeu nos dois formatos; as telas aceitam ambos.
  first_login?: boolean;
  tenant_id?: number | null;
}

export interface UserPayload {
  name: string;
  email: string;
  role: string;
  enabled: boolean;
  tenantId: number | null;
  firstLogin?: boolean;
  password?: string;
}
