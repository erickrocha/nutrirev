import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { authStorage, refreshTokenOf, tokenOf, type StoredSession } from '../utils/authStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json', 'Accept-Language': 'pt-BR' },
});

// Anexa o token de acesso a toda requisição restrita.
api.interceptors.request.use(
  (config) => {
    const token = authStorage.token();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };
interface Waiter { resolve: (token: string | null) => void; reject: (error: unknown) => void }

// Várias requisições podem receber 401 juntas: só a primeira renova o token, as outras esperam e repetem com o novo.
let isRefreshing = false;
let waiters: Waiter[] = [];

const settleWaiters = (error: unknown, token: string | null) => {
  waiters.forEach((waiter) => (error ? waiter.reject(error) : waiter.resolve(token)));
  waiters = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableRequest | undefined;
    const isAuthCall = original?.url?.includes('/login') || original?.url?.includes('/refresh');

    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      const refreshToken = authStorage.refreshToken();
      if (!refreshToken) {
        authStorage.clear();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        const token = await new Promise<string | null>((resolve, reject) => { waiters.push({ resolve, reject }); });
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }

      original._retry = true;
      isRefreshing = true;
      try {
        const response = await api.post<StoredSession>('/refresh', { refreshToken });
        const newToken = tokenOf(response.data) ?? null;
        authStorage.saveSession(response.data, refreshTokenOf(response.data) || refreshToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        original.headers.Authorization = `Bearer ${newToken}`;
        settleWaiters(null, newToken);
        return api(original);
      } catch (refreshError) {
        settleWaiters(refreshError, null);
        authStorage.clear();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 401) authStorage.clear();
    return Promise.reject(error);
  },
);

export { authService } from './authService';
export { tenantService } from './tenantService';
export { userService } from './userService';
export { customerService } from './customerService';
export { eatService } from './eatService';
export { mealPlanService } from './mealPlanService';
export { ingredientService } from './ingredientService';
export { cycleService } from './cycleService';
export { dashboardService } from './dashboardService';
export { mealLogService } from './mealLogService';
export { mealAnalysisService } from './mealAnalysisService';
export { doctorService } from './doctorService';
export { paymentService } from './paymentService';
export * from './clinicalService';
