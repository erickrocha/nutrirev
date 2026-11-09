import { api } from './api';

type Id = number | string;

export const businessPlanService = {
  async getPlans(filters: object = {}) {
    const response = await api.get('/business-plan', { params: filters });
    return response.data;
  },

  async getPlan(id: Id) {
    const response = await api.get(`/business-plan/${id}`);
    return response.data;
  },

  async createPlan(data: object) {
    const response = await api.post('/business-plan', data);
    return response.data;
  },

  async updatePlan(id: Id, data: object) {
    const response = await api.put(`/business-plan/${id}`, data);
    return response.data;
  },

  async deletePlan(id: Id) {
    await api.delete(`/business-plan/${id}`);
  },
};
