import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { clinicalPlanService, prepareMealService } from '../services/clinicalService';
import { sysAdminDashboardService } from '../services/sysAdminDashboardService';
import { tenantDashboardService } from '../services/tenantDashboardService';
import type { CatalogOption } from '../types/customer';
import type { SysAdminDashboard, TenantDashboard } from '../types/dashboard';

interface DashboardState {
  sysAdmin: SysAdminDashboard | null;
  sysAdminLoading: boolean;
  sysAdminError: string | null;
  tenant: TenantDashboard | null;
  plans: CatalogOption[];
  meals: CatalogOption[];
  tenantLoading: boolean;
  tenantError: string | null;
}

const initialState: DashboardState = {
  sysAdmin: null, sysAdminLoading: true, sysAdminError: null,
  tenant: null, plans: [], meals: [], tenantLoading: true, tenantError: null,
};

// Mensagem vazia: a API não explicou; a tela mostra o texto padrão traduzido.
const messageOf = (err: unknown): string => (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '';
const list = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export const loadSysAdminDashboard = createAsyncThunk('dashboard/loadSysAdmin', async (_: void, { rejectWithValue }) => {
  try {
    return (await sysAdminDashboardService.getDashboard()) as SysAdminDashboard;
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

// Planos e refeições só dão nome aos cartões: se falharem, o painel aparece sem eles.
export const loadTenantDashboard = createAsyncThunk('dashboard/loadTenant', async (tenantId: number | undefined, { rejectWithValue }) => {
  try {
    const [dashboard, plans, meals] = await Promise.all([
      tenantDashboardService.getDashboard(tenantId),
      clinicalPlanService.getAll().catch(() => []),
      prepareMealService.getAll().catch(() => []),
    ]);
    return { dashboard: dashboard as TenantDashboard, plans: list<CatalogOption>(plans), meals: list<CatalogOption>(meals) };
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

const slice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadSysAdminDashboard.pending, (state) => { state.sysAdminLoading = true; state.sysAdminError = null; })
      .addCase(loadSysAdminDashboard.fulfilled, (state, { payload }) => { state.sysAdminLoading = false; state.sysAdmin = payload; })
      .addCase(loadSysAdminDashboard.rejected, (state, { payload }) => { state.sysAdminLoading = false; state.sysAdminError = (payload as string) ?? ''; })
      .addCase(loadTenantDashboard.pending, (state) => { state.tenantLoading = true; state.tenantError = null; })
      .addCase(loadTenantDashboard.fulfilled, (state, { payload }) => {
        state.tenantLoading = false; state.tenant = payload.dashboard; state.plans = payload.plans; state.meals = payload.meals;
      })
      .addCase(loadTenantDashboard.rejected, (state, { payload }) => { state.tenantLoading = false; state.tenant = null; state.tenantError = (payload as string) ?? ''; });
  },
});

export default slice.reducer;
export type { DashboardState };
