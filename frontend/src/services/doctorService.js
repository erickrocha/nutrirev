import { api } from './api';

export const doctorService = {
  getAll: async () => {
    const response = await api.get('/doctor');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/doctor/${id}`);
    return response.data;
  },

  getByUuid: async (uuid) => {
    const response = await api.get(`/doctor/uuid/${uuid}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/doctor', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/doctor/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/doctor/${id}`);
    return response.data;
  },
};
