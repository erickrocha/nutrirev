import { configureStore } from '@reduxjs/toolkit';
import reducer, { dismissCustomerListError, enableCustomerMobile, loadCustomerList } from './customerListSlice';
import { clinicalPlanService, prepareMealService } from '../services/clinicalService';
import { customerService } from '../services/customerService';

const makeStore = () => configureStore({ reducer: { customerList: reducer } });
afterEach(() => vi.restoreAllMocks());

const mockLoad = () => {
  vi.spyOn(customerService, 'getAll').mockResolvedValue([{ id: 1, name: 'Ana' }]);
  vi.spyOn(clinicalPlanService, 'getAll').mockResolvedValue([{ id: 2, name: 'Plano' }]);
  vi.spyOn(prepareMealService, 'getAll').mockResolvedValue(null);
};

describe('customerListSlice', () => {
  it('carrega clientes, planos e refeições (resposta inválida vira lista vazia)', async () => {
    mockLoad();
    const store = makeStore();
    await store.dispatch(loadCustomerList());
    expect(store.getState().customerList).toMatchObject({ customers: [{ id: 1, name: 'Ana' }], plans: [{ id: 2, name: 'Plano' }], meals: [], loading: false });
  });

  it('guarda a mensagem da API quando o carregamento falha e permite dispensar', async () => {
    mockLoad();
    vi.spyOn(customerService, 'getAll').mockRejectedValue({ response: { data: { message: 'boom' } } });
    const store = makeStore();
    await store.dispatch(loadCustomerList());
    expect(store.getState().customerList.error).toBe('boom');
    store.dispatch(dismissCustomerListError());
    expect(store.getState().customerList.error).toBeNull();
  });

  it('libera o acesso mobile, recarrega a lista e guarda o nome para o aviso', async () => {
    mockLoad();
    const enable = vi.spyOn(customerService, 'enableMobile').mockResolvedValue({});
    const store = makeStore();
    await store.dispatch(enableCustomerMobile({ id: 1, name: 'Ana' }));
    expect(enable).toHaveBeenCalledWith(1);
    expect(store.getState().customerList).toMatchObject({ enabledName: 'Ana', enabling: false, customers: [{ id: 1, name: 'Ana' }] });
  });

  it('falha ao liberar não recarrega e guarda o erro', async () => {
    mockLoad();
    vi.spyOn(customerService, 'enableMobile').mockRejectedValue({});
    const list = vi.spyOn(customerService, 'getAll');
    const store = makeStore();
    await store.dispatch(enableCustomerMobile({ id: 1, name: 'Ana' }));
    expect(store.getState().customerList).toMatchObject({ error: '', enabledName: null });
    expect(list).not.toHaveBeenCalled();
  });
});
