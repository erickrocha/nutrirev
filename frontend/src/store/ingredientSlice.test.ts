import { configureStore } from '@reduxjs/toolkit';
import reducer, { fetchCycles, fetchIngredients, fetchIngredientsByIds, searchIngredients } from './ingredientSlice';
import { cycleService } from '../services/cycleService';
import { ingredientService } from '../services/ingredientService';

const makeStore = () => configureStore({ reducer: { ingredient: reducer } });
afterEach(() => vi.restoreAllMocks());

describe('ingredientSlice', () => {
  it('guarda o último resultado e acumula o cache por id', async () => {
    const search = vi.spyOn(ingredientService, 'search').mockResolvedValueOnce({ items: [{ id: 1, name: 'A' }] }).mockResolvedValueOnce({ items: [{ id: 2, name: 'B' }] });
    const store = makeStore();
    await store.dispatch(searchIngredients({ q: 'a', lang: 'pt' }));
    await store.dispatch(searchIngredients({ q: 'b', lang: 'en', limit: 5 }));
    expect(search).toHaveBeenLastCalledWith({ q: 'b', lang: 'en', limit: 5 });
    expect(store.getState().ingredient.ingredientOptions).toEqual([{ id: 2, name: 'B' }]);
    expect(store.getState().ingredient.ingredientsList.map((i) => i.id)).toEqual([1, 2]);
  });

  it('a lista inicial usa busca vazia no idioma e falha guarda o erro', async () => {
    const search = vi.spyOn(ingredientService, 'search').mockResolvedValueOnce({ items: [] }).mockRejectedValueOnce({ response: { data: { message: 'boom' } } });
    const store = makeStore();
    await store.dispatch(fetchIngredients('en'));
    expect(search).toHaveBeenCalledWith({ q: '', lang: 'en', limit: 30 });
    await store.dispatch(fetchIngredients('en'));
    expect(store.getState().ingredient.error).toBe('boom');
  });

  it('busca por ids só o que ainda não está no cache, ignorando vazios', async () => {
    vi.spyOn(ingredientService, 'search').mockResolvedValue({ items: [{ id: 1, name: 'A' }] });
    const byIds = vi.spyOn(ingredientService, 'getByIds').mockResolvedValue([{ id: 3, name: 'C' }]);
    const store = makeStore();
    await store.dispatch(searchIngredients({}));
    await store.dispatch(fetchIngredientsByIds([1, 3, 3, null, '', '4']));
    expect(byIds).toHaveBeenCalledWith([3, 4]);
    expect(store.getState().ingredient.ingredientsList.map((i) => i.id)).toEqual([1, 3]);
  });

  it('carrega os ciclos', async () => {
    vi.spyOn(cycleService, 'getAll').mockResolvedValue([{ id: 1, name: 'Fase 1' }]);
    const store = makeStore();
    await store.dispatch(fetchCycles());
    expect(store.getState().ingredient).toMatchObject({ cyclesList: [{ id: 1, name: 'Fase 1' }], loading: false });
  });
});
