import { api } from './api';

type Id = number | string;

export const doctorService = {
  getAll: async () => {
    const response = await api.get('/doctor');
    return response.data;
  },

  getById: async (id: Id) => {
    const response = await api.get(`/doctor/${id}`);
    return response.data;
  },

  getByUuid: async (uuid: string) => {
    const response = await api.get(`/doctor/uuid/${uuid}`);
    return response.data;
  },

  create: async (data: object) => {
    const response = await api.post('/doctor', data);
    return response.data;
  },

  update: async (id: Id, data: object) => {
    const response = await api.put(`/doctor/${id}`, data);
    return response.data;
  },

  delete: async (id: Id) => {
    const response = await api.delete(`/doctor/${id}`);
    return response.data;
  },
};
