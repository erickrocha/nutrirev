import { api } from './api';

export const tenantService = {
  async getTenants() {
    const response = await api.get('/tenant');
    return response.data;
  },

  async getTenantById(id) {
    const response = await api.get(`/tenant/${id}`);
    return response.data;
  },

  async getTenantByUuid(uuid) {
    const response = await api.get(`/tenant/uuid/${uuid}`);
    return response.data;
  },

  async createTenant(data) {
    const response = await api.post('/tenant', data);
    return response.data;
  },

  async updateTenant(id, data) {
    const response = await api.put(`/tenant/${id}`, data);
    return response.data;
  },

  async addTenantPlan(id, planData) {
    const response = await api.post(`/tenant/${id}/plan`, planData);
    return response.data;
  },

  async getTenantActivePlan(id) {
    const response = await api.get(`/tenant/${id}/plan`);
    return response.data;
  },
};
