import { api } from './api';
import type { CreatePlanOrderPayload, PlanOrder, Province, PublicPlan } from '../types/planOrder';

export const planOrderService = {
  // Públicos (tela de contratação)
  async getPublicPlan(uuid: string): Promise<PublicPlan> {
    const response = await api.get(`/public/business-plans/${uuid}`);
    return response.data;
  },

  async getProvinces(): Promise<Province[]> {
    const response = await api.get('/province', { params: { countryCode: 'BR' } });
    return response.data;
  },

  async createOrder(data: CreatePlanOrderPayload): Promise<{ uuid: string }> {
    const response = await api.post('/public/orders', data);
    return response.data;
  },

  // SysAdmin
  async getOrder(uuid: string): Promise<PlanOrder> {
    const response = await api.get(`/plan-order/${uuid}`);
    return response.data;
  },

  async getOrders(): Promise<PlanOrder[]> {
    const response = await api.get('/plan-order');
    return response.data;
  },

  async convertOrder(uuid: string, paymentDate: string): Promise<void> {
    await api.post(`/plan-order/${uuid}/convert`, { paymentDate });
  },

  async cancelOrder(uuid: string): Promise<void> {
    await api.post(`/plan-order/${uuid}/cancel`);
  },
};
