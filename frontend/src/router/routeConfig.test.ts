import { matchPath } from 'react-router-dom';
import { PATHS, ROLE_ALLOWED_PATHS } from './routeConfig';
import { CATALOGS, editPath, newPath } from '../config/catalogs';
import { ROLES } from '../utils/enums';

const allowed = (role: string, pathname: string) =>
  (ROLE_ALLOWED_PATHS as Record<string, string[]>)[role].some((pattern) => matchPath({ path: pattern, end: true }, pathname));

describe('routeConfig', () => {
  it('libera lista, cadastro e edição de cada catálogo para o dono da clínica', () => {
    for (const catalog of CATALOGS) {
      expect(allowed(ROLES.TENANT_OWNER, catalog.path)).toBe(true);
      expect(allowed(ROLES.TENANT_OWNER, newPath(catalog))).toBe(true);
      expect(allowed(ROLES.TENANT_OWNER, editPath(catalog, 3))).toBe(true);
    }
  });

  it('libera cadastro e edição de cliente para quem acessa a listagem', () => {
    for (const role of [ROLES.TENANT_USER, ROLES.TENANT_OWNER, ROLES.SYS_ADMIN]) {
      expect(allowed(role, PATHS.CUSTOMER_NEW)).toBe(true);
      expect(allowed(role, '/customers/8/edit')).toBe(true);
    }
  });

  it('libera lista, cadastro e edição de planos, datas de pagamento e níveis de pontos para a clínica', () => {
    for (const base of [PATHS.CLINICAL_PLANS, PATHS.PAYMENT_DATES, PATHS.MEAL_POINT_TIERS, PATHS.INGREDIENTS, PATHS.CUSTOMER_GOALS, PATHS.DOCTORS, PATHS.MEAL_PLANS, PATHS.RECIPES]) {
      for (const role of [ROLES.TENANT_USER, ROLES.TENANT_OWNER]) {
        expect([allowed(role, base), allowed(role, `${base}/new`), allowed(role, `${base}/7/edit`)]).toEqual([true, true, true]);
      }
    }
  });

  it('libera cadastro e edição de usuários para a clínica e o SysAdmin, mas não para o usuário comum', () => {
    for (const role of [ROLES.TENANT_OWNER, ROLES.SYS_ADMIN]) {
      expect([allowed(role, '/users'), allowed(role, '/users/new'), allowed(role, '/users/4/edit')]).toEqual([true, true, true]);
    }
    expect(allowed(ROLES.USER, '/users/new')).toBe(false);
  });

  it('libera as telas de clínicas só para o SysAdmin', () => {
    for (const path of ['/tenants', '/tenants/new', '/tenants/5/edit', '/tenants/5/plan', '/admin/payment-connections', '/admin/payment-connections/new', '/admin/payment-connections/5/edit']) {
      expect(allowed(ROLES.SYS_ADMIN, path)).toBe(true);
      expect(allowed(ROLES.TENANT_OWNER, path)).toBe(false);
    }
  });

  it('não libera catálogos exclusivos da clínica para o usuário comum', () => {
    expect(allowed(ROLES.USER, '/bowel-functions/new')).toBe(false);
  });
});
