import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { tenantService } from '../services/api';

export const fetchTenants = createAsyncThunk(
  'tenant/fetchTenants',
  async (_, { rejectWithValue }) => {
    try {
      const tenants = await tenantService.getTenants();
      return tenants;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao buscar tenants');
    }
  }
);

export const fetchTenantById = createAsyncThunk(
  'tenant/fetchTenantById',
  async (id, { rejectWithValue, dispatch }) => {
    try {
      const tenant = await tenantService.getTenantById(id);
      dispatch(setActiveTenant(tenant));
      return tenant;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao buscar detalhes do tenant');
    }
  }
);

export const createTenant = createAsyncThunk(
  'tenant/createTenant',
  async (tenantData, { rejectWithValue, dispatch }) => {
    try {
      const payload = typeof tenantData === 'string' ? { name: tenantData } : tenantData;
      const newTenant = await tenantService.createTenant(payload);
      dispatch(fetchTenants());
      return newTenant;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao criar tenant');
    }
  }
);

export const updateTenant = createAsyncThunk(
  'tenant/updateTenant',
  async ({ id, tenantData }, { rejectWithValue, dispatch }) => {
    try {
      const updatedTenant = await tenantService.updateTenant(id, tenantData);
      dispatch(fetchTenants());
      return updatedTenant;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao atualizar tenant');
    }
  }
);

export const addTenantPlan = createAsyncThunk(
  'tenant/addTenantPlan',
  async ({ id, planData }, { rejectWithValue, dispatch }) => {
    try {
      const response = await tenantService.addTenantPlan(id, planData);
      dispatch(fetchTenants());
      return response;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao atualizar plano do tenant');
    }
  }
);

const tenantSlice = createSlice({
  name: 'tenant',
  initialState: {
    activeTenant: null,
    tenantsList: [],
    loading: false,
    error: null,
  },
  reducers: {
    setActiveTenant: (state, action) => {
      const selected = action.payload;
      if (!selected) return;
      state.activeTenant = selected;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTenants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTenants.fulfilled, (state, action) => {
        state.loading = false;
        state.tenantsList = Array.isArray(action.payload) ? action.payload : [];

        if (
          state.activeTenant &&
          !state.tenantsList.some((tenant) => tenant.id === state.activeTenant.id)
        ) {
          state.activeTenant = null;
        }
      })
      .addCase(fetchTenants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchTenantById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTenantById.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(fetchTenantById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createTenant.pending, (state) => {
        state.loading = true;
      })
      .addCase(createTenant.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createTenant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateTenant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTenant.fulfilled, (state, action) => {
        state.loading = false;
        if (state.activeTenant?.id === action.payload?.id) {
          state.activeTenant = { ...state.activeTenant, ...action.payload };
        }
      })
      .addCase(updateTenant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setActiveTenant } = tenantSlice.actions;
export default tenantSlice.reducer;
