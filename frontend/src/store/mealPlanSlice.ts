import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { mealPlanService } from '../services/mealPlanService';
import type { MealPlan, MealPlanPayload, PagedResponse } from '../types/mealPlan';

interface MealPlanState {
  mealPlans: MealPlan[];
  current: MealPlan | null;
  totalPages: number;
  totalElements: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: MealPlanState = { mealPlans: [], current: null, totalPages: 1, totalElements: 0, loading: false, saving: false, error: null };

// Mensagem vazia: a API não explicou; a tela mostra o texto padrão traduzido.
const messageOf = (err: unknown): string => (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '';

export interface MealPlanQuery { page: number; size: number; search?: string; category?: string; patient_id?: number }

export const fetchMealPlansPaginated = createAsyncThunk('mealPlan/fetchPaginated', async (params: MealPlanQuery, { rejectWithValue }) => {
  try {
    return (await mealPlanService.getPaginated(params)) as PagedResponse<MealPlan>;
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

export const fetchMealPlanById = createAsyncThunk('mealPlan/fetchById', async (id: number, { rejectWithValue }) => {
  try {
    return ((await mealPlanService.getById(id)) ?? null) as MealPlan | null;
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

export const saveMealPlan = createAsyncThunk('mealPlan/save', async ({ id, payload }: { id?: number; payload: MealPlanPayload }, { rejectWithValue }) => {
  try {
    return id === undefined ? await mealPlanService.create(payload) : await mealPlanService.update(id, payload);
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

export const deleteMealPlan = createAsyncThunk('mealPlan/delete', async (id: number, { rejectWithValue }) => {
  try {
    await mealPlanService.delete(id);
    return id;
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

export const toggleMealPlanFavorite = createAsyncThunk('mealPlan/toggleFavorite', async (id: number, { rejectWithValue }) => {
  try {
    await mealPlanService.toggleFavorite(id);
    return id;
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

const slice = createSlice({
  name: 'mealPlan',
  initialState,
  reducers: { clearMealPlanError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMealPlansPaginated.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchMealPlansPaginated.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.mealPlans = payload.content || [];
        state.totalPages = payload.total_pages || 1;
        state.totalElements = payload.total_elements || 0;
      })
      .addCase(fetchMealPlansPaginated.rejected, (state, { payload }) => { state.loading = false; state.error = (payload as string) ?? ''; })
      .addCase(fetchMealPlanById.pending, (state) => { state.loading = true; state.error = null; state.current = null; })
      .addCase(fetchMealPlanById.fulfilled, (state, { payload }) => { state.loading = false; state.current = payload; })
      .addCase(fetchMealPlanById.rejected, (state, { payload }) => { state.loading = false; state.error = (payload as string) ?? ''; })
      .addCase(saveMealPlan.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(saveMealPlan.fulfilled, (state) => { state.saving = false; })
      .addCase(saveMealPlan.rejected, (state, { payload }) => { state.saving = false; state.error = (payload as string) ?? ''; })
      .addCase(deleteMealPlan.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(deleteMealPlan.fulfilled, (state, { payload }) => { state.saving = false; state.mealPlans = state.mealPlans.filter((plan) => plan.id !== payload); })
      .addCase(deleteMealPlan.rejected, (state, { payload }) => { state.saving = false; state.error = (payload as string) ?? ''; })
      .addCase(toggleMealPlanFavorite.fulfilled, (state, { payload }) => {
        const plan = state.mealPlans.find((item) => item.id === payload);
        if (plan) plan.isFavorite = !plan.isFavorite;
      });
  },
});

export const { clearMealPlanError } = slice.actions;
export default slice.reducer;
export type { MealPlanState };
