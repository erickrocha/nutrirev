import { api } from './api';
import type {
  PayTenantSubscriptionCardPayload,
  TenantSubscriptionIntentResponse,
  TenantSubscriptionPixResponse,
  TenantSubscriptionStatus,
  TenantSubscriptionSuccess,
} from '../types/tenantSubscription';

export const tenantSubscriptionService = {
  getStatus: async (): Promise<TenantSubscriptionStatus> => {
    const response = await api.get<TenantSubscriptionStatus>('/v1/tenant-subscription/status');
    return response.data;
  },

  createPaymentIntent: async (): Promise<TenantSubscriptionIntentResponse> => {
    const response = await api.post<TenantSubscriptionIntentResponse>('/v1/tenant-subscription/intent');
    return response.data;
  },

  createPix: async (): Promise<TenantSubscriptionPixResponse> => {
    const response = await api.post<TenantSubscriptionPixResponse>('/v1/tenant-subscription/pay/pix');
    return response.data;
  },

  payCard: async (payload: PayTenantSubscriptionCardPayload): Promise<TenantSubscriptionSuccess> => {
    const response = await api.post<TenantSubscriptionSuccess>('/v1/tenant-subscription/pay/card', payload);
    return response.data;
  },

  verifyPayment: async (paymentIntentId: string): Promise<TenantSubscriptionSuccess> => {
    const response = await api.post<TenantSubscriptionSuccess>('/v1/tenant-subscription/verify', {
      paymentIntentId,
    });
    return response.data;
  },
};
