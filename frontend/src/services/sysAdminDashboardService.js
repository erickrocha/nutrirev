import { api } from './api';

export const sysAdminDashboardService = {
  async getDashboard() {
    const response = await api.get('/sysadmin-dashboard');
    return response.data;
  },
};
