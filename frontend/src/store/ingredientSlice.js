import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ingredientService, cycleService } from '../services/api';

const mergeById = (current, incoming) => {
  const byId = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values());
};

// Busca no servidor (sem acento, PT/EN). `ingredientOptions` guarda o último resultado;
// `ingredientsList` é um cache por id usado para exibir nomes e calcular macros.
export const searchIngredients = createAsyncThunk(
  'ingredient/searchIngredients',
  async ({ q = '', lang = 'pt', limit = 30 } = {}, { rejectWithValue }) => {
    try {
      const data = await ingredientService.search({ q, lang, limit });
      return data?.items || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao buscar ingredientes');
    }
  }
);

// Lista inicial dos seletores (primeiros itens em ordem alfabética).
export const fetchIngredients = createAsyncThunk(
  'ingredient/fetchIngredients',
  async (lang = 'pt', { dispatch, rejectWithValue }) => {
    const result = await dispatch(searchIngredients({ q: '', lang }));
    return result.error ? rejectWithValue(result.payload) : result.payload;
  }
);

export const fetchIngredientsByIds = createAsyncThunk(
  'ingredient/fetchIngredientsByIds',
  async (ids, { getState, rejectWithValue }) => {
    try {
      const cached = new Set(getState().ingredient.ingredientsList.map((item) => item.id));
      const missing = [...new Set(ids)].filter((id) => id != null && !cached.has(id));
      return await ingredientService.getByIds(missing);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao buscar ingredientes');
    }
  }
);

export const fetchCycles = createAsyncThunk(
  'ingredient/fetchCycles',
  async (_, { rejectWithValue }) => {
    try {
      const data = await cycleService.getAll();
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao buscar ciclos');
    }
  }
);

const ingredientSlice = createSlice({
  name: 'ingredient',
  initialState: {
    ingredientsList: [],
    ingredientOptions: [],
    cyclesList: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearIngredientError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchIngredients.fulfilled, (state, action) => {
        state.ingredientOptions = action.payload;
        state.ingredientsList = mergeById(state.ingredientsList, action.payload);
      })
      .addCase(searchIngredients.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(fetchIngredientsByIds.fulfilled, (state, action) => {
        state.ingredientsList = mergeById(state.ingredientsList, action.payload);
      })
      // fetchCycles
      .addCase(fetchCycles.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCycles.fulfilled, (state, action) => {
        state.loading = false;
        state.cyclesList = action.payload || [];
      })
      .addCase(fetchCycles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearIngredientError } = ingredientSlice.actions;
export default ingredientSlice.reducer;
