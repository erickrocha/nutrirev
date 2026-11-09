import { api } from './api';

type Id = number | string;

export const mealPlanService = {
  async getPaginated(params: object = {}) {
    const response = await api.get('/meal-plan/page', { params });
    return response.data;
  },
  async getAll() {
    const response = await api.get('/meal-plan');
    return response.data;
  },
  async getById(id: Id) {
    const response = await api.get(`/meal-plan/${id}`);
    return response.data;
  },
  async create(data: object) {
    const response = await api.post('/meal-plan', data);
    return response.data;
  },
  async update(id: Id, data: object) {
    const response = await api.put(`/meal-plan/${id}`, data);
    return response.data;
  },
  async delete(id: Id) {
    const response = await api.delete(`/meal-plan/${id}`);
    return response.data;
  },
  async toggleFavorite(id: Id) {
    const response = await api.post(`/meal-plan/${id}/toggle-favorite`);
    return response.data;
  },
};
