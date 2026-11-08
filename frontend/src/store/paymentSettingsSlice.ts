import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { paymentSettingsService } from '../services/clinicalService';
import type { PaymentConnection, PaymentMethodsSelection } from '../types/clinical';

interface PaymentSettingsState {
  connections: PaymentConnection[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  saved: boolean;
}

const initialState: PaymentSettingsState = { connections: [], loading: false, saving: false, error: null, saved: false };

const messageOf = (err: unknown): string | null =>
  (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? null;

export const fetchPaymentConnections = createAsyncThunk(
  'paymentSettings/fetch',
  async (tenantId: number | undefined, { rejectWithValue }) => {
    try {
      const rows = await paymentSettingsService.getConnections(tenantId);
      return Array.isArray(rows) ? (rows as PaymentConnection[]) : [];
    } catch {
      return rejectWithValue(null);
    }
  },
);

export const selectPaymentConnection = createAsyncThunk(
  'paymentSettings/select',
  async (selection: PaymentMethodsSelection, { dispatch, rejectWithValue }) => {
    try {
      await paymentSettingsService.select(selection);
    } catch (err) {
      return rejectWithValue(messageOf(err));
    }
    await dispatch(fetchPaymentConnections(selection.tenantId));
  },
);

const paymentSettingsSlice = createSlice({
  name: 'paymentSettings',
  initialState,
  reducers: {
    resetPaymentSettings: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPaymentConnections.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPaymentConnections.fulfilled, (state, { payload }) => { state.loading = false; state.connections = payload; })
      .addCase(fetchPaymentConnections.rejected, (state) => { state.loading = false; state.error = ''; })
      .addCase(selectPaymentConnection.pending, (state) => { state.saving = true; state.saved = false; state.error = null; })
      .addCase(selectPaymentConnection.fulfilled, (state) => { state.saving = false; state.saved = true; })
      .addCase(selectPaymentConnection.rejected, (state, { payload }) => {
        state.saving = false;
        state.error = (payload as string | null) ?? '';
      });
  },
});

export const { resetPaymentSettings } = paymentSettingsSlice.actions;
export default paymentSettingsSlice.reducer;
export type { PaymentSettingsState };
