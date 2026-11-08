import { configureStore } from '@reduxjs/toolkit';
import reducer, { loadTenantPlan } from './tenantPlanSlice';
import { businessPlanService } from '../services/businessPlanService';
import { tenantService } from '../services/tenantService';

const makeStore = () => configureStore({ reducer: { tenantPlan: reducer } });
afterEach(() => vi.restoreAllMocks());

describe('tenantPlanSlice', () => {
  it('carrega os planos e o plano ativo da clínica', async () => {
    vi.spyOn(businessPlanService, 'getPlans').mockResolvedValue([{ id: 1, name: 'Pro' }]);
    const active = vi.spyOn(tenantService, 'getTenantActivePlan').mockResolvedValue({ businessPlanId: 1, active: true });
    const store = makeStore();
    await store.dispatch(loadTenantPlan(7));
    expect(active).toHaveBeenCalledWith(7);
    expect(store.getState().tenantPlan).toMatchObject({ businessPlans: [{ id: 1, name: 'Pro' }], activePlan: { businessPlanId: 1, active: true }, loading: false });
  });

  it('falhas nas duas consultas deixam planos vazios e sem plano ativo', async () => {
    vi.spyOn(businessPlanService, 'getPlans').mockRejectedValue(new Error('x'));
    vi.spyOn(tenantService, 'getTenantActivePlan').mockRejectedValue(new Error('x'));
    const store = makeStore();
    await store.dispatch(loadTenantPlan(7));
    expect(store.getState().tenantPlan).toMatchObject({ businessPlans: [], activePlan: null });
  });
});
