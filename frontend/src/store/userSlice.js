import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userService } from '../services/api';

export const fetchUsers = createAsyncThunk(
  'user/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const users = await userService.getUsers();
      return users;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao buscar usuários');
    }
  }
);

export const createUser = createAsyncThunk(
  'user/createUser',
  async (userData, { rejectWithValue, dispatch }) => {
    try {
      const newUser = await userService.createUser(userData);
      dispatch(fetchUsers());
      return newUser;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao criar usuário');
    }
  }
);

export const updateUser = createAsyncThunk(
  'user/updateUser',
  async ({ id, userData }, { rejectWithValue, dispatch }) => {
    try {
      const updated = await userService.updateUser(id, userData);
      dispatch(fetchUsers());
      return updated;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Falha ao atualizar usuário');
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState: {
    usersList: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearUserError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.usersList = action.payload || [];
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearUserError } = userSlice.actions;
export default userSlice.reducer;
