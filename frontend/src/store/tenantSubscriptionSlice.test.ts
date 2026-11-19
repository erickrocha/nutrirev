import reducer, {
  setSubscriptionStatus,
  clearSubscriptionError,
  resetSubscriptionPix,
  fetchTenantSubscriptionStatus,
  createTenantSubscriptionPix,
  createTenantSubscriptionIntent,
  payTenantSubscriptionCard,
} from './tenantSubscriptionSlice';
import type { TenantSubscriptionStatus } from '../types/tenantSubscription';

describe('tenantSubscriptionSlice', () => {
  const initial = {
    status: null,
    loading: false,
    pixLoading: false,
    cardSubmitting: false,
    intentLoading: false,
    paymentIntent: null,
    pix: null,
    error: null,
    lastSuccess: null,
  };

  it('guarda o status da assinatura via setSubscriptionStatus', () => {
    const mockStatus: TenantSubscriptionStatus = {
      status: 'blocked',
      daysOverdue: 7,
      paymentDate: '2026-11-10',
      gracePeriodDays: 5,
      planName: 'Pro',
      amountCents: 19900,
      formattedAmount: 'R$ 199,00',
      businessPlanId: 1,
    };
    const next = reducer(initial, setSubscriptionStatus(mockStatus));
    expect(next.status).toEqual(mockStatus);
  });

  it('limpa erro via clearSubscriptionError', () => {
    const state = { ...initial, error: 'Erro de conexão' };
    const next = reducer(state, clearSubscriptionError());
    expect(next.error).toBeNull();
  });

  it('reseta dados de pix via resetSubscriptionPix', () => {
    const state = {
      ...initial,
      pix: {
        paymentIntentId: 'pi_123',
        payload: '000201...',
        encodedImage: null,
        expiresAt: null,
        amountCents: 19900,
      },
    };
    const next = reducer(state, resetSubscriptionPix());
    expect(next.pix).toBeNull();
  });

  it('atualiza status ao completar fetchTenantSubscriptionStatus.fulfilled', () => {
    const mockStatus: TenantSubscriptionStatus = {
      status: 'warning',
      daysOverdue: 2,
      paymentDate: '2026-11-16',
      gracePeriodDays: 5,
      planName: 'Basic',
      amountCents: 9900,
      formattedAmount: 'R$ 99,00',
      businessPlanId: 2,
    };
    const next = reducer(initial, {
      type: fetchTenantSubscriptionStatus.fulfilled.type,
      payload: mockStatus,
    });
    expect(next.status).toEqual(mockStatus);
    expect(next.loading).toBe(false);
  });

  it('atualiza pix ao completar createTenantSubscriptionPix.fulfilled', () => {
    const mockPix = {
      paymentIntentId: 'pi_pix_1',
      payload: 'payload_pix_code',
      encodedImage: 'base64img',
      expiresAt: '2026-11-18T20:00:00Z',
      amountCents: 15000,
    };
    const next = reducer(initial, {
      type: createTenantSubscriptionPix.fulfilled.type,
      payload: mockPix,
    });
    expect(next.pix).toEqual(mockPix);
    expect(next.pixLoading).toBe(false);
  });

  it('atualiza paymentIntent ao completar createTenantSubscriptionIntent.fulfilled', () => {
    const mockIntent = {
      clientSecret: 'pi_test_secret_123',
      paymentIntentId: 'pi_test_123',
      publishableKey: 'pk_test_123',
      amountCents: 19900,
      formattedAmount: 'R$ 199,00',
    };
    const next = reducer(initial, {
      type: createTenantSubscriptionIntent.fulfilled.type,
      payload: mockIntent,
    });
    expect(next.paymentIntent).toEqual(mockIntent);
    expect(next.intentLoading).toBe(false);
  });

  it('atualiza status para ok ao aprovar pagamento via payTenantSubscriptionCard.fulfilled', () => {
    const stateWithBlocked = {
      ...initial,
      status: {
        status: 'blocked' as const,
        daysOverdue: 8,
        paymentDate: '2026-11-09',
        gracePeriodDays: 5,
        planName: 'Enterprise',
        amountCents: 29900,
        formattedAmount: 'R$ 299,00',
        businessPlanId: 3,
      },
    };
    const successPayload = {
      success: true,
      message: 'Pagamento aprovado!',
      newPaymentDate: '2026-12-09',
    };
    const next = reducer(stateWithBlocked, {
      type: payTenantSubscriptionCard.fulfilled.type,
      payload: successPayload,
    });
    expect(next.status?.status).toBe('ok');
    expect(next.status?.daysOverdue).toBe(0);
    expect(next.status?.paymentDate).toBe('2026-12-09');
    expect(next.lastSuccess).toEqual(successPayload);
    expect(next.cardSubmitting).toBe(false);
  });
});
