import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept-Language': 'pt-BR',
  },
});

// Interceptor to attach Authorization Bearer token to all restricted endpoints
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthenticated (401) responses and auto-refreshing token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/login') &&
      !originalRequest.url?.includes('/refresh')
    ) {
      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await api.post('/refresh', { refreshToken });
        const data = response.data;
        const newToken = data.accessToken || data.access_token;
        const newRefreshToken = data.refreshToken || data.refresh_token || refreshToken;

        if (newToken) {
          localStorage.setItem('token', newToken);
        }
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }
        localStorage.setItem('user', JSON.stringify(data));

        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }

    return Promise.reject(error);
  }
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
export { tenantDashboardService } from './tenantDashboardService';
export { mealLogService } from './mealLogService';
export { mealAnalysisService } from './mealAnalysisService';
export { doctorService } from './doctorService';
export { paymentService } from './paymentService';
export {
  prepareMealService,
  clinicalPlanService,
  dietaryRestrictionService,
  bowelFunctionService,
  preExistingConditionsService,
  clinicalConditionsService,
  dailyMealService,
  formulaService,
  activityFactorService,
  objectiveService,
  physicalActivityLevelService,
  customerGoalSettingService,
  paymentDateService,
  paymentChargeService,
  paymentSettingsService,
  paymentConnectionAdminService,
  customerDietaryRestrictionService,
  customerBowelFunctionService,
  customerPreExistingConditionsService,
  customerDailyMealService,
  provinceService,
  cityService,
  mealPointTierService,
} from './clinicalService';
