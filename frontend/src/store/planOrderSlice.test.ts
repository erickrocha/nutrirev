import { configureStore } from '@reduxjs/toolkit';
import reducer, { cancelPlanOrder, fetchPlanOrders, fetchPublicPlan } from './planOrderSlice';
import { planOrderService } from '../services/planOrderService';

vi.mock('../services/planOrderService', () => ({
  planOrderService: {
    getOrders: vi.fn(), getOrder: vi.fn(), getPublicPlan: vi.fn(), createOrder: vi.fn(),
    convertOrder: vi.fn(), cancelOrder: vi.fn(),
  },
}));

const makeStore = () => configureStore({ reducer: { planOrder: reducer } });

describe('planOrderSlice', () => {
  it('guarda os pedidos buscados', async () => {
    vi.mocked(planOrderService.getOrders).mockResolvedValue([{ uuid: 'a' }] as never);
    const store = makeStore();
    await store.dispatch(fetchPlanOrders());
    expect(store.getState().planOrder.orders).toHaveLength(1);
    expect(store.getState().planOrder.loading).toBe(false);
  });

  it('registra mensagem e status HTTP na falha', async () => {
    vi.mocked(planOrderService.getPublicPlan).mockRejectedValue({ response: { status: 404, data: { message: 'não achou' } } });
    const store = makeStore();
    await store.dispatch(fetchPublicPlan('x'));
    expect(store.getState().planOrder.error).toBe('não achou');
    expect(store.getState().planOrder.errorStatus).toBe(404);
  });

  it('usa a mensagem padrão quando o backend não responde', async () => {
    vi.mocked(planOrderService.cancelOrder).mockRejectedValue(new Error('network'));
    const store = makeStore();
    await store.dispatch(cancelPlanOrder('x'));
    expect(store.getState().planOrder.error).toBe('Falha ao cancelar pedido');
  });
});
