import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { clinicalPlanService, prepareMealService } from '../services/clinicalService';
import { customerService } from '../services/customerService';
import type { CatalogOption, Customer } from '../types/customer';

interface CustomerListState {
  customers: Customer[];
  plans: CatalogOption[];
  meals: CatalogOption[];
  loading: boolean;
  enabling: boolean;
  error: string | null;
  enabledName: string | null;
}

const initialState: CustomerListState = { customers: [], plans: [], meals: [], loading: false, enabling: false, error: null, enabledName: null };

const list = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const messageOf = (err: unknown): string => (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '';

export const loadCustomerList = createAsyncThunk('customerList/load', async (_: void, { rejectWithValue }) => {
  try {
    const [customers, plans, meals] = await Promise.all([customerService.getAll(), clinicalPlanService.getAll(), prepareMealService.getAll()]);
    return { customers: list<Customer>(customers), plans: list<CatalogOption>(plans), meals: list<CatalogOption>(meals) };
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

export const enableCustomerMobile = createAsyncThunk(
  'customerList/enableMobile',
  async (customer: Pick<Customer, 'id' | 'name'>, { dispatch, rejectWithValue }) => {
    try {
      await customerService.enableMobile(customer.id);
    } catch (err) {
      return rejectWithValue(messageOf(err));
    }
    await dispatch(loadCustomerList());
    return customer.name;
  },
);

const slice = createSlice({
  name: 'customerList',
  initialState,
  reducers: {
    dismissCustomerListError: (state) => { state.error = null; },
    dismissEnabledNotice: (state) => { state.enabledName = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCustomerList.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loadCustomerList.fulfilled, (state, { payload }) => { state.loading = false; Object.assign(state, payload); })
      // Mensagem vazia: a API não explicou; a tela mostra o texto padrão traduzido.
      .addCase(loadCustomerList.rejected, (state, { payload }) => { state.loading = false; state.error = (payload as string) ?? ''; })
      .addCase(enableCustomerMobile.pending, (state) => { state.enabling = true; state.error = null; state.enabledName = null; })
      .addCase(enableCustomerMobile.fulfilled, (state, { payload }) => { state.enabling = false; state.enabledName = payload; })
      .addCase(enableCustomerMobile.rejected, (state, { payload }) => { state.enabling = false; state.error = (payload as string) ?? ''; });
  },
});

export const { dismissCustomerListError, dismissEnabledNotice } = slice.actions;
export default slice.reducer;
export type { CustomerListState };
