import { configureStore } from '@reduxjs/toolkit';
import reducer, {
  fetchPaymentConnections,
  fetchPaymentSettings,
  resetPaymentSettings,
  savePaymentSettings,
  selectPaymentConnection,
} from './paymentSettingsSlice';
import { paymentSettingsService } from '../services/clinicalService';

const makeStore = () => configureStore({ reducer: { paymentSettings: reducer } });
const selection = { tenantId: 4, merchantId: 1, creditEnabled: true, pixEnabled: false, recurringEnabled: false };
afterEach(() => vi.restoreAllMocks());

describe('paymentSettingsSlice', () => {
  it('busca as configurações de pagamento da Stripe', async () => {
    const mockData = {
      configured: true,
      provider: 'stripe',
      environment: 'sandbox',
      publishableKey: 'pk_test_123',
      creditEnabled: true,
      pixEnabled: true,
      recurringEnabled: false,
      supportsPix: true,
      supportsRecurring: true,
    };
    const get = vi.spyOn(paymentSettingsService, 'getSettings').mockResolvedValue(mockData);
    const store = makeStore();
    await store.dispatch(fetchPaymentSettings(4));
    expect(get).toHaveBeenCalledWith(4);
    expect(store.getState().paymentSettings.settings).toEqual(mockData);
  });

  it('salva configurações da Stripe e atualiza o estado como salvo', async () => {
    const mockData = {
      configured: true,
      provider: 'stripe',
      environment: 'sandbox',
      publishableKey: 'pk_test_updated',
      creditEnabled: true,
      pixEnabled: true,
      recurringEnabled: true,
      supportsPix: true,
      supportsRecurring: true,
    };
    const save = vi.spyOn(paymentSettingsService, 'saveSettings').mockResolvedValue(mockData);
    vi.spyOn(paymentSettingsService, 'getSettings').mockResolvedValue(mockData);
    const store = makeStore();
    await store.dispatch(
      savePaymentSettings({
        tenantId: 4,
        publishableKey: 'pk_test_updated',
        secretKey: 'sk_test_secret',
        creditEnabled: true,
        pixEnabled: true,
        recurringEnabled: true,
      }),
    );
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 4,
        publishableKey: 'pk_test_updated',
      }),
    );
    expect(store.getState().paymentSettings.saved).toBe(true);
    expect(store.getState().paymentSettings.settings).toEqual(mockData);
  });

  it('falha ao carregar deixa erro vazio (a tela traduz a mensagem)', async () => {
    vi.spyOn(paymentSettingsService, 'getSettings').mockRejectedValue(new Error('x'));
    vi.spyOn(paymentSettingsService, 'getConnections').mockRejectedValue(new Error('x'));
    const store = makeStore();
    await store.dispatch(fetchPaymentConnections(4));
    expect(store.getState().paymentSettings.error).toBe('');
    expect(store.getState().paymentSettings.loading).toBe(false);
  });

  it('salvar com falha guarda a mensagem da API', async () => {
    vi.spyOn(paymentSettingsService, 'saveSettings').mockRejectedValue({
      response: { data: { message: 'recusado' } },
    });
    const store = makeStore();
    await store.dispatch(
      savePaymentSettings({
        tenantId: 4,
        secretKey: 'sk_test_invalid',
      }),
    );
    expect(store.getState().paymentSettings).toMatchObject({ error: 'recusado', saved: false, saving: false });
    store.dispatch(resetPaymentSettings());
    expect(store.getState().paymentSettings.error).toBeNull();
  });
});
