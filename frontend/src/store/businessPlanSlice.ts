import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { businessPlanService } from '../services/businessPlanService';
import type { BusinessPlan, BusinessPlanPayload } from '../types/businessPlan';

interface BusinessPlanState {
  plans: BusinessPlan[];
  current: BusinessPlan | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: BusinessPlanState = { plans: [], current: null, loading: false, saving: false, error: null };

// Mensagem vazia: a API não explicou; a tela mostra o texto padrão traduzido.
const messageOf = (err: unknown): string => (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '';

export const fetchBusinessPlans = createAsyncThunk('businessPlan/fetchAll', async (_: void, { rejectWithValue }) => {
  try {
    const data = await businessPlanService.getPlans();
    return Array.isArray(data) ? (data as BusinessPlan[]) : [];
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

export const fetchBusinessPlan = createAsyncThunk('businessPlan/fetchOne', async (id: number, { rejectWithValue }) => {
  try {
    return ((await businessPlanService.getPlan(id)) ?? null) as BusinessPlan | null;
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

export const saveBusinessPlan = createAsyncThunk(
  'businessPlan/save',
  async ({ id, payload }: { id?: number; payload: BusinessPlanPayload }, { rejectWithValue }) => {
    try {
      return id === undefined ? await businessPlanService.createPlan(payload) : await businessPlanService.updatePlan(id, payload);
    } catch (err) {
      return rejectWithValue(messageOf(err));
    }
  },
);

export const deleteBusinessPlan = createAsyncThunk('businessPlan/delete', async (id: number, { dispatch, rejectWithValue }) => {
  try {
    await businessPlanService.deletePlan(id);
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
  await dispatch(fetchBusinessPlans());
});

const slice = createSlice({
  name: 'businessPlan',
  initialState,
  reducers: { clearBusinessPlanError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBusinessPlans.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchBusinessPlans.fulfilled, (state, { payload }) => { state.loading = false; state.plans = payload; })
      .addCase(fetchBusinessPlans.rejected, (state, { payload }) => { state.loading = false; state.error = (payload as string) ?? ''; })
      .addCase(fetchBusinessPlan.pending, (state) => { state.loading = true; state.error = null; state.current = null; })
      .addCase(fetchBusinessPlan.fulfilled, (state, { payload }) => { state.loading = false; state.current = payload; })
      .addCase(fetchBusinessPlan.rejected, (state, { payload }) => { state.loading = false; state.error = (payload as string) ?? ''; })
      .addCase(saveBusinessPlan.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(saveBusinessPlan.fulfilled, (state) => { state.saving = false; })
      .addCase(saveBusinessPlan.rejected, (state, { payload }) => { state.saving = false; state.error = (payload as string) ?? ''; })
      .addCase(deleteBusinessPlan.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(deleteBusinessPlan.fulfilled, (state) => { state.saving = false; })
      .addCase(deleteBusinessPlan.rejected, (state, { payload }) => { state.saving = false; state.error = (payload as string) ?? ''; });
  },
});

export const { clearBusinessPlanError } = slice.actions;
export default slice.reducer;
export type { BusinessPlanState };
