import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { tenantSubscriptionService } from '../services/tenantSubscriptionService';
import type {
  PayTenantSubscriptionCardPayload,
  TenantSubscriptionIntentResponse,
  TenantSubscriptionPaymentItem,
  TenantSubscriptionPaymentsFilter,
  TenantSubscriptionPixResponse,
  TenantSubscriptionStatus,
  TenantSubscriptionSuccess,
} from '../types/tenantSubscription';

interface TenantSubscriptionState {
  status: TenantSubscriptionStatus | null;
  loading: boolean;
  pixLoading: boolean;
  cardSubmitting: boolean;
  intentLoading: boolean;
  paymentIntent: TenantSubscriptionIntentResponse | null;
  pix: TenantSubscriptionPixResponse | null;
  payments: TenantSubscriptionPaymentItem[];
  paymentsLoading: boolean;
  paymentsFilter: TenantSubscriptionPaymentsFilter;
  error: string | null;
  lastSuccess: TenantSubscriptionSuccess | null;
}

const initialState: TenantSubscriptionState = {
  status: null,
  loading: false,
  pixLoading: false,
  cardSubmitting: false,
  intentLoading: false,
  paymentIntent: null,
  pix: null,
  payments: [],
  paymentsLoading: false,
  paymentsFilter: {},
  error: null,
  lastSuccess: null,
};

const messageOf = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

export const fetchTenantSubscriptionStatus = createAsyncThunk<
  TenantSubscriptionStatus,
  void,
  { rejectValue: string }
>('tenantSubscription/fetchStatus', async (_, { rejectWithValue }) => {
  try {
    return await tenantSubscriptionService.getStatus();
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Falha ao consultar assinatura'));
  }
});

export const createTenantSubscriptionPix = createAsyncThunk<
  TenantSubscriptionPixResponse,
  void,
  { rejectValue: string }
>('tenantSubscription/createPix', async (_, { rejectWithValue }) => {
  try {
    return await tenantSubscriptionService.createPix();
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Falha ao gerar QR Code Pix'));
  }
});

export const createTenantSubscriptionIntent = createAsyncThunk<
  TenantSubscriptionIntentResponse,
  void,
  { rejectValue: string }
>('tenantSubscription/createIntent', async (_, { rejectWithValue }) => {
  try {
    return await tenantSubscriptionService.createPaymentIntent();
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Falha ao iniciar pagamento com Stripe'));
  }
});

export const payTenantSubscriptionCard = createAsyncThunk<
  TenantSubscriptionSuccess,
  PayTenantSubscriptionCardPayload,
  { rejectValue: string }
>('tenantSubscription/payCard', async (payload, { rejectWithValue }) => {
  try {
    return await tenantSubscriptionService.payCard(payload);
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Pagamento com cartão recusado'));
  }
});

export const verifyTenantSubscriptionPayment = createAsyncThunk<
  TenantSubscriptionSuccess,
  string,
  { rejectValue: string }
>('tenantSubscription/verifyPayment', async (paymentIntentId, { rejectWithValue }) => {
  try {
    return await tenantSubscriptionService.verifyPayment(paymentIntentId);
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Falha ao verificar pagamento'));
  }
});

export const fetchTenantSubscriptionPayments = createAsyncThunk<
  TenantSubscriptionPaymentItem[],
  TenantSubscriptionPaymentsFilter | undefined,
  { rejectValue: string }
>('tenantSubscription/fetchPayments', async (filter, { rejectWithValue }) => {
  try {
    return await tenantSubscriptionService.getPayments(filter);
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Falha ao carregar histórico de pagamentos'));
  }
});

const slice = createSlice({
  name: 'tenantSubscription',
  initialState,
  reducers: {
    setSubscriptionStatus: (state, action: PayloadAction<TenantSubscriptionStatus | null>) => {
      state.status = action.payload;
    },
    clearSubscriptionError: (state) => {
      state.error = null;
    },
    resetSubscriptionPix: (state) => {
      state.pix = null;
    },
    resetSubscriptionSuccess: (state) => {
      state.lastSuccess = null;
    },
    setPaymentsFilter: (
      state,
      action: PayloadAction<TenantSubscriptionPaymentsFilter>
    ) => {
      state.paymentsFilter = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchTenantSubscriptionStatus
      .addCase(fetchTenantSubscriptionStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTenantSubscriptionStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload;
      })
      .addCase(fetchTenantSubscriptionStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Erro desconhecido';
      })
      // createTenantSubscriptionPix
      .addCase(createTenantSubscriptionPix.pending, (state) => {
        state.pixLoading = true;
        state.error = null;
      })
      .addCase(createTenantSubscriptionPix.fulfilled, (state, action) => {
        state.pixLoading = false;
        state.pix = action.payload;
      })
      .addCase(createTenantSubscriptionPix.rejected, (state, action) => {
        state.pixLoading = false;
        state.error = action.payload ?? 'Erro desconhecido';
      })
      // createTenantSubscriptionIntent
      .addCase(createTenantSubscriptionIntent.pending, (state) => {
        state.intentLoading = true;
        state.error = null;
      })
      .addCase(createTenantSubscriptionIntent.fulfilled, (state, action) => {
        state.intentLoading = false;
        state.paymentIntent = action.payload;
      })
      .addCase(createTenantSubscriptionIntent.rejected, (state, action) => {
        state.intentLoading = false;
        state.error = action.payload ?? 'Erro desconhecido';
      })
      // payTenantSubscriptionCard
      .addCase(payTenantSubscriptionCard.pending, (state) => {
        state.cardSubmitting = true;
        state.error = null;
      })
      .addCase(payTenantSubscriptionCard.fulfilled, (state, action) => {
        state.cardSubmitting = false;
        state.lastSuccess = action.payload;
        if (state.status) {
          state.status.status = 'ok';
          state.status.daysOverdue = 0;
          state.status.paymentDate = action.payload.newPaymentDate;
        }
      })
      .addCase(payTenantSubscriptionCard.rejected, (state, action) => {
        state.cardSubmitting = false;
        state.error = action.payload ?? 'Erro ao processar cartão';
      })
      // verifyTenantSubscriptionPayment
      .addCase(verifyTenantSubscriptionPayment.fulfilled, (state, action) => {
        state.lastSuccess = action.payload;
        if (state.status) {
          state.status.status = 'ok';
          state.status.daysOverdue = 0;
          state.status.paymentDate = action.payload.newPaymentDate;
        }
      })
      // fetchTenantSubscriptionPayments
      .addCase(fetchTenantSubscriptionPayments.pending, (state) => {
        state.paymentsLoading = true;
      })
      .addCase(fetchTenantSubscriptionPayments.fulfilled, (state, action) => {
        state.paymentsLoading = false;
        state.payments = action.payload;
      })
      .addCase(fetchTenantSubscriptionPayments.rejected, (state, action) => {
        state.paymentsLoading = false;
        state.error = action.payload ?? 'Erro ao carregar pagamentos';
      });
  },
});

export const {
  setSubscriptionStatus,
  clearSubscriptionError,
  resetSubscriptionPix,
  resetSubscriptionSuccess,
  setPaymentsFilter,
} = slice.actions;

export default slice.reducer;
