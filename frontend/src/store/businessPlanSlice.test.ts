import { configureStore } from '@reduxjs/toolkit';
import reducer, { deleteBusinessPlan, fetchBusinessPlan, fetchBusinessPlans, saveBusinessPlan } from './businessPlanSlice';
import { businessPlanService } from '../services/businessPlanService';

const makeStore = () => configureStore({ reducer: { businessPlan: reducer } });
afterEach(() => vi.restoreAllMocks());

describe('businessPlanSlice', () => {
  it('lista os planos e trata resposta inválida como vazia', async () => {
    vi.spyOn(businessPlanService, 'getPlans').mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce(null);
    const store = makeStore();
    await store.dispatch(fetchBusinessPlans());
    expect(store.getState().businessPlan.plans).toEqual([{ id: 1 }]);
    await store.dispatch(fetchBusinessPlans());
    expect(store.getState().businessPlan.plans).toEqual([]);
  });

  it('guarda a mensagem da API quando a lista falha', async () => {
    vi.spyOn(businessPlanService, 'getPlans').mockRejectedValue({ response: { data: { message: 'boom' } } });
    const store = makeStore();
    await store.dispatch(fetchBusinessPlans());
    expect(store.getState().businessPlan.error).toBe('boom');
  });

  it('carrega um plano; sem resposta fica nulo', async () => {
    vi.spyOn(businessPlanService, 'getPlan').mockResolvedValueOnce({ id: 3, name: 'Pro' }).mockResolvedValueOnce(undefined);
    const store = makeStore();
    await store.dispatch(fetchBusinessPlan(3));
    expect(store.getState().businessPlan.current).toEqual({ id: 3, name: 'Pro' });
    await store.dispatch(fetchBusinessPlan(4));
    expect(store.getState().businessPlan.current).toBeNull();
  });

  it('cria sem id, atualiza com id e registra a falha', async () => {
    const create = vi.spyOn(businessPlanService, 'createPlan').mockResolvedValue({});
    const update = vi.spyOn(businessPlanService, 'updatePlan').mockRejectedValue({});
    const store = makeStore();
    const payload = { name: 'P', priceInCents: 1, availableUsers: 1, periodDays: 30, paymentDate: '2026-01-01', tiers: null };
    await store.dispatch(saveBusinessPlan({ payload }));
    await store.dispatch(saveBusinessPlan({ id: 5, payload }));
    expect(create).toHaveBeenCalledWith(payload);
    expect(update).toHaveBeenCalledWith(5, payload);
    expect(store.getState().businessPlan).toMatchObject({ error: '', saving: false });
  });

  it('exclui e recarrega a lista; falha guarda o erro e não recarrega', async () => {
    const del = vi.spyOn(businessPlanService, 'deletePlan').mockRejectedValueOnce({ response: { data: { message: 'em uso' } } }).mockResolvedValueOnce(undefined);
    const list = vi.spyOn(businessPlanService, 'getPlans').mockResolvedValue([]);
    const store = makeStore();
    await store.dispatch(deleteBusinessPlan(1));
    expect(store.getState().businessPlan.error).toBe('em uso');
    expect(list).not.toHaveBeenCalled();
    await store.dispatch(deleteBusinessPlan(1));
    expect(del).toHaveBeenCalledTimes(2);
    expect(list).toHaveBeenCalledTimes(1);
  });
});
