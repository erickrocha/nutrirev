import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';
import {mealPlanService} from '../services/api';

export const fetchMealPlansPaginated = createAsyncThunk(
  'mealPlan/fetchMealPlansPaginated',
  async (params, { rejectWithValue }) => {
    try {
      return await mealPlanService.getPaginated(params);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao buscar planos alimentares');
    }
  }
);

export const fetchAllMealPlans = createAsyncThunk(
  'mealPlan/fetchAllMealPlans',
  async (_, { rejectWithValue }) => {
    try {
      return await mealPlanService.getAll();
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao buscar planos alimentares');
    }
  }
);

export const fetchMealPlanById = createAsyncThunk(
  'mealPlan/fetchMealPlanById',
  async (id, { rejectWithValue }) => {
    try {
      return await mealPlanService.getById(id);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao buscar plano alimentar');
    }
  }
);

export const createMealPlan = createAsyncThunk(
  'mealPlan/createMealPlan',
  async (planData, { rejectWithValue }) => {
    try {
      return await mealPlanService.create(planData);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao criar plano alimentar');
    }
  }
);

export const updateMealPlan = createAsyncThunk(
  'mealPlan/updateMealPlan',
  async ({ id, planData }, { rejectWithValue }) => {
    try {
      return await mealPlanService.update(id, planData);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao atualizar plano alimentar');
    }
  }
);

export const deleteMealPlan = createAsyncThunk(
  'mealPlan/deleteMealPlan',
  async (id, { rejectWithValue }) => {
    try {
      await mealPlanService.delete(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao excluir plano alimentar');
    }
  }
);

const mealPlanSlice = createSlice({
  name: 'mealPlan',
  initialState: {
    mealPlans: [],
    allMealPlans: [],
    currentMealPlan: null,
    totalPages: 1,
    totalElements: 0,
    loading: false,
    saving: false,
    error: null,
  },
  reducers: {
    clearMealPlanError: (state) => {
      state.error = null;
    },
    setCurrentMealPlan: (state, action) => {
      state.currentMealPlan = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchMealPlansPaginated
      .addCase(fetchMealPlansPaginated.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMealPlansPaginated.fulfilled, (state, action) => {
        state.loading = false;
        state.mealPlans = action.payload.content || [];
        state.totalPages = action.payload.total_pages || 1;
        state.totalElements = action.payload.total_elements || 0;
      })
      .addCase(fetchMealPlansPaginated.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchAllMealPlans
      .addCase(fetchAllMealPlans.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllMealPlans.fulfilled, (state, action) => {
        state.loading = false;
        state.allMealPlans = action.payload || [];
      })
      .addCase(fetchAllMealPlans.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchMealPlanById
      .addCase(fetchMealPlanById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMealPlanById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentMealPlan = action.payload;
      })
      .addCase(fetchMealPlanById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createMealPlan
      .addCase(createMealPlan.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createMealPlan.fulfilled, (state, action) => {
        state.saving = false;
        state.currentMealPlan = action.payload;
      })
      .addCase(createMealPlan.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      // updateMealPlan
      .addCase(updateMealPlan.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateMealPlan.fulfilled, (state, action) => {
        state.saving = false;
        state.currentMealPlan = action.payload;
      })
      .addCase(updateMealPlan.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      // deleteMealPlan
      .addCase(deleteMealPlan.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteMealPlan.fulfilled, (state, action) => {
        state.loading = false;
        state.mealPlans = state.mealPlans.filter((mp) => mp.id !== action.payload);
      })
      .addCase(deleteMealPlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearMealPlanError, setCurrentMealPlan } = mealPlanSlice.actions;
export default mealPlanSlice.reducer;
