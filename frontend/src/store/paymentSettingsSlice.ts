import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { paymentSettingsService } from '../services/clinicalService';
import type { PaymentConnection, PaymentMethodsSelection, PaymentSettingsResponse, SavePaymentSettings } from '../types/clinical';

interface PaymentSettingsState {
  settings: PaymentSettingsResponse | null;
  connections: PaymentConnection[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  saved: boolean;
}

const initialState: PaymentSettingsState = {
  settings: null,
  connections: [],
  loading: false,
  saving: false,
  error: null,
  saved: false,
};

const messageOf = (err: unknown): string | null =>
  (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? null;

export const fetchPaymentSettings = createAsyncThunk(
  'paymentSettings/fetchSettings',
  async (tenantId: number | undefined, { rejectWithValue }) => {
    try {
      const data = await paymentSettingsService.getSettings(tenantId);
      return data as PaymentSettingsResponse;
    } catch {
      return rejectWithValue(null);
    }
  },
);

export const savePaymentSettings = createAsyncThunk(
  'paymentSettings/saveSettings',
  async (payload: SavePaymentSettings, { dispatch, rejectWithValue }) => {
    try {
      const data = await paymentSettingsService.saveSettings(payload);
      await dispatch(fetchPaymentSettings(payload.tenantId ?? undefined));
      return data as PaymentSettingsResponse;
    } catch (err) {
      return rejectWithValue(messageOf(err));
    }
  },
);

export const fetchPaymentConnections = createAsyncThunk(
  'paymentSettings/fetch',
  async (tenantId: number | undefined, { dispatch, rejectWithValue }) => {
    try {
      await dispatch(fetchPaymentSettings(tenantId));
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
      await dispatch(fetchPaymentSettings(selection.tenantId));
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
    clearPaymentSettingsStatus: (state) => {
      state.error = null;
      state.saved = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPaymentSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentSettings.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.settings = payload;
      })
      .addCase(fetchPaymentSettings.rejected, (state) => {
        state.loading = false;
        state.error = '';
      })
      .addCase(savePaymentSettings.pending, (state) => {
        state.saving = true;
        state.saved = false;
        state.error = null;
      })
      .addCase(savePaymentSettings.fulfilled, (state, { payload }) => {
        state.saving = false;
        state.saved = true;
        state.settings = payload;
      })
      .addCase(savePaymentSettings.rejected, (state, { payload }) => {
        state.saving = false;
        state.error = (payload as string | null) ?? '';
      })
      .addCase(fetchPaymentConnections.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentConnections.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.connections = payload;
      })
      .addCase(fetchPaymentConnections.rejected, (state) => {
        state.loading = false;
        state.error = '';
      })
      .addCase(selectPaymentConnection.pending, (state) => {
        state.saving = true;
        state.saved = false;
        state.error = null;
      })
      .addCase(selectPaymentConnection.fulfilled, (state) => {
        state.saving = false;
        state.saved = true;
      })
      .addCase(selectPaymentConnection.rejected, (state, { payload }) => {
        state.saving = false;
        state.error = (payload as string | null) ?? '';
      });
  },
});

export const { resetPaymentSettings, clearPaymentSettingsStatus } = paymentSettingsSlice.actions;
export default paymentSettingsSlice.reducer;
export type { PaymentSettingsState };
