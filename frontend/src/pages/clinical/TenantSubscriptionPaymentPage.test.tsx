import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { TenantSubscriptionPaymentPage } from './TenantSubscriptionPaymentPage';
import tenantSubscriptionReducer from '../../store/tenantSubscriptionSlice';
import authReducer from '../../store/authSlice';
import type { TenantSubscriptionStatus } from '../../types/tenantSubscription';

const mockI18n = { t: (key: string, fallback?: string) => fallback || key };
vi.mock('react-i18next', () => ({ useTranslation: () => mockI18n }));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div data-testid="stripe-elements">{children}</div>,
  PaymentElement: () => <div data-testid="stripe-payment-element">Stripe Payment Element</div>,
  useStripe: () => ({ confirmPayment: vi.fn() }),
  useElements: () => ({}),
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../services/tenantSubscriptionService', () => ({
  tenantSubscriptionService: {
    getStatus: vi.fn().mockResolvedValue({
      status: 'blocked',
      daysOverdue: 6,
      paymentDate: '2026-11-10',
      gracePeriodDays: 5,
      planName: 'Plano Premium',
      amountCents: 19900,
      formattedAmount: 'R$ 199,00',
      businessPlanId: 1,
      publishableKey: 'pk_test_123',
    }),
    createPix: vi.fn().mockResolvedValue({
      paymentIntentId: 'pi_test_1',
      payload: '00020126580014br.gov.bcb.pix0136test-payload',
      encodedImage: null,
      expiresAt: null,
      amountCents: 19900,
    }),
    payWithCard: vi.fn().mockResolvedValue({
      paymentIntentId: 'pi_test_card',
      status: 'paid',
      amountCents: 19900,
    }),
    verifyPayment: vi.fn().mockResolvedValue({
      status: 'paid',
      message: 'Pagamento confirmado com sucesso!',
      paidAt: '2026-11-19T00:00:00Z',
    }),
    createPaymentIntent: vi.fn().mockResolvedValue({
      clientSecret: 'pi_test_secret_123',
      paymentIntentId: 'pi_test_123',
      publishableKey: 'pk_test_123',
      amountCents: 19900,
    }),
  },
}));

const renderPage = (initialStatus?: Partial<TenantSubscriptionStatus>) => {
  const store = configureStore({
    reducer: {
      tenantSubscription: tenantSubscriptionReducer,
      auth: authReducer,
    },
    preloadedState: {
      tenantSubscription: {
        status: initialStatus
          ? ({
              status: 'blocked',
              daysOverdue: 6,
              paymentDate: '2026-11-10',
              gracePeriodDays: 5,
              planName: 'Plano Premium',
              amountCents: 19900,
              formattedAmount: 'R$ 199,00',
              businessPlanId: 1,
              ...initialStatus,
            } as TenantSubscriptionStatus)
          : null,
        loading: false,
        pixLoading: false,
        cardSubmitting: false,
        pix: {
          paymentIntentId: 'pi_test_1',
          payload: '00020126580014br.gov.bcb.pix0136test-payload',
          encodedImage: null,
          expiresAt: null,
          amountCents: 19900,
        },
        error: null,
        lastSuccess: null,
      },
      auth: {
        token: 'token',
        refreshToken: null,
        user: { name: 'Dr. Silva', role: 'TenantOwner' },
        isAuthenticated: true,
        isInitializing: false,
        isSysAdmin: false,
        loading: false,
        error: null,
      },
    } as never,
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <TenantSubscriptionPaymentPage />
      </MemoryRouter>
    </Provider>
  );
};

describe('TenantSubscriptionPaymentPage', () => {
  it('mostra o banner de bloqueio quando a assinatura estiver com status blocked', () => {
    renderPage({ status: 'blocked', daysOverdue: 7 });
    expect(
      screen.getByText('Acesso Bloqueado por Pendência Financeira')
    ).toBeInTheDocument();
    expect(screen.getByText('Plano Premium')).toBeInTheDocument();
    expect(screen.getByText('R$ 199,00')).toBeInTheDocument();
    expect(screen.getByText('7 dias')).toBeInTheDocument();
  });

  it('mostra o banner de aviso quando estiver com status warning', () => {
    renderPage({ status: 'warning', daysOverdue: 3 });
    expect(
      screen.getByText('Assinatura Pendente de Regularização')
    ).toBeInTheDocument();
  });

  it('mostra estado de em dia quando o status for ok', () => {
    renderPage({ status: 'ok', daysOverdue: 0 });
    expect(screen.getByText('Assinatura em Dia!')).toBeInTheDocument();
    expect(screen.getByText('Ir para o Painel')).toBeInTheDocument();
  });

  it('permite alternar entre as abas Pix e Cartão de Crédito', async () => {
    renderPage({ status: 'blocked' });
    const user = userEvent.setup();

    // Default tab is Pix with the payload displayed in input
    expect(
      screen.getByDisplayValue('00020126580014br.gov.bcb.pix0136test-payload')
    ).toBeInTheDocument();

    // Switch to Card
    const cardTab = screen.getByRole('button', { name: /Cartão de Crédito/i });
    await user.click(cardTab);

    expect(await screen.findByTestId('stripe-elements')).toBeInTheDocument();
    expect(screen.getByTestId('stripe-payment-element')).toBeInTheDocument();
  });

  it('valida dados do cartão no formulário fallback quando o intent não estiver disponível', async () => {
    const { tenantSubscriptionService } = await import('../../services/tenantSubscriptionService');
    vi.mocked(tenantSubscriptionService.createPaymentIntent).mockRejectedValueOnce(
      new Error('unavailable')
    );

    renderPage({ status: 'blocked' });
    const user = userEvent.setup();

    const cardTab = screen.getByRole('button', { name: /Cartão de Crédito/i });
    await user.click(cardTab);

    // Provide invalid cardholder name in fallback form
    const formInput = await screen.findByPlaceholderText('EX: MARIA S SILVA');
    const form = formInput.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Informe o nome impresso no cartão')).toBeInTheDocument();
    });
  });

  it('renderiza o Stripe Payment Element oficial quando o intent estiver disponível', async () => {
    const user = userEvent.setup();
    const store = configureStore({
      reducer: {
        tenantSubscription: tenantSubscriptionReducer,
        auth: authReducer,
      },
      preloadedState: {
        tenantSubscription: {
          status: {
            status: 'blocked',
            daysOverdue: 6,
            paymentDate: '2026-11-10',
            gracePeriodDays: 5,
            planName: 'Plano Premium',
            amountCents: 19900,
            formattedAmount: 'R$ 199,00',
            businessPlanId: 1,
            publishableKey: 'pk_test_123',
          },
          loading: false,
          pixLoading: false,
          cardSubmitting: false,
          intentLoading: false,
          paymentIntent: {
            clientSecret: 'pi_test_secret_123',
            paymentIntentId: 'pi_test',
            publishableKey: 'pk_test_123',
            amountCents: 19900,
            formattedAmount: 'R$ 199,00',
          },
          pix: null,
          error: null,
          lastSuccess: null,
        },
        auth: {
          token: 'token',
          refreshToken: null,
          user: { name: 'Dr. Silva', role: 'TenantOwner' },
          isAuthenticated: true,
          isInitializing: false,
          isSysAdmin: false,
          loading: false,
          error: null,
        },
      } as never,
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <TenantSubscriptionPaymentPage />
        </MemoryRouter>
      </Provider>
    );

    const cardTab = screen.getByRole('button', { name: /Cartão de Crédito/i });
    await user.click(cardTab);

    expect(screen.getByTestId('stripe-payment-element')).toBeInTheDocument();
  });
});
