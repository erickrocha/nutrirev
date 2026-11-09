import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { cycleService } from '../services/cycleService';
import { ingredientService } from '../services/ingredientService';
import type { Ingredient } from '../types/ingredient';
import type { Cycle } from '../types/recipe';

interface IngredientState {
  ingredientsList: Ingredient[];
  ingredientOptions: Ingredient[];
  cyclesList: Cycle[];
  loading: boolean;
  error: string | null;
}

const initialState: IngredientState = { ingredientsList: [], ingredientOptions: [], cyclesList: [], loading: false, error: null };

const messageOf = (err: unknown, fallback: string): string => (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

const mergeById = (current: Ingredient[], incoming: Ingredient[]): Ingredient[] => {
  const byId = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values());
};

// Busca no servidor (sem acento, PT/EN). `ingredientOptions` guarda o último resultado;
// `ingredientsList` é um cache por id usado para exibir nomes e calcular macros.
export const searchIngredients = createAsyncThunk(
  'ingredient/searchIngredients',
  async ({ q = '', lang = 'pt', limit = 30 }: { q?: string; lang?: string; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const data = (await ingredientService.search({ q, lang, limit })) as { items?: Ingredient[] } | null;
      return data?.items || [];
    } catch (err) {
      return rejectWithValue(messageOf(err, 'Falha ao buscar ingredientes'));
    }
  },
);

// Lista inicial dos seletores (primeiros itens em ordem alfabética).
export const fetchIngredients = createAsyncThunk('ingredient/fetchIngredients', async (lang: string = 'pt', { dispatch, rejectWithValue }) => {
  const result = await dispatch(searchIngredients({ q: '', lang }));
  return searchIngredients.rejected.match(result) ? rejectWithValue(result.payload) : (result.payload as Ingredient[]);
});

export const fetchIngredientsByIds = createAsyncThunk(
  'ingredient/fetchIngredientsByIds',
  async (ids: Array<number | null | undefined | string>, { getState, rejectWithValue }) => {
    try {
      const cached = new Set((getState() as { ingredient: IngredientState }).ingredient.ingredientsList.map((item) => item.id));
      const wanted = [...new Set(ids.map((id) => (id === null || id === undefined || id === '' ? null : Number(id))))];
      const missing = wanted.filter((id): id is number => id !== null && !Number.isNaN(id) && !cached.has(id));
      return ((await ingredientService.getByIds(missing)) as Ingredient[]) ?? [];
    } catch (err) {
      return rejectWithValue(messageOf(err, 'Falha ao buscar ingredientes'));
    }
  },
);

export const fetchCycles = createAsyncThunk('ingredient/fetchCycles', async (_: void, { rejectWithValue }) => {
  try {
    return (await cycleService.getAll()) as Cycle[];
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Falha ao buscar ciclos'));
  }
});

const slice = createSlice({
  name: 'ingredient',
  initialState,
  reducers: { clearIngredientError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(searchIngredients.fulfilled, (state, { payload }) => {
        state.ingredientOptions = payload;
        state.ingredientsList = mergeById(state.ingredientsList, payload);
      })
      .addCase(searchIngredients.rejected, (state, { payload }) => { state.error = payload as string; })
      .addCase(fetchIngredientsByIds.fulfilled, (state, { payload }) => { state.ingredientsList = mergeById(state.ingredientsList, payload); })
      .addCase(fetchCycles.pending, (state) => { state.loading = true; })
      .addCase(fetchCycles.fulfilled, (state, { payload }) => { state.loading = false; state.cyclesList = payload || []; })
      .addCase(fetchCycles.rejected, (state, { payload }) => { state.loading = false; state.error = payload as string; });
  },
});

export const { clearIngredientError } = slice.actions;
export default slice.reducer;
export type { IngredientState };
