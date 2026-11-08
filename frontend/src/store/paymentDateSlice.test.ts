import { configureStore } from '@reduxjs/toolkit';
import reducer, { fetchCharges, loadPaymentDates, savePaymentDate } from './paymentDateSlice';
import { clinicalPlanService, paymentChargeService, paymentDateService } from '../services/clinicalService';
import { customerService } from '../services/customerService';

const makeStore = () => configureStore({ reducer: { paymentDate: reducer } });
afterEach(() => vi.restoreAllMocks());

const mockAll = () => {
  vi.spyOn(paymentDateService, 'getAll').mockResolvedValue([{ id: 1, customerId: 2 }]);
  vi.spyOn(clinicalPlanService, 'getAll').mockResolvedValue([{ id: 3, name: 'P' }]);
  vi.spyOn(customerService, 'getAll').mockResolvedValue([{ id: 2, name: 'Ana' }]);
};

describe('paymentDateSlice', () => {
  it('carrega datas, planos, clientes e estornos', async () => {
    mockAll();
    vi.spyOn(paymentChargeService, 'getReversals').mockResolvedValue([{ attemptId: 1 }]);
    const store = makeStore();
    await store.dispatch(loadPaymentDates());
    const state = store.getState().paymentDate;
    expect([state.items.length, state.plans.length, state.customers.length, state.reversals.length]).toEqual([1, 1, 1, 1]);
    expect(state.loading).toBe(false);
  });

  it('a falha nos estornos não derruba a tela', async () => {
    mockAll();
    vi.spyOn(paymentChargeService, 'getReversals').mockRejectedValue(new Error('x'));
    const store = makeStore();
    await store.dispatch(loadPaymentDates());
    expect(store.getState().paymentDate.error).toBeNull();
    expect(store.getState().paymentDate.reversals).toEqual([]);
  });

  it('registra o erro quando a lista principal falha', async () => {
    mockAll();
    vi.spyOn(paymentDateService, 'getAll').mockRejectedValue({ response: { data: { message: 'boom' } } });
    vi.spyOn(paymentChargeService, 'getReversals').mockResolvedValue([]);
    const store = makeStore();
    await store.dispatch(loadPaymentDates());
    expect(store.getState().paymentDate.error).toBe('boom');
  });

  it('guarda as cobranças por cliente, vazias se falhar', async () => {
    const spy = vi.spyOn(paymentChargeService, 'getByCustomer').mockResolvedValueOnce([{ id: 9, status: 'paid' }]).mockRejectedValueOnce(new Error('x'));
    const store = makeStore();
    await store.dispatch(fetchCharges(5));
    await store.dispatch(fetchCharges(6));
    expect(spy).toHaveBeenCalledTimes(2);
    expect(store.getState().paymentDate.chargesByCustomer).toEqual({ 5: [{ id: 9, status: 'paid' }], 6: [] });
  });

  it('cria e atualiza, registrando a falha', async () => {
    const create = vi.spyOn(paymentDateService, 'create').mockResolvedValue({});
    const update = vi.spyOn(paymentDateService, 'update').mockRejectedValue({ response: { data: { message: 'inválido' } } });
    const store = makeStore();
    const payload = { customerId: 1, clinicalPlanId: 2, firstDueDate: '2026-01-01' };
    await store.dispatch(savePaymentDate({ payload }));
    await store.dispatch(savePaymentDate({ id: 8, payload }));
    expect(create).toHaveBeenCalledWith(payload);
    expect(update).toHaveBeenCalledWith(8, payload);
    expect(store.getState().paymentDate.error).toBe('inválido');
  });
});
