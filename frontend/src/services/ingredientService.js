import { api } from './api';

export const ingredientService = {
  async getAll() {
    const response = await api.get('/ingredient');
    return response.data;
  },
  async getById(id) {
    const response = await api.get(`/ingredient/${id}`);
    return response.data;
  },
  async create(data) {
    const response = await api.post('/ingredient', data);
    return response.data;
  },
  async update(id, data) {
    const response = await api.put(`/ingredient/${id}`, data);
    return response.data;
  },
  async delete(id) {
    const response = await api.delete(`/ingredient/${id}`);
    return response.data;
  },
  async importCsv(file, tenantId) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/ingredient/import', formData, {
      params: tenantId ? { tenantId } : undefined,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
