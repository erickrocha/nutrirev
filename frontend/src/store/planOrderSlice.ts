import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { planOrderService } from '../services/planOrderService';
import type { CreatePlanOrderPayload, PlanOrder, Province, PublicPlan } from '../types/planOrder';

interface PlanOrderState {
  orders: PlanOrder[];
  current: PlanOrder | null;
  publicPlan: PublicPlan | null;
  provinces: Province[];
  createdOrderUuid: string | null;
  loading: boolean;
  error: string | null;
  // 400 = dados inválidos; 404 = plano inexistente (telas públicas decidem a mensagem).
  errorStatus: number | null;
}

interface HttpError {
  response?: { status?: number; data?: { message?: string } };
}

const reject = (err: unknown, fallback: string) => {
  const http = err as HttpError;
  return { message: http.response?.data?.message || fallback, status: http.response?.status ?? null };
};
type Rejection = { message: string; status: number | null };

export const fetchPlanOrders = createAsyncThunk('planOrder/fetchPlanOrders', async (_: void, { rejectWithValue }) => {
  try {
    return await planOrderService.getOrders();
  } catch (err) {
    return rejectWithValue(reject(err, 'Falha ao buscar pedidos'));
  }
});

export const fetchPlanOrder = createAsyncThunk('planOrder/fetchPlanOrder', async (uuid: string, { rejectWithValue }) => {
  try {
    return await planOrderService.getOrder(uuid);
  } catch (err) {
    return rejectWithValue(reject(err, 'Falha ao buscar pedido'));
  }
});

export const convertPlanOrder = createAsyncThunk(
  'planOrder/convertPlanOrder',
  async ({ uuid, paymentDate }: { uuid: string; paymentDate: string }, { rejectWithValue }) => {
    try {
      await planOrderService.convertOrder(uuid, paymentDate);
    } catch (err) {
      return rejectWithValue(reject(err, 'Falha ao converter pedido'));
    }
  },
);

export const cancelPlanOrder = createAsyncThunk('planOrder/cancelPlanOrder', async (uuid: string, { rejectWithValue }) => {
  try {
    await planOrderService.cancelOrder(uuid);
  } catch (err) {
    return rejectWithValue(reject(err, 'Falha ao cancelar pedido'));
  }
});

export const fetchPublicPlan = createAsyncThunk('planOrder/fetchPublicPlan', async (uuid: string, { rejectWithValue }) => {
  try {
    return await planOrderService.getPublicPlan(uuid);
  } catch (err) {
    return rejectWithValue(reject(err, 'Plano não encontrado'));
  }
});

export const fetchProvinces = createAsyncThunk('planOrder/fetchProvinces', async (_: void, { rejectWithValue }) => {
  try {
    return await planOrderService.getProvinces();
  } catch (err) {
    return rejectWithValue(reject(err, 'Falha ao buscar estados'));
  }
});

export const createPlanOrder = createAsyncThunk(
  'planOrder/createPlanOrder',
  async (payload: CreatePlanOrderPayload, { rejectWithValue }) => {
    try {
      return await planOrderService.createOrder(payload);
    } catch (err) {
      return rejectWithValue(reject(err, 'Falha ao criar pedido'));
    }
  },
);

const initialState: PlanOrderState = {
  orders: [],
  current: null,
  publicPlan: null,
  provinces: [],
  createdOrderUuid: null,
  loading: false,
  error: null,
  errorStatus: null,
};

const isPlanOrderAction = (suffix: string) => (action: { type: string }) =>
  action.type.startsWith('planOrder/') && action.type.endsWith(`/${suffix}`);

const planOrderSlice = createSlice({
  name: 'planOrder',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlanOrders.fulfilled, (state, { payload }) => {
        state.orders = Array.isArray(payload) ? payload : [];
      })
      .addCase(fetchPlanOrder.pending, (state) => {
        state.current = null;
      })
      .addCase(fetchPlanOrder.fulfilled, (state, { payload }) => {
        state.current = payload;
      })
      .addCase(fetchPublicPlan.pending, (state) => {
        state.publicPlan = null;
      })
      .addCase(fetchPublicPlan.fulfilled, (state, { payload }) => {
        state.publicPlan = payload;
      })
      .addCase(fetchProvinces.fulfilled, (state, { payload }) => {
        state.provinces = Array.isArray(payload) ? payload : [];
      })
      .addCase(createPlanOrder.fulfilled, (state, { payload }) => {
        state.createdOrderUuid = payload.uuid;
      })
      .addMatcher(isPlanOrderAction('pending'), (state) => {
        state.loading = true;
        state.error = null;
        state.errorStatus = null;
      })
      .addMatcher(isPlanOrderAction('fulfilled'), (state) => {
        state.loading = false;
      })
      .addMatcher(isPlanOrderAction('rejected'), (state, action) => {
        const rejection = (action as { payload?: Rejection }).payload;
        state.loading = false;
        state.error = rejection?.message ?? 'Erro';
        state.errorStatus = rejection?.status ?? null;
      });
  },
});

export default planOrderSlice.reducer;
export type { PlanOrderState };
