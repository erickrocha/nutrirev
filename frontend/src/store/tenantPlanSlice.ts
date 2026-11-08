import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { businessPlanService } from '../services/businessPlanService';
import { tenantService } from '../services/tenantService';
import type { BusinessPlan } from '../types/businessPlan';
import type { TenantPlan } from '../types/tenant';

interface TenantPlanState {
  businessPlans: BusinessPlan[];
  activePlan: TenantPlan | null;
  loading: boolean;
}

const initialState: TenantPlanState = { businessPlans: [], activePlan: null, loading: false };

// Planos e plano ativo que falham aparecem vazios: a tela segue usável e mostra "sem plano".
export const loadTenantPlan = createAsyncThunk('tenantPlan/load', async (tenantId: number) => {
  const [plans, active] = await Promise.all([
    businessPlanService.getPlans().catch(() => []),
    tenantService.getTenantActivePlan(tenantId).catch(() => null),
  ]);
  return { businessPlans: Array.isArray(plans) ? (plans as BusinessPlan[]) : [], activePlan: (active ?? null) as TenantPlan | null };
});

const slice = createSlice({
  name: 'tenantPlan',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadTenantPlan.pending, (state) => { state.loading = true; state.activePlan = null; })
      .addCase(loadTenantPlan.fulfilled, (state, { payload }) => { state.loading = false; Object.assign(state, payload); })
      .addCase(loadTenantPlan.rejected, (state) => { state.loading = false; });
  },
});

export default slice.reducer;
export type { TenantPlanState };
