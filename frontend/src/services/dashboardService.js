import { api } from './api';

export const dashboardService = {
  async getSummary() {
    const response = await api.get('/v1/meals/summary');
    return response.data; // { calories_consumed, meals_logged }
  },
  async getPoints() {
    const response = await api.get('/v1/points/me');
    return response.data; // { total_points }
  },
};
