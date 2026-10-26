import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchClinicalEntities = createAsyncThunk(
  'clinical/fetchClinicalEntities',
  async ({ key, service }, { rejectWithValue }) => {
    try {
      const data = await service.getAll();
      return { key, data: Array.isArray(data) ? data : [] };
    } catch (err) {
      return rejectWithValue({ key, error: err.response?.data?.message || 'Falha ao carregar registros' });
    }
  }
);

export const saveClinicalEntity = createAsyncThunk(
  'clinical/saveClinicalEntity',
  async ({ key, service, id, payload }, { rejectWithValue }) => {
    try {
      let data;
      if (id) {
        data = await service.update(id, payload);
      } else {
        data = await service.create(payload);
      }
      return { key, data };
    } catch (err) {
      return rejectWithValue({ key, error: err.response?.data?.message || 'Falha ao salvar registro' });
    }
  }
);

const clinicalSlice = createSlice({
  name: 'clinical',
  initialState: {
    entities: {},
    loading: {},
    error: {},
  },
  reducers: {
    clearClinicalError: (state, action) => {
      const key = action.payload;
      if (key) {
        state.error[key] = null;
      } else {
        state.error = {};
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClinicalEntities.pending, (state, action) => {
        const key = action.meta.arg.key;
        state.loading[key] = true;
        state.error[key] = null;
      })
      .addCase(fetchClinicalEntities.fulfilled, (state, action) => {
        const { key, data } = action.payload;
        state.loading[key] = false;
        state.entities[key] = data;
      })
      .addCase(fetchClinicalEntities.rejected, (state, action) => {
        const { key, error } = action.payload || {};
        if (key) {
          state.loading[key] = false;
          state.error[key] = error;
        }
      })
      .addCase(saveClinicalEntity.pending, (state, action) => {
        const key = action.meta.arg.key;
        state.loading[key] = true;
        state.error[key] = null;
      })
      .addCase(saveClinicalEntity.fulfilled, (state, action) => {
        const { key } = action.payload;
        state.loading[key] = false;
      })
      .addCase(saveClinicalEntity.rejected, (state, action) => {
        const { key, error } = action.payload || {};
        if (key) {
          state.loading[key] = false;
          state.error[key] = error;
        }
      });
  },
});

export const { clearClinicalError } = clinicalSlice.actions;
export default clinicalSlice.reducer;
