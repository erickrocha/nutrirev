import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { tenantService } from '../services/tenantService';
import type { Tenant, TenantPayload, TenantPlanPayload } from '../types/tenant';

interface TenantState {
  activeTenant: Tenant | null;
  tenantsList: Tenant[];
  loading: boolean;
  error: string | null;
}

const initialState: TenantState = { activeTenant: null, tenantsList: [], loading: false, error: null };

const messageOf = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

export const fetchTenants = createAsyncThunk('tenant/fetchTenants', async (_: void, { rejectWithValue }) => {
  try {
    return (await tenantService.getTenants()) as Tenant[];
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Falha ao buscar tenants'));
  }
});

export const fetchTenantById = createAsyncThunk('tenant/fetchTenantById', async (id: number, { rejectWithValue, dispatch }) => {
  try {
    const tenant = (await tenantService.getTenantById(id)) as Tenant;
    dispatch(setActiveTenant(tenant));
    return tenant;
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Falha ao buscar detalhes do tenant'));
  }
});

// Aceita só o nome (uso legado do modal de SysAdmin) ou o cadastro completo.
export const createTenant = createAsyncThunk('tenant/createTenant', async (tenantData: string | TenantPayload, { rejectWithValue, dispatch }) => {
  try {
    const payload = typeof tenantData === 'string' ? { name: tenantData } : tenantData;
    const created = (await tenantService.createTenant(payload)) as Tenant;
    dispatch(fetchTenants());
    return created;
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Falha ao criar tenant'));
  }
});

export const updateTenant = createAsyncThunk(
  'tenant/updateTenant',
  async ({ id, tenantData }: { id: number; tenantData: TenantPayload }, { rejectWithValue, dispatch }) => {
    try {
      const updated = (await tenantService.updateTenant(id, tenantData)) as Tenant;
      dispatch(fetchTenants());
      return updated;
    } catch (err) {
      return rejectWithValue(messageOf(err, 'Falha ao atualizar tenant'));
    }
  },
);

export const addTenantPlan = createAsyncThunk(
  'tenant/addTenantPlan',
  async ({ id, planData }: { id: number; planData: TenantPlanPayload }, { rejectWithValue, dispatch }) => {
    try {
      const response = await tenantService.addTenantPlan(id, planData);
      dispatch(fetchTenants());
      return response;
    } catch (err) {
      return rejectWithValue(messageOf(err, 'Falha ao atualizar plano do tenant'));
    }
  },
);

const tenantSlice = createSlice({
  name: 'tenant',
  initialState,
  reducers: {
    setActiveTenant: (state, action: PayloadAction<Tenant | null | undefined>) => {
      if (action.payload) state.activeTenant = action.payload;
    },
    clearTenantError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    const failed = (state: TenantState, action: { payload: unknown }) => { state.loading = false; state.error = (action.payload as string) ?? ''; };
    builder
      .addCase(fetchTenants.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTenants.fulfilled, (state, action) => {
        state.loading = false;
        state.tenantsList = Array.isArray(action.payload) ? action.payload : [];
        if (state.activeTenant && !state.tenantsList.some((tenant) => tenant.id === state.activeTenant?.id)) state.activeTenant = null;
      })
      .addCase(fetchTenants.rejected, failed)
      .addCase(fetchTenantById.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTenantById.fulfilled, (state) => { state.loading = false; })
      .addCase(fetchTenantById.rejected, failed)
      .addCase(createTenant.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createTenant.fulfilled, (state) => { state.loading = false; })
      .addCase(createTenant.rejected, failed)
      .addCase(updateTenant.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateTenant.fulfilled, (state, action) => {
        state.loading = false;
        if (state.activeTenant?.id === action.payload?.id) state.activeTenant = { ...state.activeTenant, ...action.payload };
      })
      .addCase(updateTenant.rejected, failed)
      .addCase(addTenantPlan.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(addTenantPlan.fulfilled, (state) => { state.loading = false; })
      .addCase(addTenantPlan.rejected, failed);
  },
});

export const { setActiveTenant, clearTenantError } = tenantSlice.actions;
export default tenantSlice.reducer;
export type { TenantState };
