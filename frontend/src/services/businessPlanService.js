import { api } from './api';

export const businessPlanService = {
  async getPlans(filters = {}) {
    const response = await api.get('/business-plan', { params: filters });
    return response.data;
  },

  async getPlan(id) {
    const response = await api.get(`/business-plan/${id}`);
    return response.data;
  },

  async createPlan(data) {
    const response = await api.post('/business-plan', data);
    return response.data;
  },

  async updatePlan(id, data) {
    const response = await api.put(`/business-plan/${id}`, data);
    return response.data;
  },

  async deletePlan(id) {
    await api.delete(`/business-plan/${id}`);
  },
};
