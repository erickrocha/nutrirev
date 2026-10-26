import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';
import {customerGoalSettingService, customerService} from '../services/api';

export const fetchCustomersPaginated = createAsyncThunk(
  'customer/fetchCustomersPaginated',
  async (params, { rejectWithValue }) => {
    try {
      return await customerService.getPaginated(params);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao buscar clientes');
    }
  }
);

export const fetchAllCustomers = createAsyncThunk(
  'customer/fetchAllCustomers',
  async (_, { rejectWithValue }) => {
    try {
      return await customerService.getAll();
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao buscar clientes');
    }
  }
);

export const fetchCustomerById = createAsyncThunk(
  'customer/fetchCustomerById',
  async (id, { rejectWithValue }) => {
    try {
      return await customerService.getById(id);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao buscar cliente');
    }
  }
);

export const createCustomer = createAsyncThunk(
  'customer/createCustomer',
  async (customerData, { rejectWithValue }) => {
    try {
      return await customerService.create(customerData);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao criar cliente');
    }
  }
);

export const updateCustomer = createAsyncThunk(
  'customer/updateCustomer',
  async ({ id, customerData }, { rejectWithValue }) => {
    try {
      return await customerService.update(id, customerData);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao atualizar cliente');
    }
  }
);

export const deleteCustomer = createAsyncThunk(
  'customer/deleteCustomer',
  async (id, { rejectWithValue }) => {
    try {
      await customerService.delete(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao excluir cliente');
    }
  }
);

export const uploadCustomerPhoto = createAsyncThunk(
  'customer/uploadCustomerPhoto',
  async ({ id, file, imageBase64, extension, contentType }, { rejectWithValue }) => {
    try {
      const ext = extension || (file?.name ? file.name.split('.').pop() : 'jpg');
      const type = contentType || file?.type || 'image/jpeg';

      let base64Data = imageBase64;
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

      const data = await customerService.uploadPhoto(id, base64Data, ext, type);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao enviar foto do cliente');
    }
  }
);

export const fetchGoalSettings = createAsyncThunk(
  'customer/fetchGoalSettings',
  async (_, { rejectWithValue }) => {
    try {
      return await customerGoalSettingService.getAll();
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao buscar metas');
    }
  }
);

export const saveGoalSetting = createAsyncThunk(
  'customer/saveGoalSetting',
  async ({ id, goalData }, { rejectWithValue }) => {
    try {
      let data;
      if (id) {
        data = await customerGoalSettingService.update(id, goalData);
      } else {
        data = await customerGoalSettingService.create(goalData);
      }
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao salvar meta');
    }
  }
);

const customerSlice = createSlice({
  name: 'customer',
  initialState: {
    customersList: [],
    allCustomers: [],
    currentCustomer: null,
    goalSettings: [],
    totalPages: 1,
    totalElements: 0,
    loading: false,
    saving: false,
    error: null,
  },
  reducers: {
    clearCustomerError: (state) => {
      state.error = null;
    },
    setCurrentCustomer: (state, action) => {
      state.currentCustomer = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchCustomersPaginated
      .addCase(fetchCustomersPaginated.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomersPaginated.fulfilled, (state, action) => {
        state.loading = false;
        state.customersList = action.payload.content || [];
        state.totalPages = action.payload.total_pages || 1;
        state.totalElements = action.payload.total_elements || 0;
      })
      .addCase(fetchCustomersPaginated.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchAllCustomers
      .addCase(fetchAllCustomers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.allCustomers = action.payload || [];
      })
      .addCase(fetchAllCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchCustomerById
      .addCase(fetchCustomerById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCustomer = action.payload;
      })
      .addCase(fetchCustomerById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createCustomer
      .addCase(createCustomer.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.saving = false;
        state.currentCustomer = action.payload;
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      // updateCustomer
      .addCase(updateCustomer.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.saving = false;
        state.currentCustomer = action.payload;
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      // deleteCustomer
      .addCase(deleteCustomer.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.customersList = state.customersList.filter((c) => c.id !== action.payload);
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // uploadCustomerPhoto
      .addCase(uploadCustomerPhoto.pending, (state) => {
        state.saving = true;
      })
      .addCase(uploadCustomerPhoto.fulfilled, (state, action) => {
        state.saving = false;
        if (action.payload?.customer) {
          state.currentCustomer = action.payload.customer;
        }
      })
      .addCase(uploadCustomerPhoto.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      // fetchGoalSettings
      .addCase(fetchGoalSettings.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchGoalSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.goalSettings = action.payload || [];
      })
      .addCase(fetchGoalSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // saveGoalSetting
      .addCase(saveGoalSetting.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveGoalSetting.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(saveGoalSetting.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });
  },
});

export const { clearCustomerError, setCurrentCustomer } = customerSlice.actions;
export default customerSlice.reducer;
