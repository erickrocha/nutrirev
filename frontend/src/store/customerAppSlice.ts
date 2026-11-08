import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { customerDailyMealService, dailyMealService } from '../services/clinicalService';
import { customerService } from '../services/customerService';
import { dashboardService } from '../services/dashboardService';
import { mealAnalysisService } from '../services/mealAnalysisService';
import { mealLogService } from '../services/mealLogService';
import { fetchMealPlansPaginated } from './mealPlanSlice';
import type { DailySlot, DashboardSummary, HomeCustomer, MealAnalysis, MealLog } from '../types/customerApp';

export const POLL_INTERVAL_MS = 2000;
export const MAX_POLL_MS = 5 * 60 * 1000;

/** Códigos de erro: a tela escolhe o texto traduzido de cada um. */
export type AnalysisFailure = { code: 'noId' | 'tooLong' | 'aborted' } | { code: 'api'; message: string };

interface CustomerAppState {
  customer: HomeCustomer | null;
  customerLoading: boolean;
  customerError: boolean;
  slots: DailySlot[];
  slotsLoading: boolean;
  slotsError: boolean;
  summary: DashboardSummary | null;
  summaryLoading: boolean;
  summaryError: boolean;
  logs: MealLog[];
  logsLoading: boolean;
  logsError: boolean;
  analyzing: boolean;
  analysis: MealAnalysis | null;
  analysisFailure: AnalysisFailure | null;
}

const initialState: CustomerAppState = {
  customer: null, customerLoading: true, customerError: false,
  slots: [], slotsLoading: true, slotsError: false,
  summary: null, summaryLoading: true, summaryError: false,
  logs: [], logsLoading: true, logsError: false,
  analyzing: false, analysis: null, analysisFailure: null,
};

const list = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** Só as refeições atribuídas ao paciente. */
const assignedSlots = async (customerId: number): Promise<DailySlot[]> => {
  const [all, links] = await Promise.all([dailyMealService.getAll(), customerDailyMealService.getByCustomerId(customerId)]);
  const assigned = new Set(list<{ dailyMealId?: number; daily_meal_id?: number }>(links).map((link) => link.dailyMealId ?? link.daily_meal_id));
  return list<DailySlot>(all).filter((slot) => assigned.has(slot.id));
};

/** Perfil do paciente, planos recentes e refeições do dia: a tela inicial. */
export const loadHome = createAsyncThunk('customerApp/loadHome', async (_: void, { dispatch, rejectWithValue }) => {
  try {
    const customer = (await customerService.getMe()) as HomeCustomer | null;
    let slots: DailySlot[] | null = null;
    let slotsFailed = false;
    if (customer?.id) {
      dispatch(fetchMealPlansPaginated({ patient_id: customer.id, page: 1, size: 5 }));
      try { slots = await assignedSlots(customer.id); } catch { slotsFailed = true; }
    }
    return { customer, slots: slots ?? [], slotsFailed };
  } catch {
    return rejectWithValue('profile');
  }
});

export const loadDailySlots = createAsyncThunk('customerApp/loadDailySlots', async (_: void, { rejectWithValue }) => {
  try {
    const customer = (await customerService.getMe()) as HomeCustomer | null;
    return customer?.id ? await assignedSlots(customer.id) : [];
  } catch {
    return rejectWithValue('slots');
  }
});

export const loadSummary = createAsyncThunk('customerApp/loadSummary', async (_: void, { rejectWithValue }) => {
  try {
    const [nutrition, points] = await Promise.all([dashboardService.getSummary(), dashboardService.getPoints()]) as [
      { calories_consumed?: number; meals_logged?: number } | null, { total_points?: number } | null,
    ];
    return { caloriesConsumed: nutrition?.calories_consumed || 0, mealsLogged: nutrition?.meals_logged || 0, totalPoints: points?.total_points || 0 } as DashboardSummary;
  } catch {
    return rejectWithValue('summary');
  }
});

