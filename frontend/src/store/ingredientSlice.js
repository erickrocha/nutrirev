import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ingredientService, cycleService } from '../services/api';

export const fetchIngredients = createAsyncThunk(
  'ingredient/fetchIngredients',
  async (_, { rejectWithValue }) => {
    try {
      const data = await ingredientService.getAll();
      return data;
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
      // fetchIngredients
      .addCase(fetchIngredients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIngredients.fulfilled, (state, action) => {
        state.loading = false;
        state.ingredientsList = action.payload || [];
      })
      .addCase(fetchIngredients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
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
