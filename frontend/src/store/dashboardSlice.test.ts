import { configureStore } from '@reduxjs/toolkit';
import reducer, { loadSysAdminDashboard, loadTenantDashboard } from './dashboardSlice';
import { clinicalPlanService, prepareMealService } from '../services/clinicalService';
import { sysAdminDashboardService } from '../services/sysAdminDashboardService';
import { tenantDashboardService } from '../services/tenantDashboardService';

const makeStore = () => configureStore({ reducer: { dashboard: reducer } });
afterEach(() => vi.restoreAllMocks());

describe('dashboardSlice', () => {
  it('guarda o painel do administrador; falha guarda a mensagem da API', async () => {
    vi.spyOn(sysAdminDashboardService, 'getDashboard').mockResolvedValueOnce({ totals: { tenants: 4 } }).mockRejectedValueOnce({ response: { data: { message: 'boom' } } });
    const store = makeStore();
    await store.dispatch(loadSysAdminDashboard());
    expect(store.getState().dashboard).toMatchObject({ sysAdmin: { totals: { tenants: 4 } }, sysAdminLoading: false, sysAdminError: null });
    await store.dispatch(loadSysAdminDashboard());
    expect(store.getState().dashboard.sysAdminError).toBe('boom');
  });

  it('painel da clínica traz planos e refeições para dar nome aos cartões, pedindo a clínica certa', async () => {
    const dash = vi.spyOn(tenantDashboardService, 'getDashboard').mockResolvedValue({ totals: { customers: 7 } });
    vi.spyOn(clinicalPlanService, 'getAll').mockResolvedValue([{ id: 1, name: 'Plano' }]);
    vi.spyOn(prepareMealService, 'getAll').mockResolvedValue([{ id: 2, name: 'Marmita' }]);
    const store = makeStore();
    await store.dispatch(loadTenantDashboard(9));
    expect(dash).toHaveBeenCalledWith(9);
    expect(store.getState().dashboard).toMatchObject({ tenant: { totals: { customers: 7 } }, plans: [{ id: 1, name: 'Plano' }], meals: [{ id: 2, name: 'Marmita' }] });
  });

  it('falha nos planos ou refeições não derruba o painel; falha no painel zera e guarda o erro', async () => {
    vi.spyOn(tenantDashboardService, 'getDashboard').mockResolvedValueOnce({ totals: {} }).mockRejectedValueOnce({});
    vi.spyOn(clinicalPlanService, 'getAll').mockRejectedValue(new Error('x'));
    vi.spyOn(prepareMealService, 'getAll').mockResolvedValue(null);
    const store = makeStore();
    await store.dispatch(loadTenantDashboard(undefined));
    expect(store.getState().dashboard).toMatchObject({ tenant: { totals: {} }, plans: [], meals: [], tenantError: null });
    await store.dispatch(loadTenantDashboard(undefined));
    expect(store.getState().dashboard).toMatchObject({ tenant: null, tenantError: '' });
  });
});
