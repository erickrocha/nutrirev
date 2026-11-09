import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { userService } from '../services/userService';
import type { AppUser, UserPayload } from '../types/user';

interface UserState {
  usersList: AppUser[];
  loading: boolean;
  error: string | null;
}

const initialState: UserState = { usersList: [], loading: false, error: null };

const messageOf = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

export const fetchUsers = createAsyncThunk('user/fetchUsers', async (_: void, { rejectWithValue }) => {
  try {
    return ((await userService.getUsers()) as AppUser[] | null) || [];
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Falha ao buscar usuários'));
  }
});

export const createUser = createAsyncThunk('user/createUser', async (userData: UserPayload, { rejectWithValue, dispatch }) => {
  try {
    const created = await userService.createUser(userData);
    dispatch(fetchUsers());
    return created;
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Falha ao criar usuário'));
  }
});

export const updateUser = createAsyncThunk(
  'user/updateUser',
  async ({ id, userData }: { id: number; userData: UserPayload }, { rejectWithValue, dispatch }) => {
    try {
      const updated = await userService.updateUser(id, userData);
      dispatch(fetchUsers());
      return updated;
    } catch (err) {
      return rejectWithValue(messageOf(err, 'Falha ao atualizar usuário'));
    }
  },
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: { clearUserError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    const failed = (state: UserState, action: { payload: unknown }) => { state.loading = false; state.error = (action.payload as string) ?? ''; };
    builder
      .addCase(fetchUsers.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchUsers.fulfilled, (state, action) => { state.loading = false; state.usersList = action.payload; })
      .addCase(fetchUsers.rejected, failed)
      .addCase(createUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createUser.fulfilled, (state) => { state.loading = false; })
      .addCase(createUser.rejected, failed)
      .addCase(updateUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateUser.fulfilled, (state) => { state.loading = false; })
      .addCase(updateUser.rejected, failed);
  },
});

export const { clearUserError } = userSlice.actions;
export default userSlice.reducer;
export type { UserState };
