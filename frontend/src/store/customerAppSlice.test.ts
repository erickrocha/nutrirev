import { configureStore } from '@reduxjs/toolkit';
import reducer, { analyzeMealPhoto, loadDailySlots, loadHome, loadLogs, loadSummary, MAX_POLL_MS, POLL_INTERVAL_MS, resetAnalysis } from './customerAppSlice';
import mealPlanReducer from './mealPlanSlice';
import { customerDailyMealService, dailyMealService } from '../services/clinicalService';
import { customerService } from '../services/customerService';
import { dashboardService } from '../services/dashboardService';
import { mealAnalysisService } from '../services/mealAnalysisService';
import { mealLogService } from '../services/mealLogService';
import { mealPlanService } from '../services/mealPlanService';

const makeStore = () => configureStore({ reducer: { customerApp: reducer, mealPlan: mealPlanReducer } });
const photo = new File(['x'], 'prato.jpg', { type: 'image/jpeg' });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

const mockSlots = () => {
  vi.spyOn(dailyMealService, 'getAll').mockResolvedValue([{ id: 1, name: 'Café' }, { id: 2, name: 'Almoço' }]);
  vi.spyOn(customerDailyMealService, 'getByCustomerId').mockResolvedValue([{ daily_meal_id: 2 }]);
};

