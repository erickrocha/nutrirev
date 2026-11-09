import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { eatService } from '../services/eatService';
import type { PagedResponse } from '../types/mealPlan';
import type { PhotoPayload, Recipe, RecipePayload } from '../types/recipe';

interface RecipeState {
  recipes: Recipe[];
  current: Recipe | null;
  totalPages: number;
  totalElements: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: RecipeState = { recipes: [], current: null, totalPages: 1, totalElements: 0, loading: false, saving: false, error: null };

// Mensagem vazia: a API não explicou; a tela mostra o texto padrão traduzido.
const messageOf = (err: unknown): string => (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '';

export interface RecipeQuery { page: number; size: number; search?: string; recommended_period?: string; is_highlight?: boolean }

export const fetchRecipesPaginated = createAsyncThunk('recipe/fetchPaginated', async (params: RecipeQuery, { rejectWithValue }) => {
  try {
    return (await eatService.getPaginated(params)) as PagedResponse<Recipe>;
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

export const fetchRecipeById = createAsyncThunk('recipe/fetchById', async (id: number, { rejectWithValue }) => {
  try {
    return ((await eatService.getById(id)) ?? null) as Recipe | null;
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

/** Salva e, havendo foto nova, envia em seguida; devolve a receita salva. */
export const saveRecipe = createAsyncThunk(
  'recipe/save',
  async ({ id, payload, photo }: { id?: number; payload: RecipePayload; photo?: PhotoPayload | null }, { rejectWithValue }) => {
    try {
      const saved = (id === undefined ? await eatService.create(payload) : await eatService.update(id, payload)) as Recipe;
      const targetId = saved?.id ?? id;
      if (targetId && photo) await eatService.uploadPhoto(targetId, photo);
      return saved;
    } catch (err) {
      return rejectWithValue(messageOf(err));
    }
  },
);

export const deleteRecipe = createAsyncThunk('recipe/delete', async (id: number, { rejectWithValue }) => {
  try {
    await eatService.delete(id);
    return id;
  } catch (err) {
    return rejectWithValue(messageOf(err));
  }
});

const slice = createSlice({
  name: 'recipe',
  initialState,
  reducers: { clearRecipeError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecipesPaginated.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchRecipesPaginated.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.recipes = payload.content || [];
        state.totalPages = payload.total_pages || 1;
        state.totalElements = payload.total_elements || 0;
      })
      .addCase(fetchRecipesPaginated.rejected, (state, { payload }) => { state.loading = false; state.error = (payload as string) ?? ''; })
      .addCase(fetchRecipeById.pending, (state) => { state.loading = true; state.error = null; state.current = null; })
      .addCase(fetchRecipeById.fulfilled, (state, { payload }) => { state.loading = false; state.current = payload; })
      .addCase(fetchRecipeById.rejected, (state, { payload }) => { state.loading = false; state.error = (payload as string) ?? ''; })
      .addCase(saveRecipe.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(saveRecipe.fulfilled, (state) => { state.saving = false; })
      .addCase(saveRecipe.rejected, (state, { payload }) => { state.saving = false; state.error = (payload as string) ?? ''; })
      .addCase(deleteRecipe.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(deleteRecipe.fulfilled, (state, { payload }) => { state.saving = false; state.recipes = state.recipes.filter((recipe) => recipe.id !== payload); })
      .addCase(deleteRecipe.rejected, (state, { payload }) => { state.saving = false; state.error = (payload as string) ?? ''; });
  },
});

export const { clearRecipeError } = slice.actions;
export default slice.reducer;
export type { RecipeState };
