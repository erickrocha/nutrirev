import { configureStore } from '@reduxjs/toolkit';
import reducer, {
  disablePaymentConnection, fetchPaymentConnectionList, provisionPaymentConnection, removePaymentConnection, updatePaymentConnection,
} from './paymentConnectionSlice';
import { paymentConnectionAdminService as service } from '../services/clinicalService';

const makeStore = () => configureStore({ reducer: { paymentConnection: reducer } });
const data = { tenantId: 1, provider: 'asaas', environment: 'sandbox', merchantReference: 'm-1', credentialsSecretRef: 'secret/a' };
afterEach(() => vi.restoreAllMocks());

describe('paymentConnectionSlice', () => {
  it('lista com o filtro de clínica; resposta inválida vira lista vazia', async () => {
    const list = vi.spyOn(service, 'list').mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce(null);
    const store = makeStore();
    await store.dispatch(fetchPaymentConnectionList(4));
    expect(list).toHaveBeenCalledWith(4);
    expect(store.getState().paymentConnection.connections).toEqual([{ id: 1 }]);
    await store.dispatch(fetchPaymentConnectionList(undefined));
    expect(store.getState().paymentConnection.connections).toEqual([]);
  });

  it('guarda a mensagem da API quando a lista falha', async () => {
    vi.spyOn(service, 'list').mockRejectedValue({ response: { data: { message: 'boom' } } });
    const store = makeStore();
    await store.dispatch(fetchPaymentConnectionList(undefined));
    expect(store.getState().paymentConnection.error).toBe('boom');
  });

  it('provisiona, atualiza, desativa e remove pelo serviço do operador', async () => {
    const provision = vi.spyOn(service, 'provision').mockResolvedValue({});
    const update = vi.spyOn(service, 'update').mockResolvedValue({});
    const disable = vi.spyOn(service, 'disable').mockResolvedValue({});
    const remove = vi.spyOn(service, 'remove').mockResolvedValue(undefined);
    const store = makeStore();
    await store.dispatch(provisionPaymentConnection(data));
    await store.dispatch(updatePaymentConnection({ id: 2, data: { environment: 'production', merchantReference: 'm', credentialsSecretRef: 's' } }));
    await store.dispatch(disablePaymentConnection(2));
    await store.dispatch(removePaymentConnection(2));
    expect(provision).toHaveBeenCalledWith(data);
    expect(update).toHaveBeenCalledWith(2, { environment: 'production', merchantReference: 'm', credentialsSecretRef: 's' });
    expect(disable).toHaveBeenCalledWith(2);
    expect(remove).toHaveBeenCalledWith(2);
    expect(store.getState().paymentConnection).toMatchObject({ saving: false, error: null });
  });

  it('cada operação que falha registra a mensagem e libera o salvamento', async () => {
    vi.spyOn(service, 'disable').mockRejectedValue({ response: { data: { message: 'em uso' } } });
    vi.spyOn(service, 'remove').mockRejectedValue({});
    const store = makeStore();
    await store.dispatch(disablePaymentConnection(1));
    expect(store.getState().paymentConnection).toMatchObject({ error: 'em uso', saving: false });
    await store.dispatch(removePaymentConnection(1));
    expect(store.getState().paymentConnection.error).toBe('');
  });
});
