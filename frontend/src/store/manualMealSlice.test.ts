import { configureStore } from '@reduxjs/toolkit';
import reducer, { loadMealSlots, searchManualIngredients, submitManualAnalysis } from './manualMealSlice';
import { customerDailyMealService, dailyMealService } from '../services/clinicalService';
import { customerService } from '../services/customerService';
import { ingredientService } from '../services/ingredientService';
import { mealAnalysisService } from '../services/mealAnalysisService';

const makeStore = () => configureStore({ reducer: { manualMeal: reducer } });
const slots = [{ id: 1, name: 'Café' }, { id: 2, name: 'Almoço' }];
afterEach(() => vi.restoreAllMocks());

describe('manualMealSlice', () => {
  it('mostra só as refeições atribuídas ao cliente', async () => {
    vi.spyOn(customerService, 'getMe').mockResolvedValue({ id: 9 });
    vi.spyOn(dailyMealService, 'getAll').mockResolvedValue(slots);
    vi.spyOn(customerDailyMealService, 'getByCustomerId').mockResolvedValue([{ daily_meal_id: 2 }]);
    const store = makeStore();
    await store.dispatch(loadMealSlots());
    expect(store.getState().manualMeal.slots).toEqual([{ id: 2, name: 'Almoço' }]);
  });

  it('sem atribuição, sem cliente ou com falha na consulta, usa todas as refeições', async () => {
    vi.spyOn(dailyMealService, 'getAll').mockResolvedValue(slots);
    const link = vi.spyOn(customerDailyMealService, 'getByCustomerId');
    vi.spyOn(customerService, 'getMe').mockResolvedValue({ id: 9 });
    link.mockResolvedValueOnce([]);
    const store = makeStore();
    await store.dispatch(loadMealSlots());
    expect(store.getState().manualMeal.slots).toHaveLength(2);
    link.mockRejectedValueOnce(new Error('x'));
    await store.dispatch(loadMealSlots());
    expect(store.getState().manualMeal.slots).toHaveLength(2);
    vi.spyOn(customerService, 'getMe').mockRejectedValue(new Error('x'));
    await store.dispatch(loadMealSlots());
    expect(store.getState().manualMeal.slots).toHaveLength(2);
  });

  it('busca ingredientes (limite 25) e falha vira lista vazia', async () => {
    const search = vi.spyOn(ingredientService, 'search').mockResolvedValueOnce({ items: [{ id: 1 }] }).mockRejectedValueOnce(new Error('x'));
    const store = makeStore();
    await store.dispatch(searchManualIngredients({ q: 'arroz', lang: 'pt' }));
    expect(search).toHaveBeenCalledWith({ q: 'arroz', lang: 'pt', limit: 25 });
    expect(store.getState().manualMeal.options).toEqual([{ id: 1 }]);
    await store.dispatch(searchManualIngredients({ q: 'x', lang: 'pt' }));
    expect(store.getState().manualMeal.options).toEqual([]);
  });

  it('envia a análise e guarda o resultado; a falha guarda a mensagem', async () => {
    const analyze = vi.spyOn(mealAnalysisService, 'analyzeManual').mockResolvedValueOnce({ points_awarded: 5 }).mockRejectedValueOnce({ response: { data: { message: 'boom' } } });
    const store = makeStore();
    const payload = { daily_meal_id: 1, meal_date: '2026-03-09', items: [] };
    await store.dispatch(submitManualAnalysis(payload));
    expect(analyze).toHaveBeenCalledWith(payload);
    expect(store.getState().manualMeal.result).toEqual({ points_awarded: 5 });
    await store.dispatch(submitManualAnalysis(payload));
    expect(store.getState().manualMeal).toMatchObject({ error: 'boom', submitting: false });
  });
});
