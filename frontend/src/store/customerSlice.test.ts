import { configureStore } from '@reduxjs/toolkit';
import reducer, { fetchAllCustomers } from './customerSlice';
import { customerService } from '../services/customerService';

afterEach(() => vi.restoreAllMocks());
const make = () => configureStore({ reducer: { customer: reducer } });

describe('customerSlice', () => {
  it('guarda a lista de pacientes', async () => {
    vi.spyOn(customerService, 'getAll').mockResolvedValue([{ id: 1, name: 'Ana' }]);
    const store = make();
    await store.dispatch(fetchAllCustomers());
    expect(store.getState().customer).toEqual({ allCustomers: [{ id: 1, name: 'Ana' }], loading: false, error: null });
  });

  it('registra o erro e limpa em nova tentativa', async () => {
    const get = vi.spyOn(customerService, 'getAll').mockRejectedValueOnce({ response: { data: { message: 'Fora do ar' } } });
    const store = make();
    await store.dispatch(fetchAllCustomers());
    expect(store.getState().customer.error).toBe('Fora do ar');
    get.mockResolvedValue([]);
    await store.dispatch(fetchAllCustomers());
    expect(store.getState().customer).toMatchObject({ error: null, allCustomers: [] });
  });
});
