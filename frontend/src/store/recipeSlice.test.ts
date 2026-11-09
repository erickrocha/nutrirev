import { configureStore } from '@reduxjs/toolkit';
import reducer, { deleteRecipe, fetchRecipeById, fetchRecipesPaginated, saveRecipe } from './recipeSlice';
import { eatService } from '../services/eatService';

const makeStore = () => configureStore({ reducer: { recipe: reducer } });
const payload = { name: 'R', ingredients: [], directions: [], meals: [], biotypes: [], sideDishes: [] };
afterEach(() => vi.restoreAllMocks());

describe('recipeSlice', () => {
  it('guarda a página com padrões quando faltam totais; falha guarda a mensagem', async () => {
    vi.spyOn(eatService, 'getPaginated').mockResolvedValueOnce({ content: [{ id: 1 }], total_pages: 2, total_elements: 11 }).mockResolvedValueOnce({}).mockRejectedValueOnce({ response: { data: { message: 'boom' } } });
    const store = makeStore();
    await store.dispatch(fetchRecipesPaginated({ page: 1, size: 10, is_highlight: true }));
    expect(store.getState().recipe).toMatchObject({ recipes: [{ id: 1 }], totalPages: 2, totalElements: 11 });
    await store.dispatch(fetchRecipesPaginated({ page: 1, size: 10 }));
    expect(store.getState().recipe).toMatchObject({ recipes: [], totalPages: 1 });
    await store.dispatch(fetchRecipesPaginated({ page: 1, size: 10 }));
    expect(store.getState().recipe.error).toBe('boom');
  });

  it('carrega uma receita; sem resposta fica nulo', async () => {
    vi.spyOn(eatService, 'getById').mockResolvedValueOnce({ id: 3 }).mockResolvedValueOnce(undefined);
    const store = makeStore();
    await store.dispatch(fetchRecipeById(3));
    expect(store.getState().recipe.current).toEqual({ id: 3 });
    await store.dispatch(fetchRecipeById(4));
    expect(store.getState().recipe.current).toBeNull();
  });

  it('cria e envia a foto usando o id devolvido; atualiza usando o id informado', async () => {
    const create = vi.spyOn(eatService, 'create').mockResolvedValue({ id: 9 });
    const update = vi.spyOn(eatService, 'update').mockResolvedValue({});
    const upload = vi.spyOn(eatService, 'uploadPhoto').mockResolvedValue({});
    const photo = { imageBase64: 'abc', extension: 'png', contentType: 'image/png' };
    const store = makeStore();
    await store.dispatch(saveRecipe({ payload, photo }));
    expect(create).toHaveBeenCalledWith(payload);
    expect(upload).toHaveBeenCalledWith(9, photo);
    await store.dispatch(saveRecipe({ id: 4, payload, photo }));
    expect(update).toHaveBeenCalledWith(4, payload);
    expect(upload).toHaveBeenLastCalledWith(4, photo);
  });

  it('sem foto nova não envia imagem; falha ao salvar guarda a mensagem', async () => {
    vi.spyOn(eatService, 'create').mockResolvedValue({ id: 1 });
    const upload = vi.spyOn(eatService, 'uploadPhoto');
    const store = makeStore();
    await store.dispatch(saveRecipe({ payload }));
    expect(upload).not.toHaveBeenCalled();
    vi.spyOn(eatService, 'create').mockRejectedValue({ response: { data: { message: 'nome repetido' } } });
    await store.dispatch(saveRecipe({ payload }));
    expect(store.getState().recipe).toMatchObject({ error: 'nome repetido', saving: false });
  });

  it('exclui tirando da lista; falha guarda a mensagem', async () => {
    vi.spyOn(eatService, 'getPaginated').mockResolvedValue({ content: [{ id: 1 }, { id: 2 }] });
    const remove = vi.spyOn(eatService, 'delete').mockResolvedValueOnce({}).mockRejectedValueOnce({});
    const store = makeStore();
    await store.dispatch(fetchRecipesPaginated({ page: 1, size: 10 }));
    await store.dispatch(deleteRecipe(1));
    expect(store.getState().recipe.recipes.map((r) => r.id)).toEqual([2]);
    await store.dispatch(deleteRecipe(2));
    expect(remove).toHaveBeenCalledTimes(2);
    expect(store.getState().recipe.error).toBe('');
  });
});
