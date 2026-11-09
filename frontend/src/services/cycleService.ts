import { api } from './api';

type Id = number | string;

export const cycleService = {
  async getAll() {
    const response = await api.get('/cycle');
    return response.data;
  },
  async getById(id: Id) {
    const response = await api.get(`/cycle/${id}`);
    return response.data;
  },
};
