import { api } from './api';

export const tenantDashboardService = {
  async getDashboard(tenantId) {
    const response = await api.get('/tenant-dashboard', {
      params: tenantId ? { tenantId } : undefined,
    });
    return response.data;
  },
};