describe('customerAppSlice', () => {
  it('a tela inicial carrega o perfil, pede os planos recentes e guarda só as refeições atribuídas', async () => {
    vi.spyOn(customerService, 'getMe').mockResolvedValue({ id: 5, name: 'Ana' });
    mockSlots();
    const plans = vi.spyOn(mealPlanService, 'getPaginated').mockResolvedValue({ content: [] });
    const store = makeStore();
    await store.dispatch(loadHome());
    expect(store.getState().customerApp).toMatchObject({ customer: { id: 5 }, slots: [{ id: 2, name: 'Almoço' }], customerLoading: false, slotsError: false });
    expect(plans).toHaveBeenCalledWith({ patient_id: 5, page: 1, size: 5 });
  });

  it('falha no perfil marca erro; falha só nas refeições mantém o perfil', async () => {
    vi.spyOn(customerService, 'getMe').mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ id: 5 });
    const store = makeStore();
    await store.dispatch(loadHome());
    expect(store.getState().customerApp.customerError).toBe(true);
    vi.spyOn(mealPlanService, 'getPaginated').mockResolvedValue({ content: [] });
    vi.spyOn(dailyMealService, 'getAll').mockRejectedValue(new Error('x'));
    vi.spyOn(customerDailyMealService, 'getByCustomerId').mockResolvedValue([]);
    await store.dispatch(loadHome());
    expect(store.getState().customerApp).toMatchObject({ customerError: false, slotsError: true, customer: { id: 5 } });
  });

  it('o diário carrega só as refeições atribuídas; sem paciente, lista vazia; falha marca erro', async () => {
    mockSlots();
    vi.spyOn(customerService, 'getMe').mockResolvedValueOnce({ id: 5 }).mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('x'));
    const store = makeStore();
    await store.dispatch(loadDailySlots());
    expect(store.getState().customerApp.slots).toEqual([{ id: 2, name: 'Almoço' }]);
    await store.dispatch(loadDailySlots());
    expect(store.getState().customerApp.slots).toEqual([]);
    await store.dispatch(loadDailySlots());
    expect(store.getState().customerApp.slotsError).toBe(true);
  });

  it('resumo soma calorias e pontos; falha marca erro', async () => {
    vi.spyOn(dashboardService, 'getSummary').mockResolvedValueOnce({ calories_consumed: 800, meals_logged: 2 }).mockRejectedValueOnce(new Error('x'));
    vi.spyOn(dashboardService, 'getPoints').mockResolvedValue({ total_points: 40 });
    const store = makeStore();
    await store.dispatch(loadSummary());
    expect(store.getState().customerApp.summary).toEqual({ caloriesConsumed: 800, mealsLogged: 2, totalPoints: 40 });
    await store.dispatch(loadSummary());
    expect(store.getState().customerApp.summaryError).toBe(true);
  });

  it('refeições registradas: lista, resposta inválida vazia, falha marca erro', async () => {
    vi.spyOn(mealLogService, 'getLogsByDate').mockResolvedValueOnce([{ log_id: 1 }]).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('x'));
    const store = makeStore();
    await store.dispatch(loadLogs('2026-03-09'));
    expect(store.getState().customerApp.logs).toEqual([{ log_id: 1 }]);
    await store.dispatch(loadLogs('2026-03-09'));
    expect(store.getState().customerApp.logs).toEqual([]);
    await store.dispatch(loadLogs('2026-03-09'));
    expect(store.getState().customerApp.logsError).toBe(true);
  });

  it('análise pronta de imediato: guarda o resultado e recarrega as refeições do dia', async () => {
    const analyze = vi.spyOn(mealAnalysisService, 'analyzePhoto').mockResolvedValue({ status: 'completed', totals: { calories: 300 } });
    const logs = vi.spyOn(mealLogService, 'getLogsByDate').mockResolvedValue([]);
    const store = makeStore();
    await store.dispatch(analyzeMealPhoto({ file: photo, mealSlotId: 2, date: '2026-03-09' }));
    expect(store.getState().customerApp).toMatchObject({ analyzing: false, analysis: { totals: { calories: 300 } }, analysisFailure: null });
    const form = analyze.mock.calls[0][0] as FormData;
    expect([form.get('daily_meal_id'), form.get('meal_date')]).toEqual(['2', '2026-03-09']);
    expect(logs).toHaveBeenCalledWith('2026-03-09');
  });

  it('consulta até concluir; sem id devolve erro "noId"; erro da API traz a mensagem', async () => {
    vi.useFakeTimers();
    vi.spyOn(mealAnalysisService, 'analyzePhoto').mockResolvedValueOnce({ status: 'pending', analysis_id: 8 }).mockResolvedValueOnce({ status: 'pending' }).mockRejectedValueOnce({ response: { data: { message: 'cota excedida' } } });
    const poll = vi.spyOn(mealAnalysisService, 'getAnalysis').mockResolvedValueOnce({ status: 'pending' }).mockResolvedValueOnce({ status: 'completed', totals: {} });
    vi.spyOn(mealLogService, 'getLogsByDate').mockResolvedValue([]);
    const store = makeStore();
    const run = store.dispatch(analyzeMealPhoto({ file: photo, mealSlotId: 2, date: 'd' }));
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 2);
    await run;
    expect(poll).toHaveBeenCalledTimes(2);
    expect(store.getState().customerApp.analysis).toMatchObject({ status: 'completed' });
    await store.dispatch(analyzeMealPhoto({ file: photo, mealSlotId: 2, date: 'd' }));
    expect(store.getState().customerApp.analysisFailure).toEqual({ code: 'noId' });
    await store.dispatch(analyzeMealPhoto({ file: photo, mealSlotId: 2, date: 'd' }));
    expect(store.getState().customerApp.analysisFailure).toEqual({ code: 'api', message: 'cota excedida' });
  });

  it('passando do prazo devolve "tooLong"; abortar não mostra falha', async () => {
    vi.useFakeTimers();
    vi.spyOn(mealAnalysisService, 'analyzePhoto').mockResolvedValue({ status: 'pending', analysis_id: 8 });
    vi.spyOn(mealAnalysisService, 'getAnalysis').mockResolvedValue({ status: 'pending' });
    const store = makeStore();
    const slow = store.dispatch(analyzeMealPhoto({ file: photo, mealSlotId: 2, date: 'd' }));
    await vi.advanceTimersByTimeAsync(MAX_POLL_MS + POLL_INTERVAL_MS);
    await slow;
    expect(store.getState().customerApp.analysisFailure).toEqual({ code: 'tooLong' });

    const aborted = store.dispatch(analyzeMealPhoto({ file: photo, mealSlotId: 2, date: 'd' }));
    aborted.abort();
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    await aborted;
    expect(store.getState().customerApp.analysisFailure).toBeNull();
    store.dispatch(resetAnalysis());
    expect(store.getState().customerApp.analysis).toBeNull();
  });
});
