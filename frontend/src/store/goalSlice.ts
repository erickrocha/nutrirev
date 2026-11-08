import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  activityFactorService, customerGoalSettingService, formulaService, objectiveService, physicalActivityLevelService,
} from '../services/clinicalService';
import { customerService } from '../services/customerService';
import type { CatalogOption } from '../types/customer';
import type { GoalPayload, GoalSetting } from '../types/goal';

interface GoalState {
  goals: GoalSetting[];
  customers: Array<CatalogOption & { email?: string }>;
  formulas: CatalogOption[];
  activityFactors: CatalogOption[];
  objectives: CatalogOption[];
  activityLevels: CatalogOption[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: GoalState = {
  goals: [], customers: [], formulas: [], activityFactors: [], objectives: [], activityLevels: [], loading: false, saving: false, error: null,
};

const list = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const messageOf = (err: unknown): string => (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '';

export const loadGoals = createAsyncThunk('goal/load', async (_: void, { rejectWithValue }) => {
  try {
    const [goals, customers, formulas, activityFactors, objectives, activityLevels] = await Promise.all([
      customerGoalSettingService.getAll(), customerService.getAll(), formulaService.getAll(),
      activityFactorService.getAll(), objectiveService.getAll(), physicalActivityLevelService.getAll(),
    ]);
    return {
      goals: list<GoalSetting>(goals), customers: list<GoalState['customers'][number]>(customers), formulas: list<CatalogOption>(formulas),
      activityFactors: list<CatalogOption>(activityFactors), objectives: list<CatalogOption>(objectives), activityLevels: list<CatalogOption>(activityLevels),
    };
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

export const saveGoal = createAsyncThunk(
  'goal/save',
  async ({ id, payload }: { id?: number; payload: GoalPayload }, { rejectWithValue }) => {
    try {
      return id === undefined ? await customerGoalSettingService.create(payload) : await customerGoalSettingService.update(id, payload);
    } catch (err) {
      return rejectWithValue(messageOf(err));
    }
  },
);

const slice = createSlice({
  name: 'goal',
  initialState,
  reducers: { clearGoalError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(loadGoals.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loadGoals.fulfilled, (state, { payload }) => { state.loading = false; Object.assign(state, payload); })
      // Mensagem vazia: a API não explicou; a tela mostra o texto padrão traduzido.
      .addCase(loadGoals.rejected, (state, { payload }) => { state.loading = false; state.error = (payload as string) ?? ''; })
      .addCase(saveGoal.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(saveGoal.fulfilled, (state) => { state.saving = false; })
      .addCase(saveGoal.rejected, (state, { payload }) => { state.saving = false; state.error = (payload as string) ?? ''; });
  },
});

export const { clearGoalError } = slice.actions;
export default slice.reducer;
export type { GoalState };
