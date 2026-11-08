import { api } from './api';

type Id = number | string;

export const tenantDashboardService = {
  async getDashboard(tenantId?: Id) {
    const response = await api.get('/tenant-dashboard', {
      params: tenantId ? { tenantId } : undefined,
    });
    return response.data;
  },
};
