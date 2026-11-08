import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { customerDailyMealService, dailyMealService } from '../services/clinicalService';
import { customerService } from '../services/customerService';
import { ingredientService } from '../services/ingredientService';
import { mealAnalysisService } from '../services/mealAnalysisService';
import type { Ingredient } from '../types/ingredient';

export interface MealSlot { id: number; name: string }

export interface AnalysisResult {
  points_awarded?: number | null;
  totals?: { calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number };
  items?: Array<{ name: string; estimated_grams?: number | null; calories?: number }>;
}

interface ManualMealState {
  slots: MealSlot[];
  slotsLoading: boolean;
  options: Ingredient[];
  searching: boolean;
  submitting: boolean;
  error: string | null;
  result: AnalysisResult | null;
}

const initialState: ManualMealState = { slots: [], slotsLoading: false, options: [], searching: false, submitting: false, error: null, result: null };

const list = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** Refeições do cliente; se ele não tem nenhuma atribuída (ou a consulta falha), todas as refeições do catálogo. */
export const loadMealSlots = createAsyncThunk('manualMeal/slots', async () => {
  const [me, all] = await Promise.all([
    customerService.getMe().catch(() => null) as Promise<{ id?: number } | null>,
    dailyMealService.getAll().then((value) => list<MealSlot>(value)).catch(() => [] as MealSlot[]),
  ]);
  if (!me?.id) return all;
  try {
    const links = list<{ dailyMealId?: number; daily_meal_id?: number }>(await customerDailyMealService.getByCustomerId(me.id));
    const assigned = new Set(links.map((link) => link.dailyMealId ?? link.daily_meal_id));
    const mine = all.filter((slot) => assigned.has(slot.id));
    return mine.length > 0 ? mine : all;
  } catch {
    return all;
  }
});

// Busca no servidor: sem acento, em português ou inglês.
export const searchManualIngredients = createAsyncThunk('manualMeal/search', async ({ q, lang }: { q: string; lang: string }) => {
  try {
    const data = (await ingredientService.search({ q, lang, limit: 25 })) as { items?: Ingredient[] } | null;
    return list<Ingredient>(data?.items);
  } catch {
    return [] as Ingredient[];
  }
});

export const submitManualAnalysis = createAsyncThunk(
  'manualMeal/submit',
  async (payload: ReturnType<typeof import('../utils/manualMeal').toAnalysisPayload>, { rejectWithValue }) => {
    try {
      return (await mealAnalysisService.analyzeManual(payload)) as AnalysisResult;
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(e.response?.data?.message || e.message || '');
    }
  },
);

const slice = createSlice({
  name: 'manualMeal',
  initialState,
  reducers: {
    resetManualMeal: (state) => { state.result = null; state.error = null; },
    clearManualMealError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMealSlots.pending, (state) => { state.slotsLoading = true; })
      .addCase(loadMealSlots.fulfilled, (state, { payload }) => { state.slotsLoading = false; state.slots = payload; })
      .addCase(loadMealSlots.rejected, (state) => { state.slotsLoading = false; })
      .addCase(searchManualIngredients.pending, (state) => { state.searching = true; })
      .addCase(searchManualIngredients.fulfilled, (state, { payload }) => { state.searching = false; state.options = payload; })
      .addCase(submitManualAnalysis.pending, (state) => { state.submitting = true; state.error = null; })
      .addCase(submitManualAnalysis.fulfilled, (state, { payload }) => { state.submitting = false; state.result = payload; })
      // Mensagem vazia: a API não explicou; a tela mostra o texto padrão traduzido.
      .addCase(submitManualAnalysis.rejected, (state, { payload }) => { state.submitting = false; state.error = (payload as string) ?? ''; });
  },
});

export const { resetManualMeal, clearManualMealError } = slice.actions;
export default slice.reducer;
export type { ManualMealState };
