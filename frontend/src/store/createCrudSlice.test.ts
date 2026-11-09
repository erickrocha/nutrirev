import { configureStore } from '@reduxjs/toolkit';
import { createCrudSlice } from './createCrudSlice';

const service = () => ({ getAll: vi.fn(), create: vi.fn(), update: vi.fn() });
const setup = (svc = service()) => {
  const crud = createCrudSlice<{ id: number }, { name: string }>('thing', svc);
  return { svc, crud, store: configureStore({ reducer: { thing: crud.reducer } }) };
};

describe('createCrudSlice', () => {
  it('guarda a lista e trata resposta que não é lista como vazia', async () => {
    const { svc, crud, store } = setup();
    svc.getAll.mockResolvedValueOnce([{ id: 1 }]);
    await store.dispatch(crud.fetchAll());
    expect(store.getState().thing.items).toEqual([{ id: 1 }]);
    svc.getAll.mockResolvedValueOnce(null);
    await store.dispatch(crud.fetchAll());
    expect(store.getState().thing.items).toEqual([]);
  });

  it('registra a mensagem da API quando a lista falha e permite limpar', async () => {
    const { svc, crud, store } = setup();
    svc.getAll.mockRejectedValue({ response: { data: { message: 'boom' } } });
    await store.dispatch(crud.fetchAll());
    expect(store.getState().thing.error).toBe('boom');
    store.dispatch(crud.clearError());
    expect(store.getState().thing.error).toBeNull();
  });

  it('cria sem id e atualiza com id', async () => {
    const { svc, crud, store } = setup();
    svc.create.mockResolvedValue({}); svc.update.mockResolvedValue({});
    await store.dispatch(crud.save({ payload: { name: 'A' } }));
    await store.dispatch(crud.save({ id: 4, payload: { name: 'B' } }));
    expect(svc.create).toHaveBeenCalledWith({ name: 'A' });
    expect(svc.update).toHaveBeenCalledWith(4, { name: 'B' });
    expect(store.getState().thing.saving).toBe(false);
  });

  it('registra a falha ao salvar', async () => {
    const { svc, crud, store } = setup();
    svc.create.mockRejectedValue({});
    await store.dispatch(crud.save({ payload: { name: 'A' } }));
    expect(store.getState().thing.error).toBe('Falha ao salvar registro');
    expect(store.getState().thing.saving).toBe(false);
  });
});
