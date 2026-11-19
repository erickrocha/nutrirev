import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { authService } from '../services/authService';
import { fetchTenantById } from './tenantSlice';
import { setSubscriptionStatus, fetchTenantSubscriptionStatus } from './tenantSubscriptionSlice';
import type { TenantSubscriptionStatus } from '../types/tenantSubscription';
import { ROLES } from '../utils/enums';
import { authStorage, refreshTokenOf, tenantIdOfSession, tokenOf, type StoredSession } from '../utils/authStorage';
import { isTokenExpired } from '../utils/jwt';

export interface AuthUser extends StoredSession {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
  subscriptionStatus?: TenantSubscriptionStatus | null;
  subscription_status?: TenantSubscriptionStatus | null;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isSysAdmin: boolean;
  loading: boolean;
  error: string | null;
}

interface Session { token: string | null; refreshToken: string | null; user: AuthUser | null }

const LOGIN_FAILED = 'Email ou senha inválidos. Por favor, tente novamente.';
const messageOf = (err: unknown, fallback: string): string => (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

const loadTenantAndSubscriptionOf = (
  session: StoredSession | null | undefined,
  dispatch: (action: any) => unknown
) => {
  const tenantId = tenantIdOfSession(session);
  if (tenantId) dispatch(fetchTenantById(tenantId));

  const authUser = session as AuthUser | null | undefined;
  const subStatus = authUser?.subscriptionStatus || authUser?.subscription_status;
  if (subStatus) {
    dispatch(setSubscriptionStatus(subStatus));
  } else if (authUser?.role === ROLES.TENANT_OWNER || authUser?.role === ROLES.TENANT_USER) {
    dispatch(fetchTenantSubscriptionStatus());
  }
};

export const loginUser = createAsyncThunk<AuthUser, { email: string; password: string }, { rejectValue: string }>(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue, dispatch }) => {
    try {
      const data = (await authService.login(email, password)) as AuthUser;
      authStorage.saveSession(data);
      loadTenantAndSubscriptionOf(data, dispatch);
      return data;
    } catch (err) {
      return rejectWithValue(messageOf(err, LOGIN_FAILED));
    }
  },
);

/** Ao abrir o app: aproveita o token válido, renova com o refresh token ou encerra a sessão. */
export const validateOrRefreshToken = createAsyncThunk<Session, void, { rejectValue: string }>(
  'auth/validateOrRefreshToken',
  async (_, { rejectWithValue, dispatch }) => {
    const token = authStorage.token();
    const refreshToken = authStorage.refreshToken();
    const storedUser = authStorage.user<AuthUser>();

    if (token && !isTokenExpired(token)) {
      loadTenantAndSubscriptionOf(storedUser, dispatch);
      return { token, refreshToken, user: storedUser };
    }

    if (refreshToken && !isTokenExpired(refreshToken)) {
      try {
        const data = (await authService.refreshToken(refreshToken)) as AuthUser;
        authStorage.saveSession(data, refreshToken);
        loadTenantAndSubscriptionOf(data, dispatch);
        return { token: tokenOf(data) ?? null, refreshToken: refreshTokenOf(data) || refreshToken, user: data };
      } catch {
        authStorage.clear();
        return rejectWithValue('Refresh token expired or invalid');
      }
    }

    authStorage.clear();
    return rejectWithValue('No valid session or token expired');
  },
);

const storedUser = authStorage.user<AuthUser>();
const initialState: AuthState = {
  token: authStorage.token(),
  refreshToken: authStorage.refreshToken(),
  user: storedUser,
  isAuthenticated: false,
  isInitializing: true,
  isSysAdmin: storedUser?.role === ROLES.SYS_ADMIN,
  loading: false,
  error: null,
};

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
      state.isSysAdmin = false;
      state.isInitializing = false;
      authStorage.clear();
    },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    const signIn = (state: AuthState, session: Session) => {
      state.token = session.token;
      state.refreshToken = session.refreshToken;
      state.user = session.user;
      state.isAuthenticated = true;
      state.isSysAdmin = session.user?.role === ROLES.SYS_ADMIN;
    };
    builder
      .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.loading = false;
        signIn(state, { token: tokenOf(action.payload) ?? null, refreshToken: refreshTokenOf(action.payload) ?? null, user: action.payload });
      })
      .addCase(loginUser.rejected, (state, action) => { state.loading = false; state.error = action.payload ?? LOGIN_FAILED; })
      .addCase(validateOrRefreshToken.pending, (state) => { state.isInitializing = true; })
      .addCase(validateOrRefreshToken.fulfilled, (state, action) => { state.isInitializing = false; signIn(state, action.payload); })
      .addCase(validateOrRefreshToken.rejected, (state) => {
        state.isInitializing = false;
        state.token = null;
        state.refreshToken = null;
        state.user = null;
        state.isAuthenticated = false;
        state.isSysAdmin = false;
      });
  },
});

export const { logout, clearError } = slice.actions;
export default slice.reducer;
export type { AuthState };
