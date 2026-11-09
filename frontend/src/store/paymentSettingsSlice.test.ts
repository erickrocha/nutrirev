import { configureStore } from '@reduxjs/toolkit';
import reducer, { fetchPaymentConnections, resetPaymentSettings, selectPaymentConnection } from './paymentSettingsSlice';
import { paymentSettingsService } from '../services/clinicalService';

const makeStore = () => configureStore({ reducer: { paymentSettings: reducer } });
const selection = { tenantId: 4, merchantId: 1, creditEnabled: true, pixEnabled: false, recurringEnabled: false };
afterEach(() => vi.restoreAllMocks());

describe('paymentSettingsSlice', () => {
  it('guarda as conexões e trata resposta que não é lista como vazia', async () => {
    const get = vi.spyOn(paymentSettingsService, 'getConnections').mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce(null);
    const store = makeStore();
    await store.dispatch(fetchPaymentConnections(4));
    expect(store.getState().paymentSettings.connections).toEqual([{ id: 1 }]);
    await store.dispatch(fetchPaymentConnections(undefined));
    expect(store.getState().paymentSettings.connections).toEqual([]);
    expect(get).toHaveBeenNthCalledWith(1, 4);
  });

  it('falha ao carregar deixa erro vazio (a tela traduz a mensagem)', async () => {
    vi.spyOn(paymentSettingsService, 'getConnections').mockRejectedValue(new Error('x'));
    const store = makeStore();
    await store.dispatch(fetchPaymentConnections(4));
    expect(store.getState().paymentSettings.error).toBe('');
    expect(store.getState().paymentSettings.loading).toBe(false);
  });

  it('salvar escolhe a conexão, recarrega e marca como salvo', async () => {
    const select = vi.spyOn(paymentSettingsService, 'select').mockResolvedValue({});
    const get = vi.spyOn(paymentSettingsService, 'getConnections').mockResolvedValue([{ id: 1, active: true }]);
    const store = makeStore();
    await store.dispatch(selectPaymentConnection(selection));
    expect(select).toHaveBeenCalledWith(selection);
    expect(get).toHaveBeenCalledWith(4);
    expect(store.getState().paymentSettings).toMatchObject({ saved: true, saving: false, connections: [{ id: 1, active: true }] });
  });

  it('salvar com falha guarda a mensagem da API e não recarrega', async () => {
    vi.spyOn(paymentSettingsService, 'select').mockRejectedValue({ response: { data: { message: 'recusado' } } });
    const get = vi.spyOn(paymentSettingsService, 'getConnections');
    const store = makeStore();
    await store.dispatch(selectPaymentConnection(selection));
    expect(store.getState().paymentSettings).toMatchObject({ error: 'recusado', saved: false, saving: false });
    expect(get).not.toHaveBeenCalled();
    store.dispatch(resetPaymentSettings());
    expect(store.getState().paymentSettings.error).toBeNull();
  });
});
