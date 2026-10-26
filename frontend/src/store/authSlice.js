import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../services/api';
import { fetchTenantById } from './tenantSlice';
import { isTokenExpired } from '../utils/jwt';
import { ROLES } from '../utils/enums';

const clearStoredAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue, dispatch }) => {
    try {
      const data = await authService.login(email, password);
      const token = data.accessToken || data.access_token;
      const refreshToken = data.refreshToken || data.refresh_token;

      if (token) {
        localStorage.setItem('token', token);
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(data));

      const tenantId = data.tenantId || data.tenant_id;
      if (tenantId) {
        dispatch(fetchTenantById(tenantId));
      }
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Email ou senha inválidos. Por favor, tente novamente.');
    }
  }
);

export const validateOrRefreshToken = createAsyncThunk(
  'auth/validateOrRefreshToken',
  async (_, { rejectWithValue, dispatch }) => {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

    // 1. Validate Access Token
    if (token && !isTokenExpired(token)) {
      if (storedUser) {
        const tenantId = storedUser.tenantId || storedUser.tenant_id;
        if (tenantId) {
          dispatch(fetchTenantById(tenantId));
        }
      }
      return {
        token,
        refreshToken,
        user: storedUser,
      };
    }

    // 2. If Access Token is missing or expired, attempt refresh with Refresh Token
    if (refreshToken && !isTokenExpired(refreshToken)) {
      try {
        const data = await authService.refreshToken(refreshToken);
        const newToken = data.accessToken || data.access_token;
        const newRefreshToken = data.refreshToken || data.refresh_token || refreshToken;

        if (newToken) {
          localStorage.setItem('token', newToken);
        }
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }
        localStorage.setItem('user', JSON.stringify(data));

        const tenantId = data.tenantId || data.tenant_id;
        if (tenantId) {
          dispatch(fetchTenantById(tenantId));
        }

        return {
          token: newToken,
          refreshToken: newRefreshToken,
          user: data,
        };
      } catch (error) {
        console.error('Refresh token validation failed:', error);
        clearStoredAuth();
        return rejectWithValue('Refresh token expired or invalid');
      }
    }

    // 3. Both tokens are expired or missing -> redirect to login
    clearStoredAuth();
    return rejectWithValue('No valid session or token expired');
  }
);

const initialToken = localStorage.getItem('token') || null;
const initialRefreshToken = localStorage.getItem('refreshToken') || null;
const initialUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: initialToken,
    refreshToken: initialRefreshToken,
    user: initialUser,
    isAuthenticated: false,
    isInitializing: true,
    isSysAdmin: initialUser?.role === ROLES.SYS_ADMIN,
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
      state.isSysAdmin = false;
      state.isInitializing = false;
      clearStoredAuth();
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login User cases
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        const token = action.payload.accessToken || action.payload.access_token;
        const refreshToken = action.payload.refreshToken || action.payload.refresh_token || null;
        state.loading = false;
        state.token = token;
        state.refreshToken = refreshToken;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isSysAdmin = action.payload.role === ROLES.SYS_ADMIN;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Validate or Refresh Token cases
      .addCase(validateOrRefreshToken.pending, (state) => {
        state.isInitializing = true;
      })
      .addCase(validateOrRefreshToken.fulfilled, (state, action) => {
        state.isInitializing = false;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isSysAdmin = action.payload.user?.role === ROLES.SYS_ADMIN;
      })
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

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
