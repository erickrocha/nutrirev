import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { paymentService } from '../services/paymentService';
import type { CardData, CardOutcome, MyCharge, OfferedMethods, PixAttemptState, PixCharge } from '../types/payment';

interface PaymentState {
  charges: MyCharge[];
  loading: boolean;
  error: string | null;
  offered: OfferedMethods;
  submitting: boolean;
}

// Enquanto a lista da clínica não chega, só o cartão aparece: é o método que toda adquirente aceita.
const initialState: PaymentState = { charges: [], loading: false, error: null, offered: { credit: true, pix: false, recurring: false }, submitting: false };

interface ApiError { response?: { data?: { errorKey?: string; message?: string; error?: string } } }
const errorKeyOf = (err: unknown): string | undefined => (err as ApiError).response?.data?.errorKey;
const messageOf = (err: unknown): string => {
  const data = (err as ApiError).response?.data;
  return data?.message || data?.error || '';
};

export const fetchMyCharges = createAsyncThunk('payment/fetchMyCharges', async (_: void, { rejectWithValue }) => {
  try {
    const data = await paymentService.getMyCharges();
    return Array.isArray(data) ? (data as MyCharge[]) : [];
  } catch {
    return rejectWithValue('load');
  }
});

// Falhar ao consultar os métodos mantém o padrão (só cartão).
export const fetchOfferedMethods = createAsyncThunk('payment/fetchOfferedMethods', async (_: void, { rejectWithValue }) => {
  try {
    return (await paymentService.getOfferedMethods()) as OfferedMethods;
  } catch {
    return rejectWithValue('load');
  }
});

interface CardPaymentArgs {
  chargeId: number;
  idempotencyKey: string;
  card: CardData;
  /** Quando há assinatura e o paciente aceitou, guarda o cartão para cobrança automática. */
  recurringSubscriptionId: number | null;
  taxId: string;
}

/**
 * Reserva a tentativa e autoriza o cartão. Os dados do cartão seguem uma única vez e nunca são guardados.
 * Salvar o cartão vem depois do pagamento e sua falha nunca derruba o pagamento já aprovado.
 */
export const payWithCard = createAsyncThunk<CardOutcome, CardPaymentArgs>('payment/payWithCard', async (args) => {
  try {
    const attempt = (await paymentService.prepare({ chargeId: args.chargeId, idempotencyKey: args.idempotencyKey, method: 'credit', installments: 1 })) as { attemptId?: number; attempt_id?: number };
    const result = (await paymentService.authorize({ attemptId: attempt.attemptId ?? (attempt.attempt_id as number), ...args.card })) as { status: string };

    if (result.status === 'authorized' || result.status === 'captured') {
      let recurrenceFailed = false;
      let taxIdRequired = false;
      if (args.recurringSubscriptionId) {
        try {
          await paymentService.enableRecurring({ subscriptionId: args.recurringSubscriptionId, ...args.card, taxId: args.taxId });
        } catch (err) {
          recurrenceFailed = true;
          taxIdRequired = errorKeyOf(err) === 'PaymentTaxIdRequired';
        }
      }
      return { kind: 'approved', recurrenceFailed, taxIdRequired };
    }
    return result.status === 'unknown' ? { kind: 'uncertain' } : { kind: 'declined' };
  } catch (err) {
    if (errorKeyOf(err) === 'PaymentTaxIdRequired') return { kind: 'taxIdRequired' };
    return { kind: 'error', message: messageOf(err) };
  }
});

export interface PixIssued { pix: PixCharge | null; taxIdRequired: boolean; error: string | null }

export const createPixCharge = createAsyncThunk<PixIssued, { chargeId: number; idempotencyKey: string; taxId: string }>('payment/createPix', async (args) => {
  try {
    return { pix: (await paymentService.createPixCharge(args)) as PixCharge, taxIdRequired: false, error: null };
  } catch (err) {
    // O documento é pedido no pagamento, não no cadastro: o primeiro Pix é onde ele aparece.
    if (errorKeyOf(err) === 'PaymentTaxIdRequired') return { pix: null, taxIdRequired: true, error: null };
    return { pix: null, taxIdRequired: false, error: messageOf(err) };
  }
});

// Uma consulta que falha não é um pagamento que falhou: a próxima tentativa tenta de novo.
export const pollPixAttempt = createAsyncThunk('payment/pollPix', async (attemptId: number) => {
  try {
    return (await paymentService.getAttempt(attemptId)) as PixAttemptState;
  } catch {
    return null;
  }
});

// Só uma tentativa viva pode reservar a cobrança: abandonar o QR sem cancelar travaria o pagamento por qualquer método.
export const cancelPixAttempt = createAsyncThunk('payment/cancelPix', async (attemptId: number) => {
  try {
    await paymentService.cancelAttempt(attemptId);
  } catch {
    // quem falhou aqui é recuperado pela rotina de expiração do servidor
  }
});

const slice = createSlice({
  name: 'payment',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyCharges.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchMyCharges.fulfilled, (state, { payload }) => { state.loading = false; state.charges = payload; })
      .addCase(fetchMyCharges.rejected, (state) => { state.loading = false; state.error = 'load'; })
      .addCase(fetchOfferedMethods.fulfilled, (state, { payload }) => { state.offered = payload; })
      .addCase(payWithCard.pending, (state) => { state.submitting = true; })
      .addCase(payWithCard.fulfilled, (state) => { state.submitting = false; })
      .addCase(payWithCard.rejected, (state) => { state.submitting = false; });
  },
});

export default slice.reducer;
export type { PaymentState };
