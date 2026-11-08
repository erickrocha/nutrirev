import { api } from './api';

type Id = number | string;

export const tenantService = {
  async getTenants() {
    const response = await api.get('/tenant');
    return response.data;
  },

  async getTenantById(id: Id) {
    const response = await api.get(`/tenant/${id}`);
    return response.data;
  },

  async getTenantByUuid(uuid: string) {
    const response = await api.get(`/tenant/uuid/${uuid}`);
    return response.data;
  },

  async createTenant(data: object) {
    const response = await api.post('/tenant', data);
    return response.data;
  },

  async updateTenant(id: Id, data: object) {
    const response = await api.put(`/tenant/${id}`, data);
    return response.data;
  },

  async addTenantPlan(id: Id, planData: object) {
    const response = await api.post(`/tenant/${id}/plan`, planData);
    return response.data;
  },

  async getTenantActivePlan(id: Id) {
    const response = await api.get(`/tenant/${id}/plan`);
    return response.data;
  },
};
