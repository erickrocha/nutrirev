import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { doctorService } from '../services/doctorService';
import type { Doctor, DoctorPayload } from '../types/doctor';

interface DoctorState {
  doctors: Doctor[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: DoctorState = { doctors: [], loading: false, saving: false, error: null };

// Mensagem vazia: a API não explicou; a tela mostra o texto padrão traduzido.
const messageOf = (err: unknown): string => (err as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message ?? '';

export const fetchDoctors = createAsyncThunk('doctor/fetchAll', async (_: void, { rejectWithValue }) => {
  try {
    const list = await doctorService.getAll();
    return Array.isArray(list) ? (list as Doctor[]) : [];
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

export const saveDoctor = createAsyncThunk('doctor/save', async ({ id, payload }: { id?: number; payload: DoctorPayload }, { rejectWithValue }) => {
  try {
    return id === undefined ? await doctorService.create(payload) : await doctorService.update(id, payload);
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

export const deleteDoctor = createAsyncThunk('doctor/delete', async (id: number, { dispatch, rejectWithValue }) => {
  try {
    await doctorService.delete(id);
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
  await dispatch(fetchDoctors());
});

const slice = createSlice({
  name: 'doctor',
  initialState,
  reducers: { clearDoctorError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoctors.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchDoctors.fulfilled, (state, { payload }) => { state.loading = false; state.doctors = payload; })
      .addCase(fetchDoctors.rejected, (state, { payload }) => { state.loading = false; state.error = (payload as string) ?? ''; })
      .addMatcher((action) => /^doctor\/(save|delete)\/pending$/.test(action.type), (state) => { state.saving = true; state.error = null; })
      .addMatcher((action) => /^doctor\/(save|delete)\/fulfilled$/.test(action.type), (state) => { state.saving = false; })
      .addMatcher((action) => /^doctor\/(save|delete)\/rejected$/.test(action.type), (state, action) => {
        state.saving = false;
        state.error = (action as { payload?: string }).payload ?? '';
      });
  },
});

export const { clearDoctorError } = slice.actions;
export default slice.reducer;
export type { DoctorState };
