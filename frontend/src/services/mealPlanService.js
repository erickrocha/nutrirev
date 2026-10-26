import { api } from './api';

export const mealPlanService = {
  async getPaginated(params = {}) {
    const response = await api.get('/meal-plan/page', { params });
    return response.data;
  },
  async getAll() {
    const response = await api.get('/meal-plan');
    return response.data;
  },
  async getById(id) {
    const response = await api.get(`/meal-plan/${id}`);
    return response.data;
  },
  async create(data) {
    const response = await api.post('/meal-plan', data);
    return response.data;
  },
  async update(id, data) {
    const response = await api.put(`/meal-plan/${id}`, data);
    return response.data;
  },
  async delete(id) {
    const response = await api.delete(`/meal-plan/${id}`);
    return response.data;
  },
  async toggleFavorite(id) {
    const response = await api.post(`/meal-plan/${id}/toggle-favorite`);
    return response.data;
  },
};
