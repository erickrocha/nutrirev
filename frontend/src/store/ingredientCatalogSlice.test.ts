import { configureStore } from '@reduxjs/toolkit';
import reducer, { deleteIngredient, loadIngredient, saveIngredient, searchIngredientPage } from './ingredientCatalogSlice';
import { ingredientService } from '../services/ingredientService';

const makeStore = () => configureStore({ reducer: { ingredientCatalog: reducer } });
afterEach(() => vi.restoreAllMocks());

describe('ingredientCatalogSlice', () => {
  it('busca a página com offset calculado e guarda itens e total', async () => {
    const search = vi.spyOn(ingredientService, 'search').mockResolvedValue({ items: [{ id: 1 }], total: 31 });
    const store = makeStore();
    await store.dispatch(searchIngredientPage({ q: 'arroz', lang: 'pt', page: 3, pageSize: 10 }));
    expect(search).toHaveBeenCalledWith({ q: 'arroz', lang: 'pt', limit: 10, offset: 20 });
    expect(store.getState().ingredientCatalog).toMatchObject({ items: [{ id: 1 }], total: 31, loading: false });
  });

  it('trata resposta vazia e guarda a falha da busca', async () => {
    vi.spyOn(ingredientService, 'search').mockResolvedValueOnce(null);
    const store = makeStore();
    await store.dispatch(searchIngredientPage({ q: '', lang: 'pt', page: 1, pageSize: 10 }));
    expect(store.getState().ingredientCatalog).toMatchObject({ items: [], total: 0 });
    vi.spyOn(ingredientService, 'search').mockRejectedValueOnce({ response: { data: { message: 'boom' } } });
    await store.dispatch(searchIngredientPage({ q: '', lang: 'pt', page: 1, pageSize: 10 }));
    expect(store.getState().ingredientCatalog.error).toBe('boom');
  });

  it('carrega um ingrediente pelo id', async () => {
    vi.spyOn(ingredientService, 'getById').mockResolvedValue({ id: 4, name: 'Feijão' });
    const store = makeStore();
    await store.dispatch(loadIngredient(4));
    expect(store.getState().ingredientCatalog.current).toEqual({ id: 4, name: 'Feijão' });
  });

  it('cria sem id, atualiza com id e guarda a falha com mensagem vazia quando a API não explica', async () => {
    const create = vi.spyOn(ingredientService, 'create').mockResolvedValue({});
    const update = vi.spyOn(ingredientService, 'update').mockRejectedValue({});
    const store = makeStore();
    await store.dispatch(saveIngredient({ payload: { name: 'A' } }));
    await store.dispatch(saveIngredient({ id: 2, payload: { name: 'B' } }));
    expect(create).toHaveBeenCalledWith({ name: 'A' });
    expect(update).toHaveBeenCalledWith(2, { name: 'B' });
    expect(store.getState().ingredientCatalog).toMatchObject({ error: '', saving: false });
  });

  it('exclui e registra a falha', async () => {
    const del = vi.spyOn(ingredientService, 'delete').mockRejectedValueOnce({ response: { data: { message: 'em uso' } } }).mockResolvedValueOnce({});
    const store = makeStore();
    await store.dispatch(deleteIngredient(9));
    expect(store.getState().ingredientCatalog.error).toBe('em uso');
    await store.dispatch(deleteIngredient(9));
    expect(del).toHaveBeenCalledTimes(2);
    expect(store.getState().ingredientCatalog.error).toBeNull();
  });
});
