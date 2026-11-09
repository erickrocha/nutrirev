import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { clinicalPlanService, paymentChargeService, paymentDateService } from '../services/clinicalService';
import { customerService } from '../services/customerService';
import type { ClinicalPlan, PaymentCharge, PaymentDate, PaymentDatePayload, PaymentReversal } from '../types/clinical';
import type { Customer } from '../types/customer';

interface PaymentDateState {
  items: PaymentDate[];
  plans: ClinicalPlan[];
  customers: Customer[];
  reversals: PaymentReversal[];
  chargesByCustomer: Record<number, PaymentCharge[]>;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: PaymentDateState = {
  items: [], plans: [], customers: [], reversals: [], chargesByCustomer: {}, loading: false, saving: false, error: null,
};

const messageOf = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;
const list = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export const loadPaymentDates = createAsyncThunk('paymentDate/load', async (_: void, { rejectWithValue }) => {
  try {
    const [items, plans, customers, reversals] = await Promise.all([
      paymentDateService.getAll(),
      clinicalPlanService.getAll(),
      customerService.getAll(),
      // Estornos nunca derrubam a tela: são um aviso, não o motivo de abri-la.
      paymentChargeService.getReversals().catch(() => []),
    ]);
    return {
      items: list<PaymentDate>(items), plans: list<ClinicalPlan>(plans),
      customers: list<Customer>(customers), reversals: list<PaymentReversal>(reversals),
    };
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Falha ao carregar datas de pagamento'));
  }
});

// As cobranças são buscadas por cliente só quando a linha é aberta: a lista pode ser longa.
export const fetchCharges = createAsyncThunk('paymentDate/charges', async (customerId: number) => {
  try {
    return { customerId, charges: list<PaymentCharge>(await paymentChargeService.getByCustomer(customerId)) };
  } catch {
    return { customerId, charges: [] as PaymentCharge[] };
  }
});

export const savePaymentDate = createAsyncThunk(
  'paymentDate/save',
  async ({ id, payload }: { id?: number; payload: PaymentDatePayload }, { rejectWithValue }) => {
    try {
      return id === undefined ? await paymentDateService.create(payload) : await paymentDateService.update(id, payload);
    } catch (err) {
      return rejectWithValue(messageOf(err, 'Falha ao salvar data de pagamento'));
    }
  },
);

const paymentDateSlice = createSlice({
  name: 'paymentDate',
  initialState,
  reducers: { clearPaymentDateError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(loadPaymentDates.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loadPaymentDates.fulfilled, (state, { payload }) => {
        state.loading = false;
        Object.assign(state, payload);
      })
      .addCase(loadPaymentDates.rejected, (state, { payload }) => { state.loading = false; state.error = (payload as string) ?? 'Erro'; })
      .addCase(fetchCharges.fulfilled, (state, { payload }) => { state.chargesByCustomer[payload.customerId] = payload.charges; })
      .addCase(savePaymentDate.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(savePaymentDate.fulfilled, (state) => { state.saving = false; })
      .addCase(savePaymentDate.rejected, (state, { payload }) => { state.saving = false; state.error = (payload as string) ?? 'Erro'; });
  },
});

export const { clearPaymentDateError } = paymentDateSlice.actions;
export default paymentDateSlice.reducer;
export type { PaymentDateState };