export const loadLogs = createAsyncThunk('customerApp/loadLogs', async (date: string, { rejectWithValue }) => {
  try {
    return list<MealLog>(await mealLogService.getLogsByDate(date));
  } catch {
    return rejectWithValue('logs');
  }
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Envia a foto e consulta o resultado até ficar pronto (ou estourar o prazo). Abortar a ação, por exemplo ao sair
 * da tela, interrompe a espera.
 */
export const analyzeMealPhoto = createAsyncThunk<MealAnalysis, { file: File; mealSlotId: number; date: string }, { rejectValue: AnalysisFailure }>(
  'customerApp/analyzeMealPhoto',
  async ({ file, mealSlotId, date }, { signal, dispatch, rejectWithValue }) => {
    try {
      const form = new FormData();
      form.append('image', file, file.name);
      form.append('daily_meal_id', String(mealSlotId));
      form.append('meal_date', date);
      let result = (await mealAnalysisService.analyzePhoto(form)) as MealAnalysis;
      if (result?.status !== 'completed') {
        if (!result?.analysis_id) return rejectWithValue({ code: 'noId' });
        const deadline = Date.now() + MAX_POLL_MS;
        while (Date.now() < deadline) {
          await wait(POLL_INTERVAL_MS);
          if (signal.aborted) return rejectWithValue({ code: 'aborted' });
          result = (await mealAnalysisService.getAnalysis(result.analysis_id as string | number)) as MealAnalysis;
          if (result?.status === 'completed') break;
        }
        if (result?.status !== 'completed') return rejectWithValue({ code: 'tooLong' });
      }
      if (signal.aborted) return rejectWithValue({ code: 'aborted' });
      dispatch(loadLogs(date));
      return result;
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue({ code: 'api', message: e.response?.data?.message || e.message || '' });
    }
  },
);

const slice = createSlice({
  name: 'customerApp',
  initialState,
  reducers: { resetAnalysis: (state) => { state.analyzing = false; state.analysis = null; state.analysisFailure = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(loadHome.pending, (state) => { state.customerLoading = true; state.customerError = false; state.slotsLoading = true; state.slotsError = false; })
      .addCase(loadHome.fulfilled, (state, { payload }) => {
        state.customerLoading = false; state.customer = payload.customer;
        state.slotsLoading = false; state.slots = payload.slots; state.slotsError = payload.slotsFailed;
      })
      .addCase(loadHome.rejected, (state) => { state.customerLoading = false; state.slotsLoading = false; state.customerError = true; })
      .addCase(loadDailySlots.pending, (state) => { state.slotsLoading = true; state.slotsError = false; })
      .addCase(loadDailySlots.fulfilled, (state, { payload }) => { state.slotsLoading = false; state.slots = payload; })
      .addCase(loadDailySlots.rejected, (state) => { state.slotsLoading = false; state.slotsError = true; })
      .addCase(loadSummary.pending, (state) => { state.summaryLoading = true; state.summaryError = false; })
      .addCase(loadSummary.fulfilled, (state, { payload }) => { state.summaryLoading = false; state.summary = payload; })
      .addCase(loadSummary.rejected, (state) => { state.summaryLoading = false; state.summaryError = true; })
      .addCase(loadLogs.pending, (state) => { state.logsLoading = true; state.logsError = false; })
      .addCase(loadLogs.fulfilled, (state, { payload }) => { state.logsLoading = false; state.logs = payload; })
      .addCase(loadLogs.rejected, (state) => { state.logsLoading = false; state.logsError = true; })
      .addCase(analyzeMealPhoto.pending, (state) => { state.analyzing = true; state.analysis = null; state.analysisFailure = null; })
      .addCase(analyzeMealPhoto.fulfilled, (state, { payload }) => { state.analyzing = false; state.analysis = payload; })
      .addCase(analyzeMealPhoto.rejected, (state, { payload }) => {
        state.analyzing = false;
        // Abortar é o paciente sair da tela: não é uma falha a mostrar.
        state.analysisFailure = payload && payload.code !== 'aborted' ? payload : null;
      });
  },
});

export const { resetAnalysis } = slice.actions;
export default slice.reducer;
export type { CustomerAppState };
