import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { customerService } from '../services/customerService';

export interface PatientOption { id: number; name: string; email?: string }
export interface CustomerState { allCustomers: PatientOption[]; loading: boolean; error: string | null }

// Lista de clientes usada pelo seletor de pacientes dos planos alimentares.
// As telas de clientes têm seus próprios slices (customerListSlice, customerFormSlice, goalSlice).
export const fetchAllCustomers = createAsyncThunk('customer/fetchAllCustomers', async (_: void, { rejectWithValue }) => {
  try {
    return (await customerService.getAll()) as PatientOption[];
  } catch (err) {
    return rejectWithValue((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Falha ao buscar clientes');
  }
});

const initialState: CustomerState = { allCustomers: [], loading: false, error: null };

const customerSlice = createSlice({
  name: 'customer',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllCustomers.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAllCustomers.fulfilled, (state, { payload }) => { state.loading = false; state.allCustomers = payload || []; })
      .addCase(fetchAllCustomers.rejected, (state, { payload }) => { state.loading = false; state.error = (payload as string) ?? 'Falha ao buscar clientes'; });
  },
});

export default customerSlice.reducer;
