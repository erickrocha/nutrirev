import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ingredientService } from '../services/ingredientService';
import type { Ingredient, IngredientPage, IngredientPayload } from '../types/ingredient';

interface IngredientCatalogState {
  items: Ingredient[];
  total: number;
  current: Ingredient | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: IngredientCatalogState = { items: [], total: 0, current: null, loading: false, saving: false, error: null };

const messageOf = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

export const searchIngredientPage = createAsyncThunk(
  'ingredientCatalog/search',
  async ({ q, lang, page, pageSize }: { q: string; lang: string; page: number; pageSize: number }, { rejectWithValue }) => {
    try {
      const data = (await ingredientService.search({ q, lang, limit: pageSize, offset: (page - 1) * pageSize })) as Partial<IngredientPage> | null;
      return { items: Array.isArray(data?.items) ? data.items : [], total: data?.total ?? 0 };
    } catch (err) {
      return rejectWithValue(messageOf(err, ''));
    }
  },
);

export const loadIngredient = createAsyncThunk('ingredientCatalog/load', async (id: number, { rejectWithValue }) => {
  try {
    return (await ingredientService.getById(id)) as Ingredient;
  } catch (err) {
    return rejectWithValue(messageOf(err, ''));
  }
});

export const saveIngredient = createAsyncThunk(
  'ingredientCatalog/save',
  async ({ id, payload }: { id?: number; payload: IngredientPayload }, { rejectWithValue }) => {
    try {
      return id === undefined ? await ingredientService.create(payload) : await ingredientService.update(id, payload);
    } catch (err) {
      return rejectWithValue(messageOf(err, ''));
    }
  },
);

export const deleteIngredient = createAsyncThunk('ingredientCatalog/delete', async (id: number, { rejectWithValue }) => {
  try {
    await ingredientService.delete(id);
  } catch (err) {
    return rejectWithValue(messageOf(err, ''));
  }
});

// Mensagem vazia significa "use o texto padrão da tela" (traduzido).
const slice = createSlice({
  name: 'ingredientCatalog',
  initialState,
  reducers: {
    clearIngredientError: (state) => { state.error = null; },
    clearCurrentIngredient: (state) => { state.current = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchIngredientPage.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(searchIngredientPage.fulfilled, (state, { payload }) => { state.loading = false; state.items = payload.items; state.total = payload.total; })
      .addCase(searchIngredientPage.rejected, (state, { payload }) => { state.loading = false; state.error = (payload as string) ?? ''; })
      .addCase(loadIngredient.pending, (state) => { state.loading = true; state.error = null; state.current = null; })
      .addCase(loadIngredient.fulfilled, (state, { payload }) => { state.loading = false; state.current = payload; })
      .addCase(loadIngredient.rejected, (state, { payload }) => { state.loading = false; state.error = (payload as string) ?? ''; })
      .addCase(saveIngredient.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(saveIngredient.fulfilled, (state) => { state.saving = false; })
      .addCase(saveIngredient.rejected, (state, { payload }) => { state.saving = false; state.error = (payload as string) ?? ''; })
      .addCase(deleteIngredient.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(deleteIngredient.fulfilled, (state) => { state.saving = false; })
      .addCase(deleteIngredient.rejected, (state, { payload }) => { state.saving = false; state.error = (payload as string) ?? ''; });
  },
});

export const { clearIngredientError, clearCurrentIngredient } = slice.actions;
export default slice.reducer;
export type { IngredientCatalogState };
