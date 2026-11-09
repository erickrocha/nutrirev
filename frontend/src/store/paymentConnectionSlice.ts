import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { paymentConnectionAdminService } from '../services/clinicalService';
import type { PaymentConnectionAdmin, PaymentConnectionProvision, PaymentConnectionUpdate } from '../types/clinical';

interface PaymentConnectionState {
  connections: PaymentConnectionAdmin[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: PaymentConnectionState = { connections: [], loading: false, saving: false, error: null };

// Mensagem vazia: a API não explicou; a tela mostra o texto padrão traduzido.
const messageOf = (err: unknown): string => (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '';

export const fetchPaymentConnectionList = createAsyncThunk(
  'paymentConnection/fetch',
  async (tenantId: number | undefined, { rejectWithValue }) => {
    try {
      const rows = await paymentConnectionAdminService.list(tenantId);
      return Array.isArray(rows) ? (rows as PaymentConnectionAdmin[]) : [];
    } catch (err) {
      return rejectWithValue(messageOf(err));
    }
  },
);

export const provisionPaymentConnection = createAsyncThunk('paymentConnection/provision', async (data: PaymentConnectionProvision, { rejectWithValue }) => {
  try {
    return await paymentConnectionAdminService.provision(data);
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

export const updatePaymentConnection = createAsyncThunk(
  'paymentConnection/update',
  async ({ id, data }: { id: number; data: PaymentConnectionUpdate }, { rejectWithValue }) => {
    try {
      return await paymentConnectionAdminService.update(id, data);
    } catch (err) {
      return rejectWithValue(messageOf(err));
    }
  },
);

export const disablePaymentConnection = createAsyncThunk('paymentConnection/disable', async (id: number, { rejectWithValue }) => {
  try {
    return await paymentConnectionAdminService.disable(id);
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

export const removePaymentConnection = createAsyncThunk('paymentConnection/remove', async (id: number, { rejectWithValue }) => {
  try {
    await paymentConnectionAdminService.remove(id);
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

const slice = createSlice({
  name: 'paymentConnection',
  initialState,
  reducers: { clearPaymentConnectionError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPaymentConnectionList.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPaymentConnectionList.fulfilled, (state, { payload }) => { state.loading = false; state.connections = payload; })
      .addCase(fetchPaymentConnectionList.rejected, (state, { payload }) => { state.loading = false; state.error = (payload as string) ?? ''; })
      .addMatcher(
        (action) => /^paymentConnection\/(provision|update|disable|remove)\/pending$/.test(action.type),
        (state) => { state.saving = true; state.error = null; },
      )
      .addMatcher(
        (action) => /^paymentConnection\/(provision|update|disable|remove)\/fulfilled$/.test(action.type),
        (state) => { state.saving = false; },
      )
      .addMatcher(
        (action) => /^paymentConnection\/(provision|update|disable|remove)\/rejected$/.test(action.type),
        (state, action) => { state.saving = false; state.error = ((action as { payload?: string }).payload) ?? ''; },
      );
  },
});

export const { clearPaymentConnectionError } = slice.actions;
export default slice.reducer;
export type { PaymentConnectionState };
