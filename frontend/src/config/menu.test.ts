import { ROLE_ALLOWED_PATHS, PATHS } from '../router/routeConfig';
import { ROLES } from '../utils/enums';
import { buildMenu } from './menu';

const t = (key: string) => key;
const paths = (role: string) => buildMenu(role, t).flatMap((section) => section.items.map((item) => item.path));
const sections = (role: string) => buildMenu(role, t).map((section) => section.id);

describe('buildMenu', () => {
  it('o paciente só vê o app dele', () => {
    expect(sections(ROLES.USER)).toEqual(['user-menu']);
    expect(paths(ROLES.USER)).toEqual([PATHS.HOME, PATHS.MY_MEAL_PLAN, PATHS.DAILY, PATHS.MANUAL_MEAL_ANALYSIS, PATHS.EAT, PATHS.PAYMENTS, PATHS.SETTINGS]);
  });

  it('só o SysAdmin vê as telas da plataforma', () => {
    const platform = [PATHS.SYSADMIN_DASHBOARD, PATHS.TENANTS, PATHS.BUSINESS_PLANS, PATHS.PLAN_ORDERS, PATHS.PAYMENT_CONNECTIONS];
    for (const path of platform) {
      expect(paths(ROLES.SYS_ADMIN)).toContain(path);
      expect(paths(ROLES.TENANT_OWNER)).not.toContain(path);
      expect(paths(ROLES.TENANT_USER)).not.toContain(path);
    }
  });

  it('o usuário da clínica não vê usuários nem parâmetros clínicos; o dono vê', () => {
    expect(paths(ROLES.TENANT_USER)).not.toContain(PATHS.USERS);
    expect(sections(ROLES.TENANT_USER)).not.toContain('clinical-parameters');
    expect(paths(ROLES.TENANT_OWNER)).toContain(PATHS.USERS);
    expect(sections(ROLES.TENANT_OWNER)).toContain('clinical-parameters');
  });

  it('o painel da clínica tem rótulo próprio para o SysAdmin', () => {
    const label = (role: string) => buildMenu(role, t)[0].items.find((item) => item.path === PATHS.TENANT_DASHBOARD)?.label;
    expect(label(ROLES.SYS_ADMIN)).toBe('sidebar.tenantDashboard');
    expect(label(ROLES.TENANT_OWNER)).toBe('sidebar.dashboard');
  });

  it('todo item do menu é uma rota que o perfil pode abrir (nada de link que redireciona)', () => {
    for (const role of [ROLES.USER, ROLES.TENANT_USER, ROLES.TENANT_OWNER, ROLES.SYS_ADMIN]) {
      const allowed = (ROLE_ALLOWED_PATHS as Record<string, string[]>)[role];
      for (const path of paths(role)) expect(allowed, `${role} → ${path}`).toContain(path);
    }
  });
});
