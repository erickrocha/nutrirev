import { api } from './api';

export const mealLogService = {
  async logMeal(data: object) {
    const response = await api.post('/v1/meals/log', data);
    return response.data;
  },
  async getLogsByDate(date: string) {
    const response = await api.get('/v1/meals/log', { params: { date } });
    return response.data;
  },
};
