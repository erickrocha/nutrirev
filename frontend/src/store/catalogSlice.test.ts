import { configureStore } from '@reduxjs/toolkit';
import reducer, { fetchCatalog, saveCatalogItem } from './catalogSlice';
import { findCatalog } from '../config/catalogs';

const service = () => findCatalog('bowel_function')!.service;
const makeStore = () => configureStore({ reducer: { catalog: reducer } });

afterEach(() => vi.restoreAllMocks());

describe('catalogSlice', () => {
  it('guarda os registros pela chave do catálogo', async () => {
    vi.spyOn(service(), 'getAll').mockResolvedValue([{ id: 1, name: 'Normal' }]);
    const store = makeStore();
    await store.dispatch(fetchCatalog('bowel_function'));
    expect(store.getState().catalog.items.bowel_function).toEqual([{ id: 1, name: 'Normal' }]);
    expect(store.getState().catalog.loading.bowel_function).toBe(false);
  });

  it('trata resposta que não é lista como vazia e registra erro da API', async () => {
    vi.spyOn(service(), 'getAll').mockResolvedValueOnce(null);
    const store = makeStore();
    await store.dispatch(fetchCatalog('bowel_function'));
    expect(store.getState().catalog.items.bowel_function).toEqual([]);

    vi.spyOn(service(), 'getAll').mockRejectedValueOnce({ response: { data: { message: 'boom' } } });
    await store.dispatch(fetchCatalog('bowel_function'));
    expect(store.getState().catalog.error.bowel_function).toBe('boom');
  });

  it('cria sem id e atualiza com id', async () => {
    const create = vi.spyOn(service(), 'create').mockResolvedValue({});
    const update = vi.spyOn(service(), 'update').mockResolvedValue({});
    const store = makeStore();
    await store.dispatch(saveCatalogItem({ key: 'bowel_function', name: 'A' }));
    await store.dispatch(saveCatalogItem({ key: 'bowel_function', id: 3, name: 'B' }));
    expect(create).toHaveBeenCalledWith({ name: 'A' });
    expect(update).toHaveBeenCalledWith(3, { name: 'B' });
    expect(store.getState().catalog.saving).toBe(false);
  });

  it('registra a falha ao salvar', async () => {
    vi.spyOn(service(), 'create').mockRejectedValue({ response: { data: { message: 'duplicado' } } });
    const store = makeStore();
    await store.dispatch(saveCatalogItem({ key: 'bowel_function', name: 'A' }));
    expect(store.getState().catalog.error.bowel_function).toBe('duplicado');
  });
});
