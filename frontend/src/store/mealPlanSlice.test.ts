import { configureStore } from '@reduxjs/toolkit';
import reducer, { deleteMealPlan, fetchMealPlanById, fetchMealPlansPaginated, saveMealPlan, toggleMealPlanFavorite } from './mealPlanSlice';
import { mealPlanService } from '../services/mealPlanService';

const makeStore = () => configureStore({ reducer: { mealPlan: reducer } });
const payload = { name: 'P', category: 'KeepFit', generationStatus: 'Draft', isFavorite: false, patientId: null, nutritionistId: null, viewed: false, meals: [] };
afterEach(() => vi.restoreAllMocks());

describe('mealPlanSlice', () => {
  it('guarda a página, o total e usa padrões quando faltam', async () => {
    const page = vi.spyOn(mealPlanService, 'getPaginated').mockResolvedValueOnce({ content: [{ id: 1 }], total_pages: 3, total_elements: 25 }).mockResolvedValueOnce({});
    const store = makeStore();
    await store.dispatch(fetchMealPlansPaginated({ page: 2, size: 10, search: 'a' }));
    expect(page).toHaveBeenCalledWith({ page: 2, size: 10, search: 'a' });
    expect(store.getState().mealPlan).toMatchObject({ mealPlans: [{ id: 1 }], totalPages: 3, totalElements: 25 });
    await store.dispatch(fetchMealPlansPaginated({ page: 1, size: 10 }));
    expect(store.getState().mealPlan).toMatchObject({ mealPlans: [], totalPages: 1, totalElements: 0 });
  });

  it('guarda a mensagem da API quando a lista falha', async () => {
    vi.spyOn(mealPlanService, 'getPaginated').mockRejectedValue({ response: { data: { message: 'boom' } } });
    const store = makeStore();
    await store.dispatch(fetchMealPlansPaginated({ page: 1, size: 10 }));
    expect(store.getState().mealPlan.error).toBe('boom');
  });

  it('carrega um plano; sem resposta fica nulo', async () => {
    vi.spyOn(mealPlanService, 'getById').mockResolvedValueOnce({ id: 3 }).mockResolvedValueOnce(undefined);
    const store = makeStore();
    await store.dispatch(fetchMealPlanById(3));
    expect(store.getState().mealPlan.current).toEqual({ id: 3 });
    await store.dispatch(fetchMealPlanById(4));
    expect(store.getState().mealPlan.current).toBeNull();
  });

  it('cria sem id, atualiza com id e registra a falha', async () => {
    const create = vi.spyOn(mealPlanService, 'create').mockResolvedValue({});
    const update = vi.spyOn(mealPlanService, 'update').mockRejectedValue({});
    const store = makeStore();
    await store.dispatch(saveMealPlan({ payload }));
    await store.dispatch(saveMealPlan({ id: 5, payload }));
    expect(create).toHaveBeenCalledWith(payload);
    expect(update).toHaveBeenCalledWith(5, payload);
    expect(store.getState().mealPlan).toMatchObject({ error: '', saving: false });
  });

  it('exclui tirando da lista e alterna o favorito sem recarregar', async () => {
    vi.spyOn(mealPlanService, 'getPaginated').mockResolvedValue({ content: [{ id: 1, isFavorite: false }, { id: 2 }] });
    vi.spyOn(mealPlanService, 'delete').mockResolvedValue({});
    vi.spyOn(mealPlanService, 'toggleFavorite').mockResolvedValue({});
    const store = makeStore();
    await store.dispatch(fetchMealPlansPaginated({ page: 1, size: 10 }));
    await store.dispatch(toggleMealPlanFavorite(1));
    expect(store.getState().mealPlan.mealPlans[0].isFavorite).toBe(true);
    await store.dispatch(deleteMealPlan(2));
    expect(store.getState().mealPlan.mealPlans.map((p) => p.id)).toEqual([1]);
  });

  it('falha ao excluir guarda a mensagem', async () => {
    vi.spyOn(mealPlanService, 'delete').mockRejectedValue({ response: { data: { message: 'em uso' } } });
    const store = makeStore();
    await store.dispatch(deleteMealPlan(1));
    expect(store.getState().mealPlan.error).toBe('em uso');
  });
});
