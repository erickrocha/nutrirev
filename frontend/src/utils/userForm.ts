import { ROLES } from './enums';
import type { AppUser, UserPayload } from '../types/user';

export interface UserFormValues {
  name: string;
  email: string;
  password: string;
  role: string;
  tenantId: string;
  enabled: boolean;
}

export const tenantIdOf = (user: Pick<AppUser, 'tenantId' | 'tenant_id'>): number | null => user.tenantId ?? user.tenant_id ?? null;

/** Cadastro novo: o SysAdmin começa pela primeira clínica; os demais, pela própria. */
export const newUserDefaults = (isSysAdmin: boolean, firstTenantId: number | undefined, ownTenantId: number | null): UserFormValues => ({
  name: '', email: '', password: '', role: ROLES.USER, enabled: true,
  tenantId: String((isSysAdmin ? firstTenantId : ownTenantId) ?? ''),
});

export const userToForm = (user: AppUser, isSysAdmin: boolean, ownTenantId: number | null): UserFormValues => ({
  name: user.name || '',
  email: user.email || '',
  password: '', // em branco, a não ser que a senha mude
  role: user.role || ROLES.USER,
  tenantId: String(tenantIdOf(user) ?? (isSysAdmin ? '' : ownTenantId ?? '')),
  enabled: user.enabled !== undefined ? user.enabled : true,
});

/** Senha só segue quando preenchida; ao editar, preserva o `firstLogin` que o usuário já tinha. */
export const toUserPayload = (values: UserFormValues, existing?: AppUser): UserPayload => ({
  name: values.name,
  email: values.email,
  role: values.role,
  enabled: values.enabled,
  tenantId: values.tenantId ? Number.parseInt(values.tenantId, 10) : null,
  ...(existing ? { firstLogin: existing.firstLogin ?? existing.first_login ?? true } : {}),
  ...(values.password ? { password: values.password } : {}),
});
