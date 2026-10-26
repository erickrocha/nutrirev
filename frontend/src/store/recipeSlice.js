import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { eatService } from '../services/api';

export const fetchRecipesPaginated = createAsyncThunk(
  'recipe/fetchRecipesPaginated',
  async (params, { rejectWithValue }) => {
    try {
      const data = await eatService.getPaginated(params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao buscar receitas');
    }
  }
);

export const fetchAllRecipes = createAsyncThunk(
  'recipe/fetchAllRecipes',
  async (_, { rejectWithValue }) => {
    try {
      const data = await eatService.getAll();
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao buscar todas as receitas');
    }
  }
);

export const fetchRecipeById = createAsyncThunk(
  'recipe/fetchRecipeById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await eatService.getById(id);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao buscar receita');
    }
  }
);

export const createRecipe = createAsyncThunk(
  'recipe/createRecipe',
  async (recipeData, { rejectWithValue }) => {
    try {
      const data = await eatService.create(recipeData);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao criar receita');
    }
  }
);

export const updateRecipe = createAsyncThunk(
  'recipe/updateRecipe',
  async ({ id, recipeData }, { rejectWithValue }) => {
    try {
      const data = await eatService.update(id, recipeData);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao atualizar receita');
    }
  }
);

export const deleteRecipe = createAsyncThunk(
  'recipe/deleteRecipe',
  async (id, { rejectWithValue }) => {
    try {
      await eatService.delete(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao excluir receita');
    }
  }
);

export const uploadRecipePhoto = createAsyncThunk(
  'recipe/uploadRecipePhoto',
  async ({ id, photoPayload, file }, { rejectWithValue }) => {
    try {
      const ext = photoPayload?.extension || (file?.name ? file.name.split('.').pop() : 'jpg');
      const type = photoPayload?.contentType || file?.type || 'image/jpeg';

      let base64Data = photoPayload?.imageBase64;
      if (!base64Data && file) {
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = reader.result;
            resolve(res.includes(',') ? res.split(',')[1] : res);
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
      }

      const data = await eatService.uploadPhoto(id, {
        imageBase64: base64Data,
        extension: ext,
        contentType: type,
      });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao enviar foto da receita');
    }
  }
);

const recipeSlice = createSlice({
  name: 'recipe',
  initialState: {
    recipes: [],
    allRecipes: [],
    currentRecipe: null,
    totalPages: 1,
    totalElements: 0,
    loading: false,
    saving: false,
    error: null,
  },
  reducers: {
    clearRecipeError: (state) => {
      state.error = null;
    },
    setCurrentRecipe: (state, action) => {
      state.currentRecipe = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchRecipesPaginated
      .addCase(fetchRecipesPaginated.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecipesPaginated.fulfilled, (state, action) => {
        state.loading = false;
        state.recipes = action.payload.content || [];
        state.totalPages = action.payload.total_pages || 1;
        state.totalElements = action.payload.total_elements || 0;
      })
      .addCase(fetchRecipesPaginated.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchAllRecipes
      .addCase(fetchAllRecipes.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllRecipes.fulfilled, (state, action) => {
        state.loading = false;
        state.allRecipes = action.payload || [];
      })
      .addCase(fetchAllRecipes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchRecipeById
      .addCase(fetchRecipeById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecipeById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRecipe = action.payload;
      })
      .addCase(fetchRecipeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createRecipe
      .addCase(createRecipe.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createRecipe.fulfilled, (state, action) => {
        state.saving = false;
        state.currentRecipe = action.payload;
      })
      .addCase(createRecipe.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      // updateRecipe
      .addCase(updateRecipe.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateRecipe.fulfilled, (state, action) => {
        state.saving = false;
        state.currentRecipe = action.payload;
        if (action.payload?.id) {
          const index = state.recipes.findIndex((r) => r.id === action.payload.id);
          if (index !== -1) {
            state.recipes[index] = action.payload;
          }
          const allIndex = state.allRecipes.findIndex((r) => r.id === action.payload.id);
          if (allIndex !== -1) {
            state.allRecipes[allIndex] = action.payload;
          }
        }
      })
      .addCase(updateRecipe.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      // deleteRecipe
      .addCase(deleteRecipe.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteRecipe.fulfilled, (state, action) => {
        state.loading = false;
        state.recipes = state.recipes.filter((r) => r.id !== action.payload);
      })
      .addCase(deleteRecipe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // uploadRecipePhoto
      .addCase(uploadRecipePhoto.pending, (state) => {
        state.saving = true;
      })
      .addCase(uploadRecipePhoto.fulfilled, (state, action) => {
        state.saving = false;
        const updatedEat = action.payload?.eat || action.payload;
        if (updatedEat?.id) {
          state.currentRecipe = updatedEat;
          const photoUrl = action.payload?.signed_url || action.payload?.signedUrl || updatedEat.photo || updatedEat.photoUrl || updatedEat.photo_url || updatedEat.photoBase64;
          const index = state.recipes.findIndex((r) => r.id === updatedEat.id);
          if (index !== -1) {
            state.recipes[index] = {
              ...state.recipes[index],
              ...updatedEat,
              photo: photoUrl || state.recipes[index].photo,
            };
          }
          const allIndex = state.allRecipes.findIndex((r) => r.id === updatedEat.id);
          if (allIndex !== -1) {
            state.allRecipes[allIndex] = {
              ...state.allRecipes[allIndex],
              ...updatedEat,
              photo: photoUrl || state.allRecipes[allIndex].photo,
            };
          }
        }
      })
      .addCase(uploadRecipePhoto.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });
  },
});

export const { clearRecipeError, setCurrentRecipe } = recipeSlice.actions;
export default recipeSlice.reducer;
