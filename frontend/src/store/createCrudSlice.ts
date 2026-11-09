import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface CrudService<T, P> {
  getAll: () => Promise<unknown>;
  create: (data: P) => Promise<unknown>;
  update: (id: number, data: P) => Promise<unknown>;
  // Os serviços atuais são JS: o tipo de `T` só entra para o consumo dos selectors.
  readonly __item?: T;
}

export interface CrudState<T> {
  items: T[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const messageOf = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

/** Lista + salvar (criar/atualizar) de uma entidade, com loading/saving/error. */
export const createCrudSlice = <T extends { id: number }, P>(name: string, service: CrudService<T, P>) => {
  const fetchAll = createAsyncThunk(`${name}/fetchAll`, async (_: void, { rejectWithValue }) => {
    try {
      const data = await service.getAll();
      return Array.isArray(data) ? (data as T[]) : [];
    } catch (err) {
      return rejectWithValue(messageOf(err, 'Falha ao carregar registros'));
    }
  });

  const save = createAsyncThunk(`${name}/save`, async ({ id, payload }: { id?: number; payload: P }, { rejectWithValue }) => {
    try {
      return id === undefined ? await service.create(payload) : await service.update(id, payload);
    } catch (err) {
      return rejectWithValue(messageOf(err, 'Falha ao salvar registro'));
    }
  });

  const initialState: CrudState<T> = { items: [], loading: false, saving: false, error: null };

  const slice = createSlice({
    name,
    initialState,
    reducers: { clearError: (state) => { state.error = null; } },
    extraReducers: (builder) => {
      builder
        .addCase(fetchAll.pending, (state) => { state.loading = true; state.error = null; })
        .addCase(fetchAll.fulfilled, (state, { payload }) => { state.loading = false; state.items = payload as never; })
        .addCase(fetchAll.rejected, (state, { payload }) => { state.loading = false; state.error = (payload as string) ?? 'Erro'; })
        .addCase(save.pending, (state) => { state.saving = true; state.error = null; })
        .addCase(save.fulfilled, (state) => { state.saving = false; })
        .addCase(save.rejected, (state, { payload }) => { state.saving = false; state.error = (payload as string) ?? 'Erro'; });
    },
  });

  return { reducer: slice.reducer, fetchAll, save, clearError: slice.actions.clearError };
};
