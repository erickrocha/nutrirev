import { api } from './api';

export const cycleService = {
  async getAll() {
    const response = await api.get('/cycle');
    return response.data;
  },
  async getById(id) {
    const response = await api.get(`/cycle/${id}`);
    return response.data;
  },
};
