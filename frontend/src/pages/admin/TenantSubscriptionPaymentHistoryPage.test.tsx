import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { TenantSubscriptionPaymentHistoryPage } from './TenantSubscriptionPaymentHistoryPage';
import tenantSubscriptionReducer from '../../store/tenantSubscriptionSlice';
import authReducer from '../../store/authSlice';
import { tenantSubscriptionService } from '../../services/tenantSubscriptionService';

const mockI18n = {
  t: (key: string, fallback?: string) => fallback || key,
  i18n: { language: 'pt' },
};
vi.mock('react-i18next', () => ({ useTranslation: () => mockI18n }));

vi.mock('../../services/tenantSubscriptionService', () => ({
  tenantSubscriptionService: {
    getPayments: vi.fn().mockResolvedValue([
      {
        id: 1,
        uuid: 'uuid-1',
        tenantId: 10,
        tenantName: 'Clínica Vida',
        businessPlanId: 1,
        planName: 'Plano Pro',
        amountCents: 19900,
        formattedAmount: 'R$ 199,00',
        currency: 'BRL',
        paymentMethod: 'card',
        paymentIntentId: 'pi_test_123',
        status: 'paid',
        paidAt: '2026-11-19T10:00:00Z',
        createdAt: '2026-11-19T10:00:00Z',
      },
    ]),
  },
}));

describe('TenantSubscriptionPaymentHistoryPage', () => {
  const renderComponent = () => {
    const store = configureStore({
      reducer: {
        tenantSubscription: tenantSubscriptionReducer,
        auth: authReducer,
      },
      preloadedState: {
        auth: {
          user: { role: 'SysAdmin', name: 'Admin' },
          token: 'token',
          isAuthenticated: true,
        } as never,
      },
    });

    return render(
      <Provider store={store}>
        <MemoryRouter>
          <TenantSubscriptionPaymentHistoryPage />
        </MemoryRouter>
      </Provider>
    );
  };

  it('renderiza o cabeçalho e carrega a lista de pagamentos', async () => {
    renderComponent();

    expect(
      screen.getByRole('heading', { name: 'Pagamentos de Assinaturas' })
    ).toBeInTheDocument();
    expect(await screen.findByText('Clínica Vida')).toBeInTheDocument();
    expect(screen.getByText('Plano Pro')).toBeInTheDocument();
    expect(screen.getByText('R$ 199,00')).toBeInTheDocument();
  });

  it('permite atualizar a lista ao clicar em Atualizar', async () => {
    const user = userEvent.setup();
    renderComponent();

    const refreshBtn = screen.getByRole('button', { name: /Atualizar/i });
    await user.click(refreshBtn);

    expect(tenantSubscriptionService.getPayments).toHaveBeenCalled();
  });
});
